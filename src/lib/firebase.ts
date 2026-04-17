import {
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type ConfirmationResult
} from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { deriveOwnerIdFromUid } from "./ownerId";
import { e164FromOtpLoginEmail } from "./phoneDial";
import type { AppLanguage } from "../i18n";
import {
  firebaseConfig,
  getFirebaseApp,
  getFirebaseAuth,
  isFirebaseConfigured
} from "../../config/firebase.js";

export { firebaseConfig, getFirebaseApp, getFirebaseAuth, isFirebaseConfigured };

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

export { signInWithPhoneNumber, firebaseSignOut, onAuthStateChanged, type ConfirmationResult };

export type EnsureUserProfileOptions = {
  displayName?: string | null;
  language?: AppLanguage | null;
  /** بريد المستخدم في Firebase — يُستخرج منه الرقم إن كان بصيغة otp.*@shoota.local */
  authEmail?: string | null;
};

export type SyncedUserProfile = {
  ownerId: string;
  displayName?: string | null;
  phone?: string | null;
  language?: AppLanguage | null;
};

export async function ensureUserProfile(
  uid: string,
  phone: string | null,
  opts?: EnsureUserProfileOptions
): Promise<SyncedUserProfile> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const displayName = opts?.displayName?.trim() || null;
  const language = opts?.language ?? null;
  const ownerId = deriveOwnerIdFromUid(uid);
  const explicitPhone = phone?.trim() || null;
  const fromEmail = e164FromOtpLoginEmail(opts?.authEmail ?? null);
  const effectivePhone = explicitPhone || fromEmail;

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      ownerId,
      phone: effectivePhone ?? null,
      ...(displayName ? { displayName } : {}),
      ...(language ? { language } : {}),
      role: "owner",
      createdAt: serverTimestamp()
    });
  } else {
    const data = snap.data() as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (data.ownerId == null || data.ownerId === "") {
      patch.ownerId = ownerId;
    }
    if (data.uid == null || data.uid === "") {
      patch.uid = uid;
    }
    if (displayName) {
      patch.displayName = displayName;
    }
    if (language) {
      patch.language = language;
    }
    if (data.role == null || data.role === "") {
      patch.role = "owner";
    }
    if (effectivePhone && String(data.phone ?? "").trim() !== effectivePhone) {
      patch.phone = effectivePhone;
    }
    if (Object.keys(patch).length > 0) {
      await updateDoc(ref, patch);
    }
  }

  const finalSnap = await getDoc(ref);
  const d = finalSnap.data() as Record<string, unknown> | undefined;
  return {
    ownerId: typeof d?.ownerId === "string" ? d.ownerId : ownerId,
    displayName: (d?.displayName as string) ?? displayName ?? undefined,
    phone: (d?.phone as string) ?? effectivePhone ?? null,
    language: (d?.language as AppLanguage) ?? language ?? null
  };
}

export async function updateUserLanguage(uid: string, language: AppLanguage): Promise<void> {
  const db = getFirestoreDb();
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      language
    },
    { merge: true }
  );
}
