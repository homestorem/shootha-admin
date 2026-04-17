/**
 * Firebase Web SDK — تهيئة واحدة للمشروع (Expo / RN / Web).
 * المتغيرات: EXPO_PUBLIC_FIREBASE_* في .env أو EAS Secrets (تُدمج في الحزمة).
 * مفاتيح تعريف عميل فقط — قيّدها في Google Cloud Console؛ لا تضع OTP أو Service Account تحت EXPO_PUBLIC_*.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence
} from "firebase/auth";
import { attachFirebaseAppCheck } from "./attachFirebaseAppCheck";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? ""
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

let appSingleton = null;
let authSingleton = null;
let appCheckAttached = false;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* env vars.");
  }
  if (!appSingleton) {
    appSingleton = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  if (!appCheckAttached) {
    appCheckAttached = true;
    try {
      attachFirebaseAppCheck(appSingleton);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[firebase] App Check attach failed:", msg);
    }
  }
  return appSingleton;
}

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* env vars.");
  }
  if (!authSingleton) {
    const app = getFirebaseApp();
    if (Platform.OS === "web") {
      authSingleton = getAuth(app);
    } else {
      try {
        authSingleton = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
      } catch {
        authSingleton = getAuth(app);
      }
    }
  }
  return authSingleton;
}
