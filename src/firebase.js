import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence
} from "firebase/auth";
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyATq2cehDwu43sxouhGnKpIU7to0GwLVKs",
  authDomain: "dedicalo-play-trivia-7.firebaseapp.com",
  projectId: "dedicalo-play-trivia-7",
  storageBucket: "dedicalo-play-trivia-7.firebasestorage.app",
  messagingSenderId: "908813466951",
  appId: "1:908813466951:web:f9324b872b5c87457b6062",
  databaseURL: "https://dedicalo-play-trivia-7-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Firebase auth persistence could not be configured:', error);
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const database = getDatabase(app);
