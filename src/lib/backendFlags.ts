/**
 * عند `true`: طلبات OTP تمر عبر `EXPO_PUBLIC_API_URL` → Express `/api/auth/send-otp` و `/api/auth/verify-otp`.
 * عند `false`: جلسة محلية للواجهة فقط.
 */
export const isBackendSyncEnabled = true;