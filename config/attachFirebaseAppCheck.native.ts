import type { FirebaseApp } from "firebase/app";
import { initializeAppCheck } from "firebase/app-check";
import { ReactNativeFirebaseAppCheckProvider } from "@react-native-firebase/app-check";
import { setFirebaseAppCheckInstance } from "./firebaseAppCheckInstance";

/**
 * iOS: DeviceCheck (أو debug في التطوير).
 * Android: Play Integrity (أو debug في التطوير).
 * يتطلب build أصلي (مثل expo run / EAS) وليس Expo Go.
 */
export function attachFirebaseAppCheck(app: FirebaseApp): void {
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    const debugToken = (process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN || "").trim();
    const useDebug = __DEV__;
    provider.configure({
      android: {
        provider: useDebug ? "debug" : "playIntegrity",
        ...(debugToken ? { debugToken } : {})
      },
      apple: {
        provider: useDebug ? "debug" : "deviceCheck",
        ...(debugToken ? { debugToken } : {})
      }
    });
    // RNFB provider implements AppCheckProvider at runtime; JS SDK types only list web providers.
    const ac = initializeAppCheck(app, {
      provider: provider as never,
      isTokenAutoRefreshEnabled: true
    });
    setFirebaseAppCheckInstance(ac);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[firebase-app-check] native attach skipped:", msg);
  }
}
