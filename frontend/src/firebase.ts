import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)');

// Collection reference helper for citizenServices
export const servicesCol = collection(db, 'citizenServices');

export { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, query };
