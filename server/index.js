const path = require("path");
// Resolve `.env` from repo root so startup works even if cwd is not the project root.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { OTPiqClient } = require("otpiq");

const app = express();

(function configureTrustProxy() {
  const raw = String(process.env.TRUST_PROXY_HOPS ?? "").trim();
  let hops = null;
  if (raw !== "") {
    const n = Number(raw);
    hops = Number.isFinite(n) && n >= 0 ? n : 0;
  } else {
    hops = process.env.NODE_ENV === "production" ? 1 : 0;
  }
  if (hops > 0) app.set("trust proxy", hops);
})();
const PORT = Number(process.env.PORT || 4000);
const OTP_IQ_API_KEY = (process.env.OTP_IQ_API_KEY || "").trim();
const NOTIFICATION_API_KEY = (process.env.NOTIFICATION_API_KEY || "").trim();
const OTP_TEST_MODE = process.env.OTP_TEST_MODE === "1";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const otpClient = OTP_IQ_API_KEY ? new OTPiqClient({ apiKey: OTP_IQ_API_KEY }) : null;

function assertOtpServerEnv() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!OTP_IQ_API_KEY) {
      console.warn("[otp-server] OTP_IQ_API_KEY not set — OTP sending will fail at runtime.");
    }
    if (!NOTIFICATION_API_KEY) {
      console.warn("[otp-server] NOTIFICATION_API_KEY not set — /send-notification endpoint will be disabled.");
    }
    if (!(process.env.CORS_ORIGINS || "").trim()) {
      console.warn("[otp-server] CORS_ORIGINS not set — browser requests will be blocked, mobile requests are unaffected.");
    }
  }
}
assertOtpServerEnv();

const codeStore = new Map();
const CODE_TTL_MS = 5 * 60 * 1000;

/** IP -> { successCount: number, lockUntil: number } */
const DEVICE_OTP_MAX_SENDS = 3;
const DEVICE_OTP_LOCKOUT_MS = 60 * 60 * 1000;
const deviceOtpSendGuard = new Map();

/** phone (E.164) -> timestamps (ms) of POST /api/auth/* within sliding 1 min window */
const phoneOtpRouteHits = new Map();
const PHONE_OTP_ROUTE_WINDOW_MS = 60 * 1000;
const PHONE_OTP_ROUTE_MAX_PER_WINDOW = 10;

function getFirebaseAdminDb() {
  const json = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!json) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  }
  return admin.firestore();
}

function isExpoPushToken(value) {
  return /^ExponentPushToken\[[^\]]+\]$/.test(String(value || "").trim());
}

function getDeviceSendGuard(ip) {
  let g = deviceOtpSendGuard.get(ip);
  if (!g) {
    g = { successCount: 0, lockUntil: 0 };
    deviceOtpSendGuard.set(ip, g);
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

function verifyNotificationApiKey(req, res, next) {
  if (!NOTIFICATION_API_KEY) {
    // Keep dev ergonomics when the key is not configured.
    if (process.env.NODE_ENV !== "production") return next();
    return res.status(500).json({
      success: false,
      code: "server_misconfigured",
      message: "NOTIFICATION_API_KEY is not configured."
    });
  }
  const provided = String(req.get("x-api-key") || "").trim();
  if (!provided || provided !== NOTIFICATION_API_KEY) {
    return res.status(401).json({
      success: false,
      code: "unauthorized",
      message: "Invalid API key."
    });
  }
  return next();
}

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 999,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, code: "rate_limited", message: "Too many attempts. Please try again later." });
  }
});

app.use("/api/auth", verifyOtpAppCheckToken);
app.use("/api/auth", otpLimiter);
app.use("/api/auth", otpPhoneRouteRateLimit);

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
  return String(crypto.randomInt(1000, 10000));
}

async function sendViaProvider(phone) {
  if (OTP_TEST_MODE) {
    const testCode = generateOtpCode();
    console.log(`[otp-server] TEST MODE — code for ${phone}: ${testCode}`);
    return { success: true, code: testCode };
  }
  if (!otpClient) {
    return { success: false, code: "missing_api_key", message: "OTP_IQ_API_KEY is missing." };
  }
  try {
    const payload = await otpClient.sendSMS({
      phoneNumber: phone.replace("+", ""),
      smsType: "verification",
      digitCount: 4,
      provider: "auto"
    });
    // Use verificationCode from SDK response — this is the actual code OTPiq sent
    const actualCode = payload?.verificationCode || null;
    return { success: true, code: actualCode, payload };
  } catch (error) {
    const normalized = normalizeProviderErrorMessage(error, "OTP provider request failed");
    return { success: false, ...normalized };
  }
}

app.post("/api/auth/send-otp", async (req, res) => {
  const phone = String(req.body?.phone || "").trim();
  if (!isValidE164(phone)) {
    return res.status(400).json({ success: false, code: "invalid_phone_format", message: "Invalid phone format." });
  }
  if (!OTP_TEST_MODE && !OTP_IQ_API_KEY) {
    return res.status(500).json({ success: false, code: "missing_api_key", message: "OTP_IQ_API_KEY is missing." });
  }

  const clientIp = req.ip || "unknown";
  const guard = getDeviceSendGuard(clientIp);
  if (!OTP_TEST_MODE && guard.lockUntil > Date.now()) {
    const retryAfterSeconds = Math.max(1, Math.ceil((guard.lockUntil - Date.now()) / 1000));
    return res.status(429).json({
      success: false,
      code: "otp_send_locked",
      message: "Device blocked. Try again later.",
      retryAfterSeconds
    });
  }

  try {
    const provider = await sendViaProvider(phone);
    if (!provider?.success) {
      return res.status(400).json({ success: false, code: provider?.code, message: provider?.message });
    }

    guard.successCount += 1;
    if (guard.successCount >= DEVICE_OTP_MAX_SENDS) {
      guard.lockUntil = Date.now() + DEVICE_OTP_LOCKOUT_MS;
    }
    deviceOtpSendGuard.set(clientIp, guard);

    if (provider?.code) {
      codeStore.set(phone, {
        phone,
        code: String(provider.code),
        expiresAt: Date.now() + CODE_TTL_MS
      });
    }

    return res.json({ success: true, requestId: phone, message: "OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "server_error",
      message: String(error?.message || "OTP send failed")
    });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
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

app.post("/send-notification", verifyNotificationApiKey, async (req, res) => {
  try {
    const userId = String(req.body?.userId || "").trim();
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const data = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        code: "invalid_payload",
        message: "userId, title, body are required."
      });
    }

    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, code: "user_not_found", message: "User not found." });
    }

    const userData = userSnap.data() || {};
    const pushToken = String(userData.pushToken || "").trim();
    if (!isExpoPushToken(pushToken)) {
      return res.status(400).json({
        success: false,
        code: "invalid_push_token",
        message: "Missing or invalid Expo push token for this user."
      });
    }

    const payload = {
      to: pushToken,
      title,
      body,
      sound: "default",
      priority: "high",
      channelId: "default",
      data
    };

    const expoResp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const expoJson = await expoResp.json().catch(() => ({}));
    const item = Array.isArray(expoJson?.data) ? expoJson.data[0] : expoJson?.data;
    const itemError = item?.status === "error" ? item?.details?.error || item?.message : null;

    if (itemError === "DeviceNotRegistered") {
      await userRef.set(
        {
          pushToken: null,
          pushTokenInvalidAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    if (!expoResp.ok || item?.status === "error") {
      return res.status(502).json({
        success: false,
        code: "expo_push_failed",
        message: itemError || "Failed to send push notification.",
        expo: expoJson
      });
    }

    return res.json({
      success: true,
      expo: expoJson
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: "server_error",
      message: String(error?.message || "send-notification failed")
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ success: false, code: "not_found", message: `Cannot ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("[otp-server] unhandled error:", err?.message || err);
  res.status(500).json({ success: false, code: "server_error", message: err?.message || "Internal server error" });
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
