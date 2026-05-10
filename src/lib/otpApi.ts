const OTP_TIMEOUT_MS = 15000;
/** إرسال OTP قد يستغرق وقتاً أطول عند إيقاظ خادم (مثل Render) */
const OTP_SEND_TIMEOUT_MS = 30000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * إعادة محاولة عند فشل الشبكة المؤقت (Failed to fetch / timeout) — مناسب لخدمات تنام بعد الخمول.
 */
async function fetchOtpResilient(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const backoffAfterFailMs = [1200, 2800];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoffAfterFailMs.length; attempt++) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (e: unknown) {
      lastErr = e;
      const err = e instanceof OtpApiError ? e : null;
      if (!err || (err.code !== "otp_server_unreachable" && err.code !== "otp_timeout")) {
        throw e;
      }
      if (attempt === backoffAfterFailMs.length) {
        throw e;
      }
      await sleep(backoffAfterFailMs[attempt] ?? 0);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function getReadableUrl(url: string) {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

type OtpApiErrorCode =
  | "otp_timeout"
  | "otp_server_unreachable"
  | "otp_api_url_missing"
  | "otp_bad_response"
  | "invalid_code"
  | "invalid_phone_format"
  | "rate_limited"
  | "otp_send_locked"
  | "code_expired"
  | "trial_mode"
  | "provider_error"
  | "server_error"
  | "app_check_failed";

export class OtpApiError extends Error {
  code: OtpApiErrorCode | string;
  /** من الخادم عند `otp_send_locked` */
  retryAfterSeconds?: number;

  constructor(code: OtpApiErrorCode | string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "OtpApiError";
    this.code = code;
    if (retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      this.retryAfterSeconds = Math.floor(retryAfterSeconds);
    }
  }
}

type OtpServerResponse = {
  success?: boolean;
  message?: string;
  code?: string;
  requestId?: string;
  verified?: boolean;
  token?: string;
  user?: Record<string, unknown>;
  retryAfterSeconds?: number;
};

function getOtpApiUrl(): string {
  const base = (process.env.EXPO_PUBLIC_OTP_API_URL || process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (!base) {
    throw new OtpApiError("otp_api_url_missing", "OTP API URL is missing.");
  }
  const cleaned = base.replace(/\/+$/, "");

  // Android emulator can't reach host via localhost/127.0.0.1.
  // Map it to the special host gateway IP.
  try {
    // Lazy import to avoid pulling react-native in non-native tooling.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require("react-native") as { Platform?: { OS?: string } };
    const os = Platform?.OS;
    if (os === "android" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleaned)) {
      return cleaned.replace(/\/\/(localhost|127\.0\.0\.1)/i, "//10.0.2.2");
    }
  } catch {
    // ignore
  }

  return cleaned;
}

function getOtpApiUrls(): string[] {
  return [getOtpApiUrl()];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = OTP_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new OtpApiError("otp_server_unreachable", `الخادم غير متاح مؤقتاً (${response.status}) — ${getReadableUrl(url)}`);
    }
    return response;
  } catch (e: unknown) {
    if (e instanceof OtpApiError) throw e;
    if ((e as { name?: string })?.name === "AbortError") {
      throw new OtpApiError("otp_timeout", `انتهت مهلة الاتصال، حاول مرة أخرى (${getReadableUrl(url)})`);
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new OtpApiError("otp_server_unreachable", `تعذر الاتصال بخادم التحقق (${getReadableUrl(url)}): ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function buildOtpFetchHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { getFirebaseAppCheckTokenForRequest } = await import("./getFirebaseAppCheckToken");
    const t = await getFirebaseAppCheckTokenForRequest();
    if (t) headers["X-Firebase-AppCheck"] = t;
  } catch {
    /* optional */
  }
  return headers;
}

async function requestOtp(path: "/api/auth/send-otp" | "/api/auth/verify-otp", body: Record<string, unknown>): Promise<OtpServerResponse> {
  const bases = getOtpApiUrls();
  let lastNetworkError: OtpApiError | null = null;
  const headers = await buildOtpFetchHeaders();
  const timeoutMs = path === "/api/auth/send-otp" ? OTP_SEND_TIMEOUT_MS : OTP_TIMEOUT_MS;

  for (const base of bases) {
    try {
      console.log("FINAL OTP URL =", `${base}${path}`);
      const response = await fetchOtpResilient(
        `${base}${path}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body)
        },
        timeoutMs
      );

      let payload: OtpServerResponse = {};
      try {
        payload = (await response.json()) as OtpServerResponse;
      } catch {
        let rawPreview = "";
        try {
          const cloned = response.clone();
          rawPreview = (await cloned.text()).slice(0, 200);
        } catch {
          // ignore
        }
        const detail = rawPreview ? ` [${rawPreview}]` : "";
        throw new OtpApiError("otp_bad_response", `استجابة غير صالحة من خادم التحقق${detail}`);
      }

      if (!response.ok || payload?.success === false) {
        const code =
          payload?.code ||
          (response.status === 401 ? "app_check_failed" : response.status === 429 ? "rate_limited" : "server_error");
        const message = payload?.message || `OTP request failed (${response.status})`;
        const rawRetry = payload?.retryAfterSeconds;
        const retryAfterSeconds =
          typeof rawRetry === "number" && Number.isFinite(rawRetry) && rawRetry > 0
            ? Math.floor(rawRetry)
            : undefined;
        throw new OtpApiError(code, message, retryAfterSeconds);
      }

      return payload;
    } catch (e: unknown) {
      const err = e instanceof OtpApiError ? e : new OtpApiError("server_error", String(e));
      if (err.code === "otp_server_unreachable" || err.code === "otp_timeout") {
        lastNetworkError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastNetworkError) throw lastNetworkError;
  throw new OtpApiError("server_error", "تعذر تنفيذ طلب التحقق");
}

export async function sendOtpRequest(phone: string): Promise<{ requestId?: string }> {
  const payload = await requestOtp("/api/auth/send-otp", { phone });
  return { requestId: payload?.requestId };
}

export async function verifyOtpRequest(
  phone: string,
  code: string,
  _requestId?: string
): Promise<{ verified: boolean; token?: string; user?: Record<string, unknown> }> {
  const base = (process.env.EXPO_PUBLIC_OTP_API_URL || process.env.EXPO_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  const url = `${base}/api/auth/verify-otp`;
  console.log("VERIFY OTP URL =", url, { phone, code });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code })
  });
  const payload = await response.json() as OtpServerResponse;
  if (!response.ok || payload?.success === false) {
    throw new OtpApiError(payload?.code || "server_error", payload?.message || `verify failed (${response.status})`);
  }
  return {
    verified: payload?.verified === true,
    token: payload?.token,
    user: payload?.user
  };
}

export { OTP_TIMEOUT_MS, OTP_SEND_TIMEOUT_MS };
