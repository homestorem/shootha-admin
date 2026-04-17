import type { FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { setFirebaseAppCheckInstance } from "./firebaseAppCheckInstance";

/**
 * Web: App Check عبر reCAPTCHA v3 (مفتاح الموقع عام).
 */
export function attachFirebaseAppCheck(app: FirebaseApp): void {
  const siteKey = (process.env.EXPO_PUBLIC_RECAPTCHA_V3_SITE_KEY || "").trim();
  if (!siteKey) return;
  const ac = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true
  });
  setFirebaseAppCheckInstance(ac);
}
