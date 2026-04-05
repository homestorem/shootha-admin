import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebase";
import { isFirebaseConfigured } from "../config/firebaseConfig";

export const FIELD_REQUESTS_COLLECTION = "field_requests" as const;

/** بيانات من النموذج + هوية المالك من الجلسة (بدون إدخال يدوي لـ ownerId) */
export type SubmitFieldRequestInput = {
  fieldName: string;
  location: string;
  notes?: string;
  ownerId: string;
  /** نفس قيمة هوية المالك في النظام؛ تُعرض للمستخدم للقراءة فقط وتُحفظ مع الطلب */
  ownerAccountId: string;
  userUid: string;
  ownerName: string;
  phone: string;
};

export type SubmitFieldRequestResult = {
  id: string;
};

export type FieldRequestValidationField =
  | "fieldName"
  | "location"
  | "ownerId"
  | "ownerAccountId"
  | "userUid"
  | "ownerName"
  | "phone";

export function validateFieldRequestInput(input: SubmitFieldRequestInput): FieldRequestValidationField | null {
  if (!input.fieldName?.trim()) return "fieldName";
  if (!input.location?.trim()) return "location";
  if (!input.ownerId?.trim()) return "ownerId";
  if (!input.ownerAccountId?.trim()) return "ownerAccountId";
  if (!input.userUid?.trim()) return "userUid";
  if (!input.ownerName?.trim()) return "ownerName";
  if (!input.phone?.trim()) return "phone";
  return null;
}

export async function submitFieldRequest(input: SubmitFieldRequestInput): Promise<SubmitFieldRequestResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }

  const invalid = validateFieldRequestInput(input);
  if (invalid) {
    throw new Error(`VALIDATION:${invalid}`);
  }

  const db = getFirestoreDb();
  const docRef = await addDoc(collection(db, FIELD_REQUESTS_COLLECTION), {
    fieldName: input.fieldName.trim(),
    location: input.location.trim(),
    notes: input.notes?.trim() ?? "",
    ownerId: input.ownerId.trim(),
    ownerAccountId: input.ownerAccountId.trim(),
    userUid: input.userUid.trim(),
    ownerName: input.ownerName.trim(),
    phone: input.phone.trim(),
    status: "pending" as const,
    approvalNoticeRead: false,
    createdAt: serverTimestamp()
  });

  return { id: docRef.id };
}
