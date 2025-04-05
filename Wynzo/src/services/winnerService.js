import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc, 
  Timestamp,
  addDoc // Added missing import
} from 'firebase/firestore';

// Get all participants eligible for winning in a draw
export const getEligibleParticipants = async (drawId) => {
  try {
    const participantsRef = collection(db, 'participants');
    const q = query(participantsRef, where('drawId', '==', drawId), where('active', '==', true));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting eligible participants:', error);
    throw error;
  }
};

// Get previous top-3 winners to exclude them from top positions
export const getPreviousTopWinners = async () => {
  try {
    const winnersRef = collection(db, 'winners');
    const q = query(winnersRef, where('position', '<=', 3));
    const snapshot = await getDocs(q);
    
    // Extract unique participant IDs
    const topWinnerIds = new Set();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      topWinnerIds.add(data.participantId);
    });
    
    return Array.from(topWinnerIds);
  } catch (error) {
    console.error('Error getting previous top winners:', error);
    throw error;
  }
};

// Select winners randomly based on the criteria
export const selectRandomWinners = async (drawId, numberOfWinners = 10) => {
  try {
    // Get all eligible participants
    const participants = await getEligibleParticipants(drawId);
    
    // Get previous top winners
    const previousTopWinners = await getPreviousTopWinners();
    
    // Filter participants list - exclude previous top winners from being eligible for top positions
    const eligibleForTopPositions = participants.filter(
      participant => !previousTopWinners.includes(participant.id)
    );
    
    const winners = [];
    const selectedIds = new Set(); // Track selected winners to avoid duplicates
    
    // Select top 3 positions from eligible participants
    for (let position = 1; position <= Math.min(3, numberOfWinners); position++) {
      if (eligibleForTopPositions.length === 0) break;
      
      // Random selection
      const randomIndex = Math.floor(Math.random() * eligibleForTopPositions.length);
      const selectedWinner = eligibleForTopPositions[randomIndex];
      
      winners.push({
        participantId: selectedWinner.id,
        name: selectedWinner.name,
        position,
        drawId,
        timestamp: Timestamp.now()
      });
      
      // Remove the selected winner from eligible lists
      eligibleForTopPositions.splice(randomIndex, 1);
      selectedIds.add(selectedWinner.id);
    }
    
    // Fill remaining positions from all remaining participants
    const remainingParticipants = participants.filter(
      participant => !selectedIds.has(participant.id)
    );
    
    for (let position = winners.length + 1; position <= numberOfWinners; position++) {
      if (remainingParticipants.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
      const selectedWinner = remainingParticipants[randomIndex];
      
      winners.push({
        participantId: selectedWinner.id,
        name: selectedWinner.name,
        position,
        drawId,
        timestamp: Timestamp.now()
      });
      
      // Remove the selected winner
      remainingParticipants.splice(randomIndex, 1);
    }
    
    return winners;
  } catch (error) {
    console.error('Error selecting random winners:', error);
    throw error;
  }
};

// Save winners to database
export const saveWinners = async (drawId, winners) => {
  try {
    const drawRef = doc(db, 'draws', drawId);
    const drawDoc = await getDoc(drawRef);
    
    if (!drawDoc.exists()) {
      throw new Error('Draw not found');
    }
    
    // Check if winners are already selected
    if (drawDoc.data().winnersSelected) {
      throw new Error('Winners already selected for this draw');
    }
    
    // Add each winner to the winners collection
    for (const winner of winners) {
      const winnersRef = collection(db, 'winners');
      await addDoc(winnersRef, winner);
    }
    
    // Update the draw to mark winners as selected
    await updateDoc(drawRef, {
      winnersSelected: true,
      winnerSelectionDate: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving winners:', error);
    throw error;
  }
};

// Validate manual winner selection
export const validateManualWinners = async (drawId, selectedWinners) => {
  try {
    // Ensure no duplicates
    const winnerIds = selectedWinners.map(w => w.participantId);
    if (new Set(winnerIds).size !== winnerIds.length) {
      return {
        valid: false,
        message: 'A participant cannot win more than once in a draw'
      };
    }
    
    // Get previous top winners
    const previousTopWinners = await getPreviousTopWinners();
    
    // Check if any top-3 positions contain previous top winners
    for (let i = 0; i < Math.min(3, selectedWinners.length); i++) {
      if (previousTopWinners.includes(selectedWinners[i].participantId)) {
        return {
          valid: false,
          message: `Participant ${selectedWinners[i].name} has already won in a top-3 position previously`
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating manual winners:', error);
    throw error;
  }
};

// Save manually selected winners
export const saveManualWinners = async (drawId, selectedWinners) => {
  try {
    // Validate first
    const validation = await validateManualWinners(drawId, selectedWinners);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    
    // Then save
    return await saveWinners(drawId, selectedWinners);
  } catch (error) {
    console.error('Error saving manual winners:', error);
    throw error;
  }
};
