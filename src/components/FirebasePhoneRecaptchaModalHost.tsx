import React from "react";
import { FirebaseRecaptchaVerifierModal } from "../lib/firebaseRecaptcha";
import { firebaseConfig, isFirebaseConfigured } from "../config/firebaseConfig";
import { firebaseRecaptchaModalRef } from "../lib/firebaseRecaptchaModalRef";

/**
 * reCAPTCHA عبر WebView + Firebase compat في الصفحة (بدون expo-firebase-core).
 * يُستخدم مع PhoneAuthProvider.verifyPhoneNumber.
 */
export function FirebasePhoneRecaptchaModalHost() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return (
    <FirebaseRecaptchaVerifierModal
      firebaseConfig={firebaseConfig}
      attemptInvisibleVerification
      title="التحقق"
      cancelLabel="إلغاء"
      // يربط مثيل الـ verifier (native class أو ويب forwardRef) بـ PhoneAuthProvider.verifyPhoneNumber
      ref={firebaseRecaptchaModalRef as React.Ref<InstanceType<typeof FirebaseRecaptchaVerifierModal>>}
    />
  );
}
