/**
 * رسائل دردشة الدعم — `users/{uid}/support_messages/{id}`.
 * يرسل المالك برسائل sender=owner؛ ردود الفريق تُضاف من لوحة Firebase أو Admin SDK (sender=support).
 */
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type FirestoreError,
  type Timestamp
} from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";

export type SupportChatSender = "owner" | "support";

export type SupportChatMessage = {
  id: string;
  text: string;
  sender: SupportChatSender;
  createdAt: Timestamp | null;
};

function messagesCol(db: ReturnType<typeof getFirestoreDb>, uid: string) {
  return collection(db, "users", uid, "support_messages");
}

function normalizeSender(raw: unknown): SupportChatSender {
  return raw === "owner" ? "owner" : "support";
}

function mapDoc(id: string, data: Record<string, unknown>): SupportChatMessage {
  const text = typeof data.text === "string" ? data.text : "";
  return {
    id,
    text,
    sender: normalizeSender(data.sender),
    createdAt: (data.createdAt as Timestamp | undefined) ?? null
  };
}

/**
 * الاستماع لكل الرسائل (صادرة وواردة) — بدون تصفية على sender.
 */
export function subscribeSupportChatMessages(
  uid: string,
  onNext: (rows: SupportChatMessage[]) => void,
  onError?: (e: FirestoreError) => void
): () => void {
  if (!isFirebaseConfigured() || !uid) {
    onNext([]);
    return () => {};
  }
  const db = getFirestoreDb();
  const q = query(messagesCol(db, uid), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const rows: SupportChatMessage[] = [];
      snap.forEach((d) => {
        rows.push(mapDoc(d.id, d.data() as Record<string, unknown>));
      });
      onNext(rows);
    },
    (err) => {
      console.warn("[support_chat]", err.code, err.message);
      onError?.(err);
    }
  );
}

export async function sendOwnerSupportMessage(uid: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || !isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  await addDoc(messagesCol(db, uid), {
    text: trimmed,
    sender: "owner" as const,
    createdAt: serverTimestamp()
  });
}
