/** مطابق لـ ApplicationVerifier في Firebase Auth (واجهة reCAPTCHA). */
export interface FirebaseAuthApplicationVerifier {
  readonly type: string;
  verify(): Promise<string>;
}
