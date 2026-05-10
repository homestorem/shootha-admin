/**
 * عند `true`: طلبات OTP تمر عبر `EXPO_PUBLIC_OTP_API_URL` → Express `/otp/send` و `/otp/verify`.
 * عند `false`: جلسة محلية للواجهة فقط.
 */
export const isBackendSyncEnabled = true;