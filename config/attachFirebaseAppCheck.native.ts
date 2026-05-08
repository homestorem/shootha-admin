import type { FirebaseApp } from "firebase/app";

/**
 * Expo Go / بدون React Native Firebase: لا يُفعَّل App Check الأصلي على الموبايل.
 * المصادقة وFirestore تبقى عبر Firebase Web SDK في `config/firebase.js`.
 * (على الويب يبقى reCAPTCHA في `attachFirebaseAppCheck.web.ts` إن وُجد مفتاح الموقع.)
 */
export function attachFirebaseAppCheck(_app: FirebaseApp): void {
  /* intentional no-op */
}
