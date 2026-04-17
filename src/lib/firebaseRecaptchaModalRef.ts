import { createRef } from "react";
import type { FirebaseAuthApplicationVerifier } from "./firebaseRecaptcha/FirebaseRecaptcha.types";

/** ApplicationVerifier لـ PhoneAuthProvider.verifyPhoneNumber (native WebView أو ويب compat). */
export const firebaseRecaptchaModalRef = createRef<FirebaseAuthApplicationVerifier | null>();
