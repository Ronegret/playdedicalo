import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence
} from "firebase/auth";
import { getDatabase } from 'firebase/database';

const DEFAULT_AUTH_DOMAIN = "dedicalo-play-trivia-7.firebaseapp.com";
const CUSTOM_AUTH_DOMAINS = new Set([
  "play.dedicalo.es",
  "dedicalo-app.vercel.app",
]);

function getFirebaseAuthDomain() {
  if (typeof window === "undefined") return DEFAULT_AUTH_DOMAIN;

  const { hostname } = window.location;
  return CUSTOM_AUTH_DOMAINS.has(hostname) ? hostname : DEFAULT_AUTH_DOMAIN;
}

const firebaseConfig = {
  apiKey: "AIzaSyATq2cehDwu43sxouhGnKpIU7to0GwLVKs",
  authDomain: getFirebaseAuthDomain(),
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
