/**
 * Central Firebase JS SDK entry — no expo-firebase-* packages.
 * Config: `config/firebase.js` + EXPO_PUBLIC_FIREBASE_*.
 */
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

export { firebaseConfig, isFirebaseConfigured } from "../config/firebaseConfig";

export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
  updateUserLanguage,
  signInWithPhoneNumber,
  firebaseSignOut,
  onAuthStateChanged,
  ensureUserProfile,
  type ConfirmationResult,
  type EnsureUserProfileOptions,
  type SyncedUserProfile
} from "./firebase";

import { getFirebaseApp, getFirebaseAuth, getFirestoreDb } from "./firebase";

/** Auth singleton (React Native persistence on native; getAuth on web). */
export function getAuth(): Auth {
  return getFirebaseAuth();
}

/** Default Firestore for the configured app. */
export function getFirestore(): Firestore {
  return getFirestoreDb();
}

export function getApp(): FirebaseApp {
  return getFirebaseApp();
}
