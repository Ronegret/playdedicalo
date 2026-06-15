import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyATq2cehDwu43sxouhGnKpIU7to0GwLVKs",
  authDomain: "dedicalo-play-trivia-7.firebaseapp.com",
  projectId: "dedicalo-play-trivia-7",
  storageBucket: "dedicalo-play-trivia-7.firebasestorage.app",
  messagingSenderId: "908813466951",
  appId: "1:908813466951:web:f9324b872b5c87457b6062",
  databaseURL: "https://dedicalo-play-trivia-7-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = getApps().find((firebaseApp) => firebaseApp.name === 'dedicalo') || initializeApp(firebaseConfig, 'dedicalo');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

