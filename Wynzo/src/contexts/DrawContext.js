import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

const DrawContext = createContext();

export function useDraw() {
  return useContext(DrawContext);
}

export function DrawProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentDraw, setCurrentDraw] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the current active draw when component mounts
    const fetchCurrentDraw = async () => {
      try {
        const q = query(
          collection(db, 'draws'),
          where('status', '==', 'active'),
          orderBy('drawTime', 'asc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const drawData = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
          };
          setCurrentDraw(drawData);
        } else {
          // No active draw found
          setCurrentDraw(null);
        }
      } catch (error) {
        console.error("Error fetching current draw:", error);
        // Silent fail for network errors to avoid spamming the user
        if (!error.message.includes('Failed to get') && 
            !error.message.includes('network') &&
            !error.message.includes('offline')) {
          toast.error("Failed to load current draw");
        }
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCurrentDraw();
    
    // Set up a timer to check for new draws every minute with backoff on errors
    let retryCount = 0;
    let retryDelay = 60000; // Start with 1 minute
    
    const interval = setInterval(() => {
      fetchCurrentDraw()
        .then(() => {
          // Reset retry parameters on success
          retryCount = 0;
          retryDelay = 60000;
        })
        .catch(err => {
          console.error("Error in scheduled draw fetch:", err);
          retryCount++;
          
          // Increase delay with each failed attempt (up to 5 minutes)
          if (retryCount > 3) {
            clearInterval(interval);
            retryDelay = Math.min(300000, retryDelay * 2);
            setTimeout(() => {
              interval = setInterval(fetchCurrentDraw, retryDelay);
            }, retryDelay);
          }
        });
    }, retryDelay);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if active draw has passed its end time and should be auto-closed
    const checkDrawEndTime = async () => {
      try {
        if (currentDraw && currentDraw.status === 'active' && currentDraw.autoClosingEnabled) {
          const now = new Date();
          const endTime = currentDraw.endTime ? 
            new Date(currentDraw.endTime.seconds * 1000) : null;
          
          if (endTime && now > endTime) {
            console.log(`Draw ${currentDraw.id} has reached its end time and will be auto-closed`);
            
            // Update draw status to 'closing'
            const drawRef = doc(db, 'draws', currentDraw.id);
            await updateDoc(drawRef, {
              status: 'closing',
              updatedAt: serverTimestamp()
            });
            
            // Select winners
            await selectDrawWinners(currentDraw.id);
          }
        }
      } catch (error) {
        console.error("Error checking draw end time:", error);
      }
    };
    
    // Run on mount and when currentDraw changes
    if (currentDraw) {
      checkDrawEndTime();
      
      // Set up interval to check every minute
      const interval = setInterval(checkDrawEndTime, 60000);
      return () => clearInterval(interval);
    }
  }, [currentDraw]);

  // Create a new draw (admin function)
  const createDraw = async (drawData) => {
    try {
      // Calculate end time (6 hours from draw time by default)
      const drawTimeDate = drawData.drawTime ? 
        new Date(drawData.drawTime.seconds * 1000) : 
        new Date();
      
      // Default end time is 6 hours after draw time
      const endTimeDate = new Date(drawTimeDate);
      endTimeDate.setHours(endTimeDate.getHours() + 6);
      
      const newDraw = {
        ...drawData,
        participants: 0,
        entries: 0,
        winners: [],
        status: 'active',
        endTime: serverTimestamp(), // Will be updated with proper timestamp
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        autoClosingEnabled: true // New field to control auto-closing
      };
      
      const docRef = await addDoc(collection(db, 'draws'), newDraw);
      
      // Update with the actual end time after document is created
      await updateDoc(doc(db, 'draws', docRef.id), {
        endTime: Timestamp.fromDate(endTimeDate)
      });
      
      toast.success('Draw created successfully!');
      return { id: docRef.id, ...newDraw, endTime: { seconds: endTimeDate.getTime() / 1000 } };
    } catch (error) {
      toast.error("Failed to create draw: " + error.message);
      throw error;
    }
  };

  // Get user entries for the current draw
  const getUserEntries = async (userId) => {
    if (!currentDraw) return [];
    
    try {
      const q = query(
        collection(db, 'entries'),
        where('userId', '==', userId),
        where('drawId', '==', currentDraw.id)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      toast.error("Failed to fetch entries: " + error.message);
      return [];
    }
  };

  // Enter the current draw 
  const enterDraw = async () => {
    if (!currentUser) {
      toast.error("Please sign in to enter the draw");
      return null;
    }
    
    if (!currentDraw) {
      toast.error("No active draw available");
      return null;
    }
    
    try {
      // First check if user has enough balance
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        toast.error("User profile not found");
        return null;
      }
      
      const userData = userSnap.data();
      const entryFee = 100; // Rs. 100 per entry
      
      if (userData.balance < entryFee) {
        toast.error("Insufficient balance. Please add funds.");
        return null;
      }
      
      // Generate a unique ticket ID
      const ticketId = uuidv4().substring(0, 8).toUpperCase();
      
      // Create the entry
      const entryData = {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        drawId: currentDraw.id,
        ticketId,
        entryFee,
        timestamp: serverTimestamp()
      };
      
      // Using a batch to ensure all operations succeed or fail together
      const batch = writeBatch(db);
      
      // Add entry to database
      const entryRef = doc(collection(db, 'entries'));
      batch.set(entryRef, entryData);
      
      // Update user balance
      batch.update(userRef, {
        balance: increment(-entryFee),
        updatedAt: serverTimestamp()
      });
      
      // Update draw entries and participants count
      const drawRef = doc(db, 'draws', currentDraw.id);
      batch.update(drawRef, {
        entries: increment(1),
        participants: increment(1),
        updatedAt: serverTimestamp()
      });
      
      // Add transaction record
      const transactionRef = doc(collection(db, 'transactions'));
      batch.set(transactionRef, {
        userId: currentUser.uid,
        type: 'draw-entry',
        amount: -entryFee,
        description: `Entry fee for draw ${currentDraw.id} - Ticket ${ticketId}`,
        status: 'completed',
        timestamp: serverTimestamp()
      });
      
      // Commit the batch
      await batch.commit();
      
      // Calculate new entries count
      const updatedEntries = (currentDraw.entries || 0) + 1;
      
      // Check if we need to auto-complete the draw (outside the batch)
      if (updatedEntries >= 2500) {
        // Initiate auto-completion in a non-blocking way
        setTimeout(() => {
          autoCompleteDraw(currentDraw.id).catch(console.error);
        }, 100);
      }
      
      // Update local state for better UI responsiveness
      setCurrentDraw(prevDraw => {
        if (prevDraw && prevDraw.id === currentDraw.id) {
          return {
            ...prevDraw,
            entries: updatedEntries,
            participants: updatedEntries
          };
        }
        return prevDraw;
      });
      
      return {
        id: entryRef.id,
        ...entryData
      };
    } catch (error) {
      console.error("Error entering draw:", error);
      toast.error("Failed to enter draw: " + error.message);
      return null;
    }
  };

  // Auto-complete draw function - will be called when entries reach 2500
  const autoCompleteDraw = async (drawId) => {
    try {
      console.log(`Auto-completing draw ${drawId} as it has reached 2500 entries`);
      
      // First update draw status to 'completing' to prevent new entries
      const drawRef = doc(db, 'draws', drawId);
      await updateDoc(drawRef, {
        status: 'completing',
        updatedAt: serverTimestamp()
      });
      
      // Then select winners
      const success = await selectDrawWinners(drawId);
      
      if (success) {
        console.log(`Successfully auto-completed draw ${drawId}`);
        
        // Create notification for admins
        await addDoc(collection(db, 'adminNotifications'), {
          title: 'Draw Auto-Completed',
          message: `Draw #${drawId} has been automatically completed after reaching 2500 entries.`,
          read: false,
          timestamp: serverTimestamp()
        });
        
        // Fetch the next active draw if any
        const q = query(
          collection(db, 'draws'),
          where('status', '==', 'active'),
          orderBy('drawTime', 'asc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const drawData = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
          };
          setCurrentDraw(drawData);
        } else {
          // No active draw found
          setCurrentDraw(null);
        }
      } else {
        console.error(`Failed to auto-complete draw ${drawId}`);
        
        // Revert status to active if winner selection failed
        await updateDoc(drawRef, {
          status: 'active',
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Error auto-completing draw ${drawId}:`, error);
      
      // Try to revert status to active on error
      try {
        const drawRef = doc(db, 'draws', drawId);
        await updateDoc(drawRef, {
          status: 'active',
          updatedAt: serverTimestamp()
        });
      } catch (innerError) {
        console.error("Error reverting draw status:", innerError);
      }
    }
  };

  // Get all previous draws - Now accessible to all users, not just authenticated ones
  const getPreviousDraws = async (maxLimit = 10) => {
    try {
      const q = query(
        collection(db, 'draws'),
        where('status', '==', 'completed'),
        orderBy('drawTime', 'desc'),
        limit(maxLimit)
      );
      
      const querySnapshot = await getDocs(q);
      const drawsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate unique participants for each draw
      for (let i = 0; i < drawsData.length; i++) {
        const draw = drawsData[i];
        
        try {
          const entriesQuery = query(
            collection(db, 'entries'),
            where('drawId', '==', draw.id)
          );
          
          const entriesSnapshot = await getDocs(entriesQuery);
          const uniqueParticipants = new Set();
          
          entriesSnapshot.docs.forEach(doc => {
            uniqueParticipants.add(doc.data().userId);
          });
          
          drawsData[i].uniqueParticipants = uniqueParticipants.size;
        } catch (error) {
          console.error(`Error getting participants for draw ${draw.id}:`, error);
        }
      }
      
      return drawsData;
    } catch (error) {
      console.error("Failed to fetch previous draws:", error);
      return [];
    }
  };

  // Select winners for a draw (admin function)
  const selectDrawWinners = async (drawId) => {
    try {
      // Get all entries for the draw
      const q = query(
        collection(db, 'entries'),
        where('drawId', '==', drawId)
      );
      
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (entries.length === 0) {
        toast.error("No entries found for this draw");
        return false;
      }
      
      // Shuffle entries to ensure randomness
      for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
      }
      
      // Select winners - one user can only win one position
      const winners = [];
      const winnerUserIds = new Set();
      const topThreeWinnerUserIds = new Set(); // Track top 3 winners specifically
      const prizeTiers = [
        { place: 1, amount: 100000 },
        { place: 2, amount: 50000 },
        { place: 3, amount: 25000 },
        { place: 4, amount: 5000 },
        { place: 5, amount: 5000 },
        { place: 6, amount: 5000 },
        { place: 7, amount: 5000 },
        { place: 8, amount: 5000 },
        { place: 9, amount: 5000 },
        { place: 10, amount: 5000 }
      ];
      
      // Apply fairness rule for selecting winners
      for (let i = 0; i < entries.length && winners.length < prizeTiers.length; i++) {
        const entry = entries[i];
        const currentPlace = winners.length + 1;
        
        // For places 1-3, ensure the user hasn't won any top position yet
        if (currentPlace <= 3) {
          if (topThreeWinnerUserIds.has(entry.userId)) {
            // Skip if user already has a top 3 position
            continue;
          }
        } else {
          // For places 4-10, a user can't win twice in any position
          if (winnerUserIds.has(entry.userId)) {
            continue;
          }
        }
        
        // Add to winners
        const prizeInfo = prizeTiers[winners.length];
        winners.push({
          userId: entry.userId,
          userName: entry.userName,
          ticketId: entry.ticketId,
          place: prizeInfo.place,
          prize: prizeInfo.amount,
          claimed: false, // New field to track claim status
          approved: false, // New field for admin approval
          claimTimestamp: null
        });
        
        // Track winner IDs for all positions
        winnerUserIds.add(entry.userId);
        
        // Also track top 3 positions separately
        if (currentPlace <= 3) {
          topThreeWinnerUserIds.add(entry.userId);
        }
      }
      
      // Update draw with winners and mark as completed
      const drawRef = doc(db, 'draws', drawId);
      await updateDoc(drawRef, {
        status: 'completed',
        winners,
        updatedAt: serverTimestamp()
      });
      
      // Notify all winners
      for (const winner of winners) {
        try {
          // Add notification for all winners
          await addDoc(collection(db, 'notifications'), {
            userId: winner.userId,
            title: 'Congratulations! You Won!',
            message: `You won ${winner.place}${getSuffix(winner.place)} place and Rs. ${winner.prize} in the lucky draw! Please claim your prize.`,
            read: false,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error(`Error sending notification to winner ${winner.userId}:`, error);
        }
      }
      
      toast.success('Winners selected! Winners have been notified to claim their prizes.');
      return true;
    } catch (error) {
      console.error("Error selecting winners:", error);
      toast.error("Failed to select winners: " + error.message);
      return false;
    }
  };

  // New function to claim a prize
  const claimPrize = async (drawId, ticketId) => {
    try {
      // Find the draw
      const drawRef = doc(db, 'draws', drawId);
      const drawSnap = await getDoc(drawRef);
      
      if (!drawSnap.exists()) {
        toast.error("Draw not found");
        return false;
      }
      
      const drawData = drawSnap.data();
      
      // Find the winner entry
      const winnerIndex = drawData.winners.findIndex(w => w.ticketId === ticketId);
      
      if (winnerIndex === -1) {
        toast.error("Winner not found in this draw");
        return false;
      }
      
      if (drawData.winners[winnerIndex].claimed) {
        toast.info("This prize has already been claimed");
        return true; // Not an error, just already claimed
      }
      
      // Get current timestamp manually instead of using serverTimestamp in the array
      const currentTimestamp = new Date();
      
      // Update the winner's claim status
      const updatedWinners = [...drawData.winners];
      updatedWinners[winnerIndex] = {
        ...updatedWinners[winnerIndex],
        claimed: true,
        // Use a regular Date object instead of serverTimestamp() in the array
        claimTimestamp: {
          seconds: Math.floor(currentTimestamp.getTime() / 1000),
          nanoseconds: 0
        }
      };
      
      await updateDoc(drawRef, {
        winners: updatedWinners,
        updatedAt: serverTimestamp()
      });
      
      // Create a pending transaction for the claim
      await addDoc(collection(db, 'transactions'), {
        userId: drawData.winners[winnerIndex].userId,
        drawId: drawId,
        ticketId: ticketId,
        type: 'prize-claim',
        amount: drawData.winners[winnerIndex].prize,
        description: `Claim for ${drawData.winners[winnerIndex].place}${getSuffix(drawData.winners[winnerIndex].place)} place prize in draw ${drawId}`,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      
      // Create notification for admins
      await addDoc(collection(db, 'adminNotifications'), {
        title: 'Prize Claim Request',
        message: `User ${drawData.winners[winnerIndex].userName} has claimed their ${drawData.winners[winnerIndex].place}${getSuffix(drawData.winners[winnerIndex].place)} place prize of Rs. ${drawData.winners[winnerIndex].prize} in draw ${drawId}. Please review.`,
        read: false,
        timestamp: serverTimestamp(),
        claimInfo: {
          drawId,
          ticketId,
          userId: drawData.winners[winnerIndex].userId,
          place: drawData.winners[winnerIndex].place,
          prize: drawData.winners[winnerIndex].prize
        }
      });
      
      toast.success("Your prize claim has been submitted for approval");
      return true;
    } catch (error) {
      console.error("Error claiming prize:", error);
      toast.error("Failed to claim prize: " + error.message);
      return false;
    }
  };

  // New function for admin to approve a prize claim
  const approvePrizeClaim = async (drawId, ticketId) => {
    try {
      if (!currentUser) {
        toast.error("You must be logged in to approve claims");
        return false;
      }
      
      // Find the draw
      const drawRef = doc(db, 'draws', drawId);
      const drawSnap = await getDoc(drawRef);
      
      if (!drawSnap.exists()) {
        toast.error("Draw not found");
        return false;
      }
      
      const drawData = drawSnap.data();
      
      // Find the winner entry
      const winnerIndex = drawData.winners.findIndex(w => w.ticketId === ticketId);
      
      if (winnerIndex === -1) {
        toast.error("Winner not found in this draw");
        return false;
      }
      
      const winner = drawData.winners[winnerIndex];
      
      if (!winner.claimed) {
        toast.error("This prize has not been claimed yet");
        return false;
      }
      
      if (winner.approved) {
        toast.info("This prize claim has already been approved");
        return true;
      }
      
      // Get user document
      const userRef = doc(db, 'users', winner.userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        toast.error("User not found");
        return false;
      }
      
      const userData = userSnap.data();
      
      // Get current timestamp manually for the array update
      const currentTimestamp = new Date();
      
      // Update the winner's approval status in the draw
      const updatedWinners = [...drawData.winners];
      updatedWinners[winnerIndex] = {
        ...updatedWinners[winnerIndex],
        approved: true,
        approvedBy: currentUser.uid,
        // Use a regular Date object instead of serverTimestamp() in the array
        approvedAt: {
          seconds: Math.floor(currentTimestamp.getTime() / 1000),
          nanoseconds: 0
        }
      };
      
      await updateDoc(drawRef, {
        winners: updatedWinners,
        updatedAt: serverTimestamp()
      });
      
      // Update user balance
      await updateDoc(userRef, {
        balance: (userData.balance || 0) + winner.prize,
        updatedAt: serverTimestamp()
      });
      
      // Update transaction status
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('drawId', '==', drawId),
        where('ticketId', '==', ticketId),
        where('type', '==', 'prize-claim')
      );
      
      const transactionsSnap = await getDocs(transactionsQuery);
      for (const docItem of transactionsSnap.docs) {
        await updateDoc(docItem.ref, {
          status: 'completed',
          approvedBy: currentUser.uid,
          approvedAt: serverTimestamp()
        });
      }
      
      // Notify the user
      await addDoc(collection(db, 'notifications'), {
        userId: winner.userId,
        title: 'Prize Claim Approved!',
        message: `Your prize claim of Rs. ${winner.prize} has been approved and credited to your wallet.`,
        read: false,
        timestamp: serverTimestamp()
      });
      
      toast.success(`Prize claim approved and Rs. ${winner.prize} credited to user's wallet`);
      return true;
    } catch (error) {
      console.error("Error approving prize:", error);
      toast.error("Failed to approve prize: " + error.message);
      return false;
    }
  };

  // Helper function for number suffixes
  const getSuffix = (num) => {
    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';
    return 'th';
  };

  const value = {
    currentDraw,
    loading,
    createDraw,
    enterDraw,
    getUserEntries,
    getPreviousDraws,
    selectDrawWinners,
    claimPrize,
    approvePrizeClaim
  };

  return (
    <DrawContext.Provider value={value}>
      {children}
    </DrawContext.Provider>
  );
}
