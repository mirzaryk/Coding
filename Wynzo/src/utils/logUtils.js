import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Create a system log entry in Firestore for important operations
export const createSystemLog = async (action, details, status = 'info') => {
  try {
    await addDoc(collection(db, 'systemLogs'), {
      action,
      details,
      status, // info, warning, error
      timestamp: serverTimestamp()
    });
    console.log(`System log created: ${action}`);
    return true;
  } catch (error) {
    console.error('Error creating system log:', error);
    return false;
  }
};

// Log winner processing for better tracking
export const logWinnerProcessing = async (drawId, winnerId, place, prize, status, error = null) => {
  try {
    await addDoc(collection(db, 'winnerLogs'), {
      drawId,
      winnerId,
      place,
      prize,
      status, // success, error, pending
      error: error ? error.toString() : null,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error logging winner processing:', error);
    return false;
  }
};

// Log transaction processing for better tracking
export const logTransactionProcessing = async (transactionId, userId, amount, action, adminId) => {
  try {
    await addDoc(collection(db, 'transactionLogs'), {
      transactionId,
      userId,
      amount,
      action, // 'approved', 'rejected'
      processedBy: adminId,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error logging transaction processing:', error);
    return false;
  }
};
