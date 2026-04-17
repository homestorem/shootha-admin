import type { FirebaseOptions } from "firebase/app";
import {
  firebaseConfig as firebaseConfigRaw,
  isFirebaseConfigured,
  getFirebaseApp,
  getFirebaseAuth
} from "../../config/firebase.js";

export const firebaseConfig: FirebaseOptions = firebaseConfigRaw as FirebaseOptions;
export { isFirebaseConfigured, getFirebaseApp, getFirebaseAuth };
