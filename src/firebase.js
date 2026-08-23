import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInAnonymously
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

// Cuando muchas personas entran a la vez desde la misma red (una fiesta,
// todo el mundo comparte la IP pública del wifi/hotspot), Firebase a veces
// devuelve errores transitorios (auth/network-request-failed,
// auth/too-many-requests) al crear la sesión anónima que las reglas de la
// base de datos exigen (`auth != null`). Sin reintentos esa persona se
// queda sin poder unirse aunque el PIN sea correcto — parece "la sala está
// llena" pero en realidad es solo una sesión que nunca terminó de armarse.
// Todo lo que necesita autenticación llama a esto primero en vez de asumir
// que el listener de App.jsx ya resolvió.
let ensureAuthPromise = null;
export function ensureAuthenticated(retries = 4) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (ensureAuthPromise) return ensureAuthPromise;

  ensureAuthPromise = (async () => {
    await authReady;
    if (auth.currentUser) return auth.currentUser;

    let lastError = null;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const result = await signInAnonymously(auth);
        return result.user;
      } catch (error) {
        lastError = error;
        const delay = Math.min(600 * 2 ** attempt, 4000);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      }
    }
    throw lastError || new Error('No se pudo iniciar sesión.');
  })().finally(() => {
    ensureAuthPromise = null;
  });

  return ensureAuthPromise;
}
