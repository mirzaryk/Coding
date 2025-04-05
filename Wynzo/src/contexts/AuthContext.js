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
  updateDoc,
  serverTimestamp 
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

  async function signup(email, password, name, phone) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        name,
        phone,
        role: 'user',
        balance: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Account created successfully!');
      return userCredential;
    } catch (error) {
      toast.error(error.message);
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
      toast.error(error.message);
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
        const defaultUserData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || '',
          phone: '',
          role: 'user',
          balance: 0,
          status: 'active',
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
        balance: 0,
        role: 'user'
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
    isAdmin: userRole === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
