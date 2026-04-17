/**
 * سجل «إجراءات أصحاب الملاعب» — مجموعة append-only في Firestore لمراجعة إدارة الحجوزات.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Toast from "react-native-toast-message";
import { getFirestoreDb, getFirebaseAuth } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { deriveOwnerIdFromUid } from "../lib/ownerId";

/** يمنع تكرار تنبيه «انشر القواعد» في نفس جلسة التطبيق */
let permissionDeniedToastShown = false;

export const OWNER_FIELD_ACTIONS_COLLECTION = "owner_field_actions" as const;

/** مفتاح ثابت لقواعد الأمان والفلترة البرمجية */
export const OWNER_FIELD_ACTION_CATEGORY_KEY = "owner_field_actions" as const;

/** عنوان المجموعة كما يظهر للإدارة في Firebase */
export const OWNER_FIELD_ACTION_CATEGORY_LABEL_AR = "إجراءات أصحاب الملاعب" as const;

export type OwnerFieldActionKind =
  | "booking_created"
  | "booking_updated"
  | "booking_deleted"
  | "booking_status_changed"
  | "attendance_set";

export type OwnerFieldActionSource = "owner_bookings" | "bookings";

type AppendInput = {
  ownerUid: string;
  ownerPublicId?: string | null;
  action: OwnerFieldActionKind;
  sourceCollection: OwnerFieldActionSource;
  targetId: string;
  targetUiId?: string | null;
  summary?: string;
  meta?: Record<string, unknown>;
};

function sanitizeMeta(m?: Record<string, unknown>): Record<string, unknown> | null {
  if (!m || typeof m !== "object") return null;
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [k, v] of Object.entries(m)) {
    if (n >= 14) break;
    const key = k.slice(0, 48);
    if (typeof v === "string") out[key] = v.slice(0, 240);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    else if (v === null) out[key] = null;
    n++;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * يسجّل إجراءً دون انتظار — أخطاء الكتابة لا تُعاد للمستخدم حتى لا تُفسد مسار الحجز.
 */
export function appendOwnerFieldActionLog(input: AppendInput): void {
  if (!isFirebaseConfigured()) return;
  const uid = input.ownerUid.trim() || getFirebaseAuth().currentUser?.uid?.trim();
  if (!uid) return;
  const ownerPublicId =
    (input.ownerPublicId && String(input.ownerPublicId).trim()) || deriveOwnerIdFromUid(uid);

  void (async () => {
    try {
      const db = getFirestoreDb();
      const payload: Record<string, unknown> = {
        ownerUid: uid,
        ownerPublicId,
        categoryKey: OWNER_FIELD_ACTION_CATEGORY_KEY,
        categoryLabelAr: OWNER_FIELD_ACTION_CATEGORY_LABEL_AR,
        action: input.action,
        sourceCollection: input.sourceCollection,
        targetId: input.targetId,
        summary: (input.summary ?? "").slice(0, 400),
        createdAt: serverTimestamp()
      };
      const ui = input.targetUiId?.trim();
      if (ui) payload.targetUiId = ui;
      const meta = sanitizeMeta(input.meta);
      if (meta) payload.meta = meta;

      await addDoc(collection(db, OWNER_FIELD_ACTIONS_COLLECTION), payload);
    } catch (e: unknown) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[owner_field_actions] write failed:", code || "unknown", msg);

      if (code === "permission-denied" && !permissionDeniedToastShown) {
        permissionDeniedToastShown = true;
        Toast.show({
          type: "error",
          text1: "تعذّر حفظ سجل إجراءات المالك",
          text2: "انشر قواعد Firestore للمشروع (owner_field_actions). من المجلد: npx firebase deploy --only firestore:rules"
        });
      }
    }
  })();
}
