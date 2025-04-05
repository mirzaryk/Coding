import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  writeBatch,
  increment,
  limit
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAknkE6a8hobXU-bflGDhkkAVSiSGj1NTs",
    authDomain: "wynzo2.firebaseapp.com",
    projectId: "wynzo2",
    storageBucket: "wynzo2.firebasestorage.app",
    messagingSenderId: "156174961801",
    appId: "1:156174961801:web:5731bfb396fc3d4c224a58",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings for better offline support
export const db = getFirestore(app);

// Enable offline persistence when possible
try {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support persistence
      console.log('Persistence not supported by this browser');
    }
  });
} catch (error) {
  console.log('Error enabling persistence:', error);
}

export const storage = getStorage(app);

export default app;
