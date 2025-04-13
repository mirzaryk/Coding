import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs, 
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to check if a username is available (not already taken)
  async function checkUsernameAvailability(username) {
    if (!username) return false;
    
    try {
      // First check usernames collection (more efficient lookup)
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      const usernameDoc = await getDoc(usernameRef);
      
      if (usernameDoc.exists()) {
        console.log(`Username '${username}' already exists in usernames collection`);
        return false; // Username already exists
      }
      
      // Success - the username is available
      console.log(`Username '${username}' is available`);
      return true;
      
    } catch (error) {
      // Handle any errors accessing the usernames collection
      console.error("Error checking username availability:", error);
      
      // If there's a permission error, we'll assume the username is available
      // The server-side rules will do the final verification during signup
      if (error.code === 'permission-denied') {
        console.warn("Permission denied when checking username. Will verify during signup.");
        return true; // Optimistically allow continuing with signup
      }
      
      // For any other errors, still continue but log a warning
      console.warn("Error during username check, proceeding with signup anyway");
      return true;
    }
  }

  // Generate a unique referral code for a user
  function generateReferralCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async function signup(email, password, name, phone, username, referralCode = null) {
    try {
      // Final username availability check
      if (username) {
        try {
          const isAvailable = await checkUsernameAvailability(username);
          if (!isAvailable) {
            throw new Error('username-already-exists');
          }
        } catch (error) {
          if (error.message === 'username-already-exists') {
            throw error;
          }
          // If it's a different error, we'll continue and let the server validate
          console.warn("Username availability check failed, continuing with signup:", error);
        }
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // Generate unique referral code for new user
      const uniqueReferralCode = generateReferralCode();
      
      // Create user document in Firestore - include referredBy if referral code provided
      const userData = {
        uid: userCredential.user.uid,
        email,
        name,
        phone,
        username: username ? username.toLowerCase() : null,
        role: 'user',
        balance: 0,
        status: 'active',
        referralCode: uniqueReferralCode,
        referralCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Store the referral code in the user document if provided
      if (referralCode) {
        userData.referredBy = referralCode;
      }
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      // Create entry in referralCodes collection
      try {
        await setDoc(doc(collection(db, 'referralCodes')), {
          code: uniqueReferralCode,
          userId: userCredential.user.uid,
          createdAt: serverTimestamp()
        });
        console.log("Referral code registered in referralCodes collection");
      } catch (error) {
        console.error("Error creating referral code entry:", error);
        // Continue anyway - the user document has the referralCode
      }
      
      // Reserve the username in a separate collection for faster lookups
      if (username) {
        try {
          await setDoc(doc(db, 'usernames', username.toLowerCase()), {
            uid: userCredential.user.uid,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Error reserving username:", error);
          // If we couldn't reserve the username, we'll proceed anyway
          // The user document already has the username field
        }
      }
      
      // Process referral if code provided
      if (referralCode) {
        try {
          // First try to find referrer via referralCodes collection (more efficient)
          const referralCodeQuery = query(
            collection(db, 'referralCodes'),
            where('code', '==', referralCode)
          );
          
          const referralCodeSnapshot = await getDocs(referralCodeQuery);
          let referrerId = null;
          
          if (!referralCodeSnapshot.empty) {
            referrerId = referralCodeSnapshot.docs[0].data().userId;
          } else {
            // Fallback to querying users collection
            const referrersQuery = query(
              collection(db, 'users'),
              where('referralCode', '==', referralCode)
            );
            
            const referrerSnapshot = await getDocs(referrersQuery);
            
            if (!referrerSnapshot.empty) {
              referrerId = referrerSnapshot.docs[0].id;
            }
          }
          
          if (referrerId) {
            try {
              // Try to create referral relationship document
              await setDoc(doc(collection(db, 'referrals')), {
                referrerId: referrerId,
                referredId: userCredential.user.uid,
                referredName: name,
                referredEmail: email,
                status: 'active',
                createdAt: serverTimestamp()
              });
              
              console.log("Referral relationship created successfully");
            } catch (relationError) {
              console.error("Error creating referral relationship:", relationError);
              // Even if this fails, we already stored the referredBy code in the user document
            }
            
            try {
              // Try to create referral count update document
              await setDoc(doc(collection(db, 'referralCountUpdates')), {
                referrerId: referrerId,
                referredId: userCredential.user.uid,
                processed: false,
                createdAt: serverTimestamp()
              });
              
              console.log("Referral count update created successfully");
            } catch (updateError) {
              console.error("Error creating referral count update:", updateError);
              // This is okay, an admin can manually update the count later
            }
          } else {
            console.log("Invalid referral code provided:", referralCode);
          }
        } catch (error) {
          console.error("Error processing referral:", error);
          // We still want the user to be created even if referral processing fails
          // The referredBy code is stored in the user document for future processing
        }
      }
      
      toast.success('Account created successfully!');
      return userCredential;
    } catch (error) {
      // Customize error messages
      if (error.message === 'username-already-exists') {
        toast.error('Username is already taken');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email address is already in use');
      } else {
        toast.error(error.message);
      }
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully!');
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }

  async function updateUserProfile(userData) {
    try {
      // Check if username is being changed
      if (userData.username) {
        const oldUserData = await fetchUserData(currentUser);
        const oldUsername = oldUserData.username;
        const newUsername = userData.username.toLowerCase();
        
        // Only check for uniqueness if username is actually changing
        if (oldUsername !== newUsername) {
          try {
            const isAvailable = await checkUsernameAvailability(newUsername);
            if (!isAvailable) {
              toast.error('Username is already taken');
              throw new Error('username-already-exists');
            }
            
            // Delete old username document
            if (oldUsername) {
              try {
                const oldUsernameRef = doc(db, 'usernames', oldUsername);
                await deleteDoc(oldUsernameRef);
              } catch (error) {
                console.error("Error removing old username:", error);
                // Continue anyway - the new username is more important
              }
            }
            
            // Create new username document
            try {
              await setDoc(doc(db, 'usernames', newUsername), {
                uid: currentUser.uid,
                createdAt: serverTimestamp()
              });
            } catch (error) {
              console.error("Error creating new username document:", error);
              // Continue anyway - the user document will have the username
            }
            
            // Ensure username is lowercase
            userData.username = newUsername;
          } catch (error) {
            if (error.message === 'username-already-exists') {
              throw error;
            }
            // For other errors during username check, proceed with the update
            console.warn("Username availability check failed, continuing with profile update:", error);
          }
        }
      }
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      
      if (userData.name) {
        await updateProfile(auth.currentUser, { displayName: userData.name });
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      if (error.message === 'username-already-exists') {
        // Already displayed a toast
      } else {
        toast.error(error.message);
      }
      throw error;
    }
  }

  async function fetchUserData(user) {
    if (!user) return null;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserRole(userData.role);
        return userData;
      } else {
        // If user document doesn't exist yet, create a default one
        const uniqueReferralCode = generateReferralCode();
        const defaultUserData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || '',
          phone: '',
          username: null,
          role: 'user',
          balance: 0,
          status: 'active',
          referralCode: uniqueReferralCode,
          referralCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Create user document
        await setDoc(doc(db, 'users', user.uid), defaultUserData);
        console.log("Created new user document");
        setUserRole('user');
        return defaultUserData;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Return a default object to prevent null reference errors
      return {
        name: user.displayName || '',
        email: user.email || '',
        phone: '',
        username: null,
        balance: 0,
        role: 'user'
      };
    }
  }

  // Get list of users referred by the current user
  async function getUserReferrals(uid) {
    try {
      const referralsQuery = query(
        collection(db, 'referrals'),
        where('referrerId', '==', uid)
      );
      
      const referralsSnapshot = await getDocs(referralsQuery);
      
      if (referralsSnapshot.empty) {
        return [];
      }
      
      // Map the documents to a more usable format
      return referralsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt // Keep createdAt as Firestore timestamp
      }));
    } catch (error) {
      console.error("Error fetching user referrals:", error);
      toast.error("Failed to load referrals");
      return [];
    }
  }

  // Update a user's referral code
  async function updateReferralCode(uid, newCode = null) {
    try {
      // Generate a new code if one wasn't provided
      const referralCode = newCode || generateReferralCode();
      
      // Update code in user document
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        referralCode,
        updatedAt: serverTimestamp()
      });
      
      // Update or create entry in referralCodes collection
      try {
        // First try to find existing entry for this user
        const referralCodeQuery = query(
          collection(db, 'referralCodes'),
          where('userId', '==', uid)
        );
        
        const existingCodes = await getDocs(referralCodeQuery);
        
        if (!existingCodes.empty) {
          // Update the existing entry
          const codeDoc = existingCodes.docs[0];
          await updateDoc(doc(db, 'referralCodes', codeDoc.id), {
            code: referralCode,
            updatedAt: serverTimestamp()
          });
        } else {
          // Create a new entry
          await setDoc(doc(collection(db, 'referralCodes')), {
            code: referralCode,
            userId: uid,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Error updating referralCodes collection:", error);
        // Continue anyway since the user document was updated
      }
      
      toast.success('Referral code updated successfully');
      return referralCode;
    } catch (error) {
      console.error("Error updating referral code:", error);
      toast.error('Failed to update referral code');
      throw error;
    }
  }

  // Validate a referral code
  async function validateReferralCode(code) {
    if (!code) return { valid: false, referrer: null };
    
    try {
      // First check against the dedicated referralCodes collection
      const codeQuery = query(
        collection(db, 'referralCodes'),
        where('code', '==', code)
      );
      
      const codeSnapshot = await getDocs(codeQuery);
      
      if (!codeSnapshot.empty) {
        // Code exists in dedicated collection
        const userId = codeSnapshot.docs[0].data().userId;
        
        try {
          // Get the user info to return
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            return {
              valid: true,
              referrer: {
                name: userData.name || 'someone',
                uid: userId
              }
            };
          }
        } catch (userError) {
          console.error("Error fetching referrer data:", userError);
        }
        
        // If we couldn't get the user data, still return valid
        return {
          valid: true,
          referrer: {
            name: 'someone',
            uid: userId
          }
        };
      }
      
      // If not found, fall back to the format validation for graceful handling
      const isValidFormat = /^[A-Z0-9]{8}$/.test(code);
      
      if (isValidFormat) {
        return { 
          valid: true, 
          referrer: {
            name: "someone",
            uid: null
          },
          permissionSafe: true
        };
      } else {
        return { valid: false, referrer: null };
      }
      
    } catch (error) {
      console.error("Error validating referral code:", error);
      
      // Format validation as fallback
      const isValidFormat = /^[A-Z0-9]{8}$/.test(code);
      if (isValidFormat) {
        return {
          valid: true,
          referrer: {
            name: "someone",
            uid: null
          },
          permissionSafe: true,
          message: "We'll validate your referral code when you sign up."
        };
      }
      
      return { 
        valid: null, 
        referrer: null, 
        permissionError: true,
        message: "We'll validate your referral code when you sign up."
      };
    }
  }

  // Publicly validate a referral code (no auth required)
  async function publicValidateReferralCode(code) {
    if (!code) return { valid: false, referrer: null };
    
    // First perform basic format validation - this works offline
    const isValidFormat = /^[A-Z0-9]{8}$/.test(code);
    if (!isValidFormat) {
      return { valid: false, referrer: null, message: "Invalid code format" };
    }
    
    try {
      // First check against the dedicated referralCodes collection
      const codeQuery = query(
        collection(db, 'referralCodes'),
        where('code', '==', code)
      );
      
      const codeSnapshot = await getDocs(codeQuery);
      
      if (!codeSnapshot.empty) {
        // Code exists in dedicated collection
        const userId = codeSnapshot.docs[0].data().userId;
        
        try {
          // Get the user info to return
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            
            return {
              valid: true,
              referrer: {
                name: userData.name || 'someone',
                uid: userId,
                username: userData.username || null
              },
              verified: true
            };
          }
        } catch (userError) {
          console.error("Error fetching referrer data:", userError);
        }
        
        // If we couldn't get the user data, still return valid
        return {
          valid: true,
          referrer: {
            name: 'someone',
            uid: userId
          },
          verified: true
        };
      }
      
      // If not found, try to query users collection directly
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', code)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          const userId = usersSnapshot.docs[0].id;
          
          return {
            valid: true,
            referrer: {
              name: userData.name || 'someone',
              uid: userId,
              username: userData.username || null
            },
            verified: true
          };
        }
      } catch (usersError) {
        console.error("Error looking up referral code in users collection:", usersError);
      }
      
      // If code wasn't found but format is valid
      return { 
        valid: false,
        message: "Referral code not found",
        formatValid: true
      };
      
    } catch (error) {
      console.error("Error validating referral code:", error);
      
      // For permission errors, we can only validate format
      if (error.code === 'permission-denied') {
        return {
          valid: null,
          message: "We'll validate this code when you sign up",
          formatValid: isValidFormat,
          permissionError: true
        };
      }
      
      return { 
        valid: null, 
        formatValid: isValidFormat,
        message: "Error checking referral code"
      };
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    updateUserProfile,
    fetchUserData,
    checkUsernameAvailability,
    isAdmin: userRole === 'admin',
    getUserReferrals,
    generateReferralCode,
    updateReferralCode,
    validateReferralCode,
    publicValidateReferralCode // Add the new function to the context value
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
