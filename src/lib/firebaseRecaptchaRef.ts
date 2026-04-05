import type { ApplicationVerifier } from "firebase/auth";

/** مرجع `FirebaseRecaptchaVerifierModal` (iOS/Android) — يُعيَّن من `App.tsx` */
export const nativeRecaptchaVerifierRef: { current: ApplicationVerifier | null } = {
  current: null
};
