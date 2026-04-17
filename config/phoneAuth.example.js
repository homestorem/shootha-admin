import { signInWithPhoneNumber } from "firebase/auth";
import { getFirebaseAuth } from "./firebase.js";

/** iOS/Android (Firebase JS RN): غالباً بدون verifier مع أرقام الاختبار. الويب: مرّر FirebaseRecaptchaVerifierModal. */
export async function sendPhoneOtp(phoneE164, applicationVerifier) {
  const auth = getFirebaseAuth();
  if (applicationVerifier) {
    return signInWithPhoneNumber(auth, phoneE164, applicationVerifier);
  }
  return signInWithPhoneNumber(auth, phoneE164);
}
