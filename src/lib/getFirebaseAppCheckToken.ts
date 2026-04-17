import { getToken } from "firebase/app-check";
import { isFirebaseConfigured } from "../../config/firebase.js";
import { getFirebaseAppCheckInstance } from "../../config/firebaseAppCheckInstance";

/** يُرجع JWT App Check لإرفاقه مع طلبات الخادم، أو null إن لم يُهيّأ App Check. */
export async function getFirebaseAppCheckTokenForRequest(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const appCheck = getFirebaseAppCheckInstance();
  if (!appCheck) return null;
  try {
    const { token } = await getToken(appCheck, false);
    return token || null;
  } catch {
    return null;
  }
}
