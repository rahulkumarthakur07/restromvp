import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Placeholder Firebase configuration
// The user will replace these with actual config from Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyD4-HKZITUyBASSZfRx7apSZtu1RSMESZc",
  authDomain: "resmvp-a3b60.firebaseapp.com",
  projectId: "resmvp-a3b60",
  storageBucket: "resmvp-a3b60.firebasestorage.app",
  messagingSenderId: "769431042513",
  appId: "1:769431042513:web:da0aa7be878190052408f0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Simple mock user for admin section
export const MOCK_ADMIN_PASS = "admin123";
