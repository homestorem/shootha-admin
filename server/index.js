require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { OTPiqClient } = require("otpiq");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const OTP_IQ_API_KEY = (process.env.OTP_IQ_API_KEY || "").trim();
const otpClient = OTP_IQ_API_KEY ? new OTPiqClient({ apiKey: OTP_IQ_API_KEY }) : null;

function assertOtpServerEnv() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!OTP_IQ_API_KEY) {
      throw new Error("[otp-server] Missing required env: OTP_IQ_API_KEY");
    }
    if (!(process.env.CORS_ORIGINS || "").trim()) {
      throw new Error("[otp-server] Missing required env: CORS_ORIGINS (comma-separated browser origins)");
    }
  }
}
assertOtpServerEnv();

const codeStore = new Map();
const CODE_TTL_MS = 5 * 60 * 1000;

/** بعد هذا العدد من عمليات الإرسال الناجحة لنفس الرقم يُمنع الإرسال لمدة ساعة */
const OTP_SEND_MAX_PER_HOUR_WINDOW = 3;
const OTP_SEND_LOCKOUT_MS = 60 * 60 * 1000;
/** phone (E.164) -> { successCount: number, lockUntil: number } */
const phoneOtpSendGuard = new Map();

/** phone (E.164) -> timestamps (ms) of POST /otp/* within sliding 1 min window */
const phoneOtpRouteHits = new Map();
const PHONE_OTP_ROUTE_WINDOW_MS = 60 * 1000;
const PHONE_OTP_ROUTE_MAX_PER_WINDOW = 5;

function getPhoneSendGuard(phone) {
  let g = phoneOtpSendGuard.get(phone);
  if (!g) {
    g = { successCount: 0, lockUntil: 0 };
    phoneOtpSendGuard.set(phone, g);
  }
  if (g.lockUntil > 0 && Date.now() >= g.lockUntil) {
    g.successCount = 0;
    g.lockUntil = 0;
  }
  return g;
}

function recordPhoneOtpRouteHit(phone) {
  const now = Date.now();
  let hits = phoneOtpRouteHits.get(phone);
  if (!hits) hits = [];
  hits = hits.filter((t) => now - t < PHONE_OTP_ROUTE_WINDOW_MS);
  if (hits.length >= PHONE_OTP_ROUTE_MAX_PER_WINDOW) {
    const oldest = hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + PHONE_OTP_ROUTE_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  hits.push(now);
  phoneOtpRouteHits.set(phone, hits);
  return { allowed: true };
}

function otpPhoneRouteRateLimit(req, res, next) {
  if (req.method !== "POST") return next();
  const phone = String(req.body?.phone || "").trim();
  if (!isValidE164(phone)) return next();
  const result = recordPhoneOtpRouteHit(phone);
  if (!result.allowed) {
    return res.status(429).json({
      success: false,
      code: "rate_limited",
      message: "Too many OTP attempts for this phone number. Try again later.",
      retryAfterSeconds: result.retryAfterSeconds
    });
  }
  next();
}

function normalizeCorsOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

/** مصادر مسموحة للمتصفح فقط؛ طلبات بدون Origin (مثل تطبيقات الموبايل) تُقبل */
const CORS_ALLOWED_ORIGINS = (() => {
  const fromEnv = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => normalizeCorsOrigin(s))
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") return [];
  return [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://127.0.0.1:8081",
    "http://localhost:5173"
  ];
})();

app.use((req, res, next) => {
  const origin = normalizeCorsOrigin(req.get("origin"));
  if (!origin) return next();
  if (CORS_ALLOWED_ORIGINS.length === 0) {
    return res.status(403).json({
      success: false,
      code: "cors_forbidden",
      message: "Browser CORS is not configured. Set CORS_ORIGINS."
    });
  }
  if (!CORS_ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ success: false, code: "cors_forbidden", message: "Origin not allowed." });
  }
  next();
});

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      if (CORS_ALLOWED_ORIGINS.includes(normalizeCorsOrigin(requestOrigin))) return callback(null, true);
      return callback(null, false);
    },
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: "1mb" }));

/** عند 1 + FIREBASE_SERVICE_ACCOUNT_JSON: التحقق من X-Firebase-AppCheck على /otp/* */
const OTP_ENFORCE_APP_CHECK = String(process.env.OTP_ENFORCE_APP_CHECK || "").trim() === "1";
let firebaseAdminAppCheck = null;
(function initFirebaseAdminForAppCheck() {
  if (!OTP_ENFORCE_APP_CHECK) return;
  const json = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!json) {
    console.warn("[otp-server] OTP_ENFORCE_APP_CHECK=1 but FIREBASE_SERVICE_ACCOUNT_JSON is empty; skipping App Check verify.");
    return;
  }
  try {
    const admin = require("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    }
    firebaseAdminAppCheck = admin.appCheck();
  } catch (e) {
    console.warn("[otp-server] firebase-admin App Check init failed:", e?.message || e);
  }
})();

async function verifyOtpAppCheckToken(req, res, next) {
  if (!firebaseAdminAppCheck) return next();
  const token = String(req.get("x-firebase-appcheck") || req.get("X-Firebase-AppCheck") || "").trim();
  if (!token) {
    return res.status(401).json({ success: false, code: "app_check_failed", message: "Missing App Check token." });
  }
  try {
    await firebaseAdminAppCheck.verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, code: "app_check_failed", message: "Invalid App Check token." });
  }
}

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { success: false, code: "rate_limited", message: "Too many attempts. Please try again later." }
});

app.use("/otp", verifyOtpAppCheckToken);
app.use("/otp", otpLimiter);
app.use("/otp", otpPhoneRouteRateLimit);

function isValidE164(phone) {
  return /^\+\d{8,15}$/.test(String(phone || "").trim());
}

function normalizeProviderErrorMessage(error, fallback) {
  const msg = error?.message || fallback || "OTP provider error";
  const lower = String(msg).toLowerCase();
  const code = lower.includes("trial mode")
    ? "trial_mode"
    : lower.includes("expired")
      ? "code_expired"
      : lower.includes("invalid")
        ? "invalid_code"
        : "provider_error";
  return { code, message: String(msg) };
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendViaProvider(phone) {
  if (!otpClient) {
    return { success: false, code: "missing_api_key", message: "OTP_IQ_API_KEY is missing." };
  }
  try {
    const generatedCode = generateOtpCode();
    const payload = await otpClient.sendSMS({
      phoneNumber: phone.replace("+", ""),
      smsType: "verification",
      digitCount: 6,
      verificationCode: generatedCode,
      provider: "auto"
    });
    const requestId = payload?.smsId || null;
    const code = generatedCode;
    return { success: true, requestId, code, payload };
  } catch (error) {
    const normalized = normalizeProviderErrorMessage(error, "OTP provider request failed");
    return { success: false, ...normalized };
  }
}

app.post("/otp/send", async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  if (!isValidE164(phone)) {
    return res.status(400).json({ success: false, code: "invalid_phone_format", message: "Invalid phone format." });
  }
  if (!OTP_IQ_API_KEY) {
    return res.status(500).json({ success: false, code: "missing_api_key", message: "OTP_IQ_API_KEY is missing." });
  }

  const guard = getPhoneSendGuard(phone);
  if (guard.lockUntil > Date.now()) {
    const retryAfterSeconds = Math.max(1, Math.ceil((guard.lockUntil - Date.now()) / 1000));
    return res.status(429).json({
      success: false,
      code: "otp_send_locked",
      message: "OTP send limit reached. Try again later.",
      retryAfterSeconds
    });
  }

  try {
    const provider = await sendViaProvider(phone);
    if (!provider?.success) {
      return res.status(400).json({ success: false, code: provider?.code, message: provider?.message });
    }

    guard.successCount += 1;
    if (guard.successCount >= OTP_SEND_MAX_PER_HOUR_WINDOW) {
      guard.lockUntil = Date.now() + OTP_SEND_LOCKOUT_MS;
    }
    phoneOtpSendGuard.set(phone, guard);

    const requestId = provider.requestId || phone;
    if (provider?.code) {
      codeStore.set(requestId, {
        phone,
        code: String(provider.code),
        expiresAt: Date.now() + CODE_TTL_MS
      });
    }

    return res.json({ success: true, requestId, message: "OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "server_error",
      message: String(error?.message || "OTP send failed")
    });
  }
});

app.post("/otp/verify", async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  const code = String(req.body?.code || "").trim();
  if (!isValidE164(phone)) {
    return res.status(400).json({ success: false, code: "invalid_phone_format", message: "Invalid phone format." });
  }
  if (!/^\d{4,6}$/.test(code)) {
    return res.status(400).json({ success: false, code: "invalid_code", message: "Invalid OTP code." });
  }

  const key = String(req.body?.requestId || phone).trim();
  const saved = codeStore.get(key);
  if (!saved) {
    return res.status(400).json({ success: false, code: "no_challenge", message: "OTP session not found." });
  }
  if (Date.now() > saved.expiresAt) {
    codeStore.delete(key);
    return res.status(400).json({ success: false, code: "code_expired", message: "OTP code expired." });
  }
  if (saved.phone !== phone || saved.code !== code) {
    return res.status(400).json({ success: false, code: "invalid_code", message: "Invalid OTP code." });
  }

  codeStore.delete(key);
  return res.json({ success: true, verified: true, token: `otp-${Date.now()}` });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[otp-server] running on http://0.0.0.0:${PORT}`);
});

server.on("error", (err) => {
  console.error("[otp-server] listen error:", err?.message || err);
});

server.on("close", () => {
  console.warn("[otp-server] server closed");
});

if (typeof server.ref === "function") {
  server.ref();
}

// Some shells/environments in Windows may detach idle event-loop refs.
// Keep one lightweight timer ref so the local dev OTP server stays alive.
setInterval(() => {}, 60 * 60 * 1000);
