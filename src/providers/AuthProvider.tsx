import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ConfirmationResult } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import type { AuthSession, AuthUser } from "../lib/authTypes";
import {
  getFirebaseAuth,
  signInWithPhoneNumber,
  firebaseSignOut,
  onAuthStateChanged,
  getOrCreateWebRecaptchaVerifier,
  clearWebRecaptchaVerifier,
  ensureUserProfile,
  isFirebaseConfigured
} from "../lib/firebase";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { nativeRecaptchaVerifierRef } from "../lib/firebaseRecaptchaRef";
import { Platform } from "react-native";
import { t } from "../strings";

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
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  /** يُمرَّر إلى Firestore و`updateProfile` بعد أول تسجيل بنجاح */
  const registerDisplayNameRef = useRef<string | null>(null);

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
        confirmationRef.current = null;
        registerDisplayNameRef.current = null;
        setUser(null);
        setSession(null);
        setAccessToken(null);
        setLoading(false);
        return;
      }

      const regName = registerDisplayNameRef.current;
      registerDisplayNameRef.current = null;

      try {
        const profile = await ensureUserProfile(fu.uid, fu.phoneNumber, { displayName: regName });
        if (regName && regName.length >= 2) {
          try {
            await updateProfile(fu, { displayName: regName });
          } catch {
            /* ignore */
          }
        }

        const token = await fu.getIdToken();
        const displayName =
          profile.displayName ?? regName ?? fu.displayName ?? undefined;
        const u: AuthUser = {
          id: fu.uid,
          uid: fu.uid,
          ownerId: profile.ownerId,
          phone: profile.phone ?? fu.phoneNumber ?? undefined,
          display_name: displayName,
          is_anonymous: false
        };
        setUser(u);
        setSession({ user: u, accessToken: token });
        setAccessToken(token);
      } catch (syncErr) {
        console.warn("ensureUserProfile failed, using auth-only session", syncErr);
        try {
          const token = await fu.getIdToken();
          const displayName = regName ?? fu.displayName ?? undefined;
          const ownerId = deriveOwnerIdFromUid(fu.uid);
          const u: AuthUser = {
            id: fu.uid,
            uid: fu.uid,
            ownerId,
            phone: fu.phoneNumber ?? undefined,
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
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

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

    const trimmedPhone = phone.trim();
    if (!trimmedPhone.startsWith("+")) {
      const err = new Error("Phone must be in E164 format like +9647XXXXXXXX");
      console.error("OTP ERROR FULL:", err);
      return { error: err.message };
    }

    try {
      const auth = getFirebaseAuth();
      let verifier: NonNullable<Parameters<typeof signInWithPhoneNumber>[2]>;
      if (Platform.OS === "web") {
        const wv = getOrCreateWebRecaptchaVerifier();
        if (!wv) {
          const err = new Error("recaptcha_not_ready");
          console.error("OTP ERROR FULL:", err);
          return { error: "recaptcha_not_ready" };
        }
        verifier = wv;
      } else {
        const nativeVerifier = nativeRecaptchaVerifierRef.current;
        if (!nativeVerifier) {
          const err = new Error("recaptcha_not_ready");
          console.error("OTP ERROR FULL:", err);
          return { error: "recaptcha_not_ready" };
        }
        verifier = nativeVerifier;
      }

      const cr = await signInWithPhoneNumber(auth, trimmedPhone, verifier);
      if (!cr) {
        const err = new Error("OTP_FAILED");
        console.error("OTP ERROR FULL:", err);
        if (Platform.OS === "web") clearWebRecaptchaVerifier();
        return { error: err.message };
      }
      confirmationRef.current = cr;
      return {};
    } catch (e: unknown) {
      console.error("OTP ERROR FULL:", e);
      if (Platform.OS === "web") {
        clearWebRecaptchaVerifier();
      }
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg || "send_failed" };
    }
  },
  []);

  const verifyPhoneOtp = useCallback(async (_phone: string, token: string): Promise<{ error?: string }> => {
    const trimmed = token.trim().replace(/\s/g, "");
    if (trimmed.length < 4) {
      return { error: "invalid_code" };
    }
    const cr = confirmationRef.current;
    if (!cr) {
      return { error: "no_confirmation" };
    }
    try {
      await cr.confirm(trimmed);
      confirmationRef.current = null;
      return {};
    } catch {
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
      confirmationRef.current = null;
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
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(t.errors.useAuthContext);
  return ctx;
};
