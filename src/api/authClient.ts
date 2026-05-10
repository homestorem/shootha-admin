import axios, { AxiosError } from "axios";
import { isBackendSyncEnabled } from "../lib/backendFlags";
import type { AuthUser } from "../lib/authTypes";
import { getFirebaseAppCheckTokenForRequest } from "../lib/getFirebaseAppCheckToken";

export type OtpFlow = "login" | "register";

function apiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
}

async function withAppCheckHeaders(headers?: Record<string, string>): Promise<Record<string, string>> {
  const h = { ...headers };
  try {
    const t = await getFirebaseAppCheckTokenForRequest();
    if (t) h["X-Firebase-AppCheck"] = t;
  } catch {
    /* optional */
  }
  return h;
}

function mapAxiosError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const ax = e as AxiosError<{ message?: string; error?: string }>;
    return ax.response?.data?.message || ax.response?.data?.error || ax.message || "network";
  }
  return "unknown";
}

/** طلب إرسال OTP عند التسجيل أو الدخول */
export async function requestSendOtp(args: { phone: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isBackendSyncEnabled) return { ok: true };
  try {
    await axios.post(`${apiBase()}/api/auth/send-otp`, args, {
      timeout: 30000,
      headers: await withAppCheckHeaders()
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: mapAxiosError(e) };
  }
}

export type VerifyOtpResult =
  | { ok: true; user: AuthUser | null; accessToken?: string | null }
  | { ok: false; error: string };

/** التحقق من OTP — يعيد المستخدم من الخادم عند التفعيل */
export async function verifyOtpWithBackend(args: {
  phone: string;
  code: string;
  flow: OtpFlow;
  requestId?: string;
}): Promise<VerifyOtpResult> {
  if (!isBackendSyncEnabled) {
    return { ok: true, user: null };
  }
  try {
    const { data } = await axios.post<{
      verified: boolean;
      token?: string;
    }>(`${apiBase()}/api/auth/verify-otp`, args, {
      timeout: 20000,
      headers: await withAppCheckHeaders()
    });

    return { ok: true, user: null, accessToken: data.token ?? null };
  } catch (e) {
    return { ok: false, error: mapAxiosError(e) };
  }
}
