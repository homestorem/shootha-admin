/**
 * نقطة دخول Firebase (مطابقة أسلوب الويب: `initializeApp` + `auth`).
 */
import type { Auth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import {
  firebaseConfig,
  getFirebaseApp,
  getFirebaseAuth,
  isFirebaseConfigured
} from "../lib/firebase";

export { firebaseConfig, isFirebaseConfigured, getFirebaseApp, getFirebaseAuth };

/** مرجع التطبيق — يستدعي التهيئة الكسولة عند أول وصول للخاصية */
export const app = new Proxy({} as FirebaseApp, {
  get(_target, prop, receiver) {
    const a = getFirebaseApp();
    const v = Reflect.get(a, prop, receiver);
    return typeof v === "function" ? (v as (...args: unknown[]) => unknown).bind(a) : v;
  }
});

let authSingleton: Auth | null = null;

function ensureAuth(): Auth {
  if (!authSingleton) authSingleton = getFirebaseAuth();
  return authSingleton;
}

/** نفس `getAuth(app)` — للاستخدام مع واجهات Firebase المعيارية */
export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    const a = ensureAuth();
    const v = Reflect.get(a, prop, receiver);
    return typeof v === "function" ? (v as (...args: unknown[]) => unknown).bind(a) : v;
  }
});
