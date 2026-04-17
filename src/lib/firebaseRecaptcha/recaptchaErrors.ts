/** أخطاء reCAPTCHA بدون الاعتماد على expo-modules-core */
export class RecaptchaCodedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RecaptchaCodedError";
    this.code = code;
  }
}
