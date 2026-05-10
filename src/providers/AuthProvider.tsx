import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import type { AuthSession, AuthUser } from "../lib/authTypes";
import {
  getFirebaseAuth,
  getFirestoreDb,
  firebaseSignOut,
  onAuthStateChanged,
  ensureUserProfile,
  updateUserLanguage,
  isFirebaseConfigured
} from "../lib/firebaseClient";
import { DEFAULT_DIAL_CODE, digitsOnly, e164FromOtpLoginEmail } from "../lib/phoneDial";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { t } from "../strings";
import { translate } from "../i18n";
import { useSettings } from "./SettingsProvider";
import { OtpApiError, sendOtpRequest, verifyOtpRequest } from "../lib/otpApi";

function normalizeLocalPhone(phone: string): string | null {
  let d = digitsOnly(phone);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^\d{8,12}$/.test(d)) return null;
  return d;
}

function phoneMatchesRegistered(localPhone: string, registeredPhone: string): boolean {
  const localDigits = digitsOnly(localPhone);
  const registeredDigits = digitsOnly(registeredPhone);
  if (!localDigits || !registeredDigits) return false;
  return registeredDigits === localDigits || registeredDigits.endsWith(localDigits);
}

function toE164FromLocal(localPhone: string): string {
  const localDigits = digitsOnly(localPhone);
  const dialDigits = digitsOnly(DEFAULT_DIAL_CODE);
  return `+${dialDigits}${localDigits}`;
}

type AuthContextType = {
  session: AuthSession | null;
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  firebaseReady: boolean;
  requestPhoneOtp: (
    phone: string,
    options?: { pendingRegisterDisplayName?: string | null }
  ) => Promise<{ error?: string }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error?: string }>;
  requestDeleteAccountOtp: (phoneE164: string) => Promise<{ error?: string }>;
  confirmDeleteAccountOtp: (token: string) => Promise<{ error?: string }>;
  cancelPendingDeleteAccount: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
/** أقصى عدد إرسالات ناجحة لرمز التحقق لنفس الجلسة (يتوافق مع حد الخادم) */
const OTP_MAX_SENDS = 999;
const OTP_TTL_MS = 5 * 60 * 1000;

type PendingOtpChallenge = {
  phone: string;
  requestId: string | null;
  sentAtMs: number;
  expiresAtMs: number;
  attempts: number;
  /** عدد مرات الإرسال الناجح لهذا التحدي (إرسال أولي + إعادة إرسال) */
  sendCount: number;
};

function makeOtpEmail(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `otp.${digits}@shoota.local`;
}

function makeOtpPassword(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  // Deterministic credential to keep same Firebase uid for same phone.
  return `Sh00ta!${digits}#IQ`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useSettings();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loginOtpRef = useRef<PendingOtpChallenge | null>(null);
  const deleteOtpRef = useRef<PendingOtpChallenge | null>(null);
  const registerDisplayNameRef = useRef<string | null>(null);
  const pendingVerifiedPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (!mounted) return;
      if (!fu) {
        loginOtpRef.current = null;
        deleteOtpRef.current = null;
        registerDisplayNameRef.current = null;
        setUser(null);
        setSession(null);
        setAccessToken(null);
        setLoading(false);
        return;
      }

      const regName = registerDisplayNameRef.current;
      const pendingPhone = pendingVerifiedPhoneRef.current;
      registerDisplayNameRef.current = null;
      pendingVerifiedPhoneRef.current = null;

      let fastSessionReady = false;
      try {
        const token = await fu.getIdToken();
        const displayNameEarly = regName ?? fu.displayName ?? undefined;
        const ownerIdEarly = deriveOwnerIdFromUid(fu.uid);
        const earlyUser: AuthUser = {
          id: fu.uid,
          uid: fu.uid,
          ownerId: ownerIdEarly,
          phone: pendingPhone ?? fu.phoneNumber ?? e164FromOtpLoginEmail(fu.email) ?? undefined,
          display_name: displayNameEarly,
          is_anonymous: false
        };
        setUser(earlyUser);
        setSession({ user: earlyUser, accessToken: token });
        setAccessToken(token);
        setLoading(false);
        fastSessionReady = true;

        const profile = await ensureUserProfile(fu.uid, pendingPhone ?? fu.phoneNumber ?? null, {
          displayName: regName,
          language,
          authEmail: fu.email
        });
        if (profile.language && profile.language !== language) {
          setLanguage(profile.language);
        }
        if (regName && regName.length >= 2) {
          try {
            await updateProfile(fu, { displayName: regName });
          } catch {
            /* ignore */
          }
        }

        const displayName =
          profile.displayName ?? regName ?? fu.displayName ?? undefined;
        const u: AuthUser = {
          id: fu.uid,
          uid: fu.uid,
          ownerId: profile.ownerId,
          phone: profile.phone ?? fu.phoneNumber ?? e164FromOtpLoginEmail(fu.email) ?? undefined,
          display_name: displayName,
          is_anonymous: false
        };
        setUser(u);
        setSession({ user: u, accessToken: token });
        setAccessToken(token);
      } catch (syncErr) {
        console.warn("ensureUserProfile failed, using auth-only session", syncErr);
        if (!fastSessionReady) {
          try {
            const token = await fu.getIdToken();
            const displayName = regName ?? fu.displayName ?? undefined;
            const ownerId = deriveOwnerIdFromUid(fu.uid);
            const u: AuthUser = {
              id: fu.uid,
              uid: fu.uid,
              ownerId,
              phone: pendingPhone ?? fu.phoneNumber ?? e164FromOtpLoginEmail(fu.email) ?? undefined,
              display_name: displayName,
              is_anonymous: false
            };
            setUser(u);
            setSession({ user: u, accessToken: token });
            setAccessToken(token);
          } catch {
            setUser(null);
            setSession(null);
            setAccessToken(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const uid = user?.uid;
    if (!uid) return;
    void updateUserLanguage(uid, language).catch((e) => {
      console.warn("updateUserLanguage failed", e);
    });
  }, [user?.uid, language]);

  const requestPhoneOtp = useCallback(
    async (phone: string, options?: { pendingRegisterDisplayName?: string | null }): Promise<{ error?: string }> => {
      if (options?.pendingRegisterDisplayName != null) {
        const n = options.pendingRegisterDisplayName.trim();
        registerDisplayNameRef.current = n.length >= 2 ? n : null;
      } else {
        registerDisplayNameRef.current = null;
      }

      if (!isFirebaseConfigured()) {
        return { error: "firebase_not_configured" };
      }

      const localPhone = normalizeLocalPhone(phone);
      if (!localPhone) {
        return { error: "invalid_phone_format" };
      }

      try {
        const now = Date.now();
        const e164 = toE164FromLocal(localPhone);
        const prev = loginOtpRef.current;
        if (prev && prev.phone === e164 && now - prev.sentAtMs < OTP_RESEND_SECONDS * 1000) {
          return { error: "rate_limited" };
        }
        if (prev && prev.phone === e164 && prev.sendCount >= OTP_MAX_SENDS) {
          return { error: translate(language, "auth.otpSendLocked", { hours: 1 }) };
        }
        const sent = await sendOtpRequest(e164);
        const priorSends = prev?.phone === e164 ? prev.sendCount : 0;
        loginOtpRef.current = {
          phone: e164,
          requestId: sent.requestId ?? null,
          sentAtMs: now,
          expiresAtMs: now + OTP_TTL_MS,
          attempts: 0,
          sendCount: priorSends + 1
        };
        return {};
      } catch (e: unknown) {
        console.error("requestPhoneOtp (OTP IQ)", e);
        loginOtpRef.current = null;
        if (e instanceof OtpApiError && e.code === "otp_send_locked") {
          const sec = e.retryAfterSeconds ?? 3600;
          const hours = Math.max(1, Math.ceil(sec / 3600));
          return { error: translate(language, "auth.otpSendLocked", { hours }) };
        }
        const msg = e instanceof OtpApiError ? e.message : e instanceof Error ? e.message : String(e);
        return { error: msg || "otp_iq_send_failed" };
      }
    },
    [language]
  );

  const cancelPendingDeleteAccount = useCallback(() => {
    deleteOtpRef.current = null;
  }, []);

  const requestDeleteAccountOtp = useCallback(async (phoneInput: string): Promise<{ error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { error: "firebase_not_configured" };
    }

    const localPhone = normalizeLocalPhone(phoneInput);
    if (!localPhone) {
      return { error: "invalid_phone_format" };
    }

    const registered = user?.phone ?? "";
    if (!registered) return { error: "no_user" };
    if (!phoneMatchesRegistered(localPhone, registered)) {
      return { error: "phone_mismatch" };
    }

    try {
      const now = Date.now();
      const e164 = toE164FromLocal(localPhone);
      const prev = deleteOtpRef.current;
      if (prev && prev.phone === e164 && now - prev.sentAtMs < OTP_RESEND_SECONDS * 1000) {
        return { error: "rate_limited" };
      }
      if (prev && prev.phone === e164 && prev.sendCount >= OTP_MAX_SENDS) {
        return { error: translate(language, "auth.otpSendLocked", { hours: 1 }) };
      }
      const sent = await sendOtpRequest(e164);
      const priorSends = prev?.phone === e164 ? prev.sendCount : 0;
      deleteOtpRef.current = {
        phone: e164,
        requestId: sent.requestId ?? null,
        sentAtMs: now,
        expiresAtMs: now + OTP_TTL_MS,
        attempts: 0,
        sendCount: priorSends + 1
      };
      return {};
    } catch (e: unknown) {
      deleteOtpRef.current = null;
      if (e instanceof OtpApiError && e.code === "otp_send_locked") {
        const sec = e.retryAfterSeconds ?? 3600;
        const hours = Math.max(1, Math.ceil(sec / 3600));
        return { error: translate(language, "auth.otpSendLocked", { hours }) };
      }
      const msg = e instanceof OtpApiError ? e.message : e instanceof Error ? e.message : String(e);
      return { error: msg || "otp_iq_send_failed" };
    }
  }, [user?.phone, language]);

  const confirmDeleteAccountOtp = useCallback(async (token: string): Promise<{ error?: string }> => {
    const trimmed = token.trim().replace(/\s/g, "");
    if (trimmed.length < 4) {
      return { error: "invalid_code" };
    }
    const pending = deleteOtpRef.current;
    if (!pending) {
      return { error: "no_confirmation" };
    }
    if (Date.now() > pending.expiresAtMs) {
      deleteOtpRef.current = null;
      return { error: "code_expired" };
    }
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return { error: "retry_limit_exceeded" };
    }
    deleteOtpRef.current = { ...pending, attempts: pending.attempts + 1 };
    try {
      const res = await verifyOtpRequest(pending.phone, trimmed, pending.requestId ?? undefined);
      if (!res.verified) return { error: "invalid_code" };
      deleteOtpRef.current = null;
    } catch (e: unknown) {
      if (e instanceof OtpApiError) return { error: e.code || e.message };
      return { error: "invalid_code" };
    }
    try {
      const auth = getFirebaseAuth();
      const fu = auth.currentUser;
      if (!fu) {
        return { error: "no_user_after_confirm" };
      }
      const uid = fu.uid;
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, "users", uid));
      } catch (docErr) {
        console.warn("delete user firestore doc failed", docErr);
      }
      await deleteUser(fu);
      return {};
    } catch (delErr) {
      console.warn("deleteUser failed", delErr);
      return { error: "delete_failed" };
    }
  }, []);

  const verifyPhoneOtp = useCallback(async (_phone: string, token: string): Promise<{ error?: string }> => {
    const trimmed = token.trim().replace(/\s/g, "");
    if (trimmed.length < 4) {
      return { error: "invalid_code" };
    }
    const pending = loginOtpRef.current;
    if (!pending) {
      return { error: "no_confirmation" };
    }
    if (Date.now() > pending.expiresAtMs) {
      loginOtpRef.current = null;
      return { error: "code_expired" };
    }
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return { error: "retry_limit_exceeded" };
    }
    loginOtpRef.current = { ...pending, attempts: pending.attempts + 1 };
    try {
      const check = await verifyOtpRequest(pending.phone, trimmed, pending.requestId ?? undefined);
      if (!check.verified) {
        return { error: "invalid_code" };
      }
      const auth = getFirebaseAuth();
      const email = makeOtpEmail(pending.phone);
      const password = makeOtpPassword(pending.phone);
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      }
      pendingVerifiedPhoneRef.current = pending.phone;
      loginOtpRef.current = null;
      return {};
    } catch (e: unknown) {
      if (e instanceof OtpApiError) return { error: e.code || e.message };
      return { error: "invalid_code" };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setSession(null);
      setAccessToken(null);
      return;
    }
    try {
      await firebaseSignOut(getFirebaseAuth());
    } finally {
      loginOtpRef.current = null;
      deleteOtpRef.current = null;
      registerDisplayNameRef.current = null;
      setUser(null);
      setSession(null);
      setAccessToken(null);
    }
  }, []);

  const value: AuthContextType = {
    session,
    user,
    accessToken,
    loading,
    firebaseReady: isFirebaseConfigured(),
    requestPhoneOtp,
    verifyPhoneOtp,
    requestDeleteAccountOtp,
    confirmDeleteAccountOtp,
    cancelPendingDeleteAccount,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(t.errors.useAuthContext);
  return ctx;
};
