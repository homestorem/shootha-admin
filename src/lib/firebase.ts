import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  type Auth,
  type ConfirmationResult
} from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { firebaseConfig, isFirebaseConfigured } from "../config/firebaseConfig";
import { deriveOwnerIdFromUid } from "./ownerId";

export { firebaseConfig };

let firebaseAppSingleton: FirebaseApp | null = null;

/**
 * تهيئة كسولة — لا تُستدعى `initializeApp` إلا عند الحاجة وبعد التحقق من الإعداد.
 * يمنع أعطال التحميل أو تهيئة مزدوجة عند غياب مفاتيح البيئة.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* in .env");
  }
  if (!firebaseAppSingleton) {
    firebaseAppSingleton = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return firebaseAppSingleton;
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const firebaseApp = getFirebaseApp();
  if (Platform.OS === "web") {
    authInstance = getAuth(firebaseApp);
  } else {
    try {
      authInstance = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch {
      authInstance = getAuth(firebaseApp);
    }
  }
  return authInstance;
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

export { signInWithPhoneNumber, firebaseSignOut, onAuthStateChanged, type ConfirmationResult };

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

/** تنظيف reCAPTCHA الويب (عند فشل الإرسال أو إعادة الإنشاء) */
export function clearWebRecaptchaVerifier(): void {
  if (typeof window === "undefined") return;
  const v = window.recaptchaVerifier;
  if (v) {
    try {
      v.clear();
    } catch {
      /* ignore */
    }
    window.recaptchaVerifier = null;
  }
}

/**
 * reCAPTCHA غير مرئي للويب — نسخة واحدة على window تطابق حاوية DOM #recaptcha-container.
 */
export function getOrCreateWebRecaptchaVerifier(): RecaptchaVerifier | null {
  if (typeof window === "undefined") return null;
  if (Platform.OS !== "web") return null;

  if (!window.recaptchaVerifier) {
    const auth = getFirebaseAuth();
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible"
    });
  }
  return window.recaptchaVerifier;
}

export type EnsureUserProfileOptions = {
  displayName?: string | null;
};

export type SyncedUserProfile = {
  ownerId: string;
  displayName?: string | null;
  phone?: string | null;
};

/**
 * ينشئ/يحدّث مستند `users/{uid}` مع ownerId مشتق من UID (مرة واحدة)، role: owner.
 */
export async function ensureUserProfile(
  uid: string,
  phone: string | null,
  opts?: EnsureUserProfileOptions
): Promise<SyncedUserProfile> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const displayName = opts?.displayName?.trim() || null;
  const ownerId = deriveOwnerIdFromUid(uid);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      ownerId,
      phone: phone ?? null,
      ...(displayName ? { displayName } : {}),
      role: "owner",
      createdAt: serverTimestamp()
    });
  } else {
    const data = snap.data() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (data.ownerId == null || data.ownerId === "") {
      patch.ownerId = ownerId;
    }
    if (data.uid == null || data.uid === "") {
      patch.uid = uid;
    }
    if (displayName) {
      patch.displayName = displayName;
    }
    if (data.role == null || data.role === "") {
      patch.role = "owner";
    }
    if (Object.keys(patch).length > 0) {
      await updateDoc(ref, patch);
    }
  }

  const finalSnap = await getDoc(ref);
  const d = finalSnap.data() as Record<string, unknown> | undefined;
  return {
    ownerId: typeof d?.ownerId === "string" ? d.ownerId : ownerId,
    displayName: (d?.displayName as string) ?? displayName ?? undefined,
    phone: (d?.phone as string) ?? phone ?? null
  };
}

export { isFirebaseConfigured };
