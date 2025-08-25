import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDtp4_LdEjUoFJ4BGTsBM2zV2a2CvKy_Gc",
  authDomain: "beer-app-44415.firebaseapp.com",
  projectId: "beer-app-44415",
  storageBucket: "beer-app-44415.firebasestorage.app",
  messagingSenderId: "237776059759",
  appId: "1:237776059759:web:4084a7e3358d437da8bc9a",
  measurementId: "G-KQLJ2B1MG7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);



export default app;