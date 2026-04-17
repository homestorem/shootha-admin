/**
 * «مالية الملاعب» — سجل مالي في Firestore لكل حركة (مع اسم ومعرّف صاحب الحساب).
 * المجموعة: `field_finances` — مستند لكل حركة: docId = `${ownerUid}__${entryId}`.
 */
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import type { AccountEntry } from "./accountsStore";

export const FIELD_FINANCES_COLLECTION = "field_finances" as const;

export type FieldFinanceLedgerRow = {
  id: string;
  ownerUid: string;
  ownerPublicId: string | null;
  personId: string;
  personName: string;
  entryId: string;
  kind: string;
  amount: number;
  note: string;
  at: string;
  category: string | null;
  linkedBookingId: string | null;
  durationHours: number | null;
  pricePerHour: number | null;
};

function parseRow(id: string, data: Record<string, unknown>): FieldFinanceLedgerRow {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    ownerPublicId: typeof data.ownerPublicId === "string" ? data.ownerPublicId : null,
    personId: String(data.personId ?? ""),
    personName: String(data.personName ?? "—"),
    entryId: String(data.entryId ?? ""),
    kind: String(data.kind ?? ""),
    amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
    note: String(data.note ?? ""),
    at: typeof data.at === "string" ? data.at : new Date(0).toISOString(),
    category: typeof data.category === "string" ? data.category : null,
    linkedBookingId: typeof data.linkedBookingId === "string" ? data.linkedBookingId : null,
    durationHours: typeof data.durationHours === "number" ? data.durationHours : null,
    pricePerHour: typeof data.pricePerHour === "number" ? data.pricePerHour : null
  };
}

export async function upsertFieldFinanceLedgerEntry(input: {
  ownerUid: string;
  ownerPublicId?: string | null;
  personId: string;
  personName: string;
  entry: AccountEntry;
}): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const ownerUid = input.ownerUid.trim();
  if (!ownerUid || !input.entry?.id) return;

  const docId = `${ownerUid}__${input.entry.id}`;
  const e = input.entry;
  await setDoc(
    doc(db, FIELD_FINANCES_COLLECTION, docId),
    {
      ownerUid,
      ownerPublicId: input.ownerPublicId?.trim() || null,
      personId: input.personId.trim(),
      personName: (input.personName || "—").trim() || "—",
      entryId: e.id,
      kind: e.kind,
      amount: e.amount,
      note: e.note ?? "",
      at: e.at,
      category: e.category ?? null,
      linkedBookingId: e.linkedBookingId ?? null,
      durationHours: e.durationHours ?? null,
      pricePerHour: e.pricePerHour ?? null,
      uploadedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/** جلب سجل «مالية الملاعب» من السحابة (بدون orderBy لتفادي الحاجة لفهرس مركّب — ترتيب محلياً). */
export async function fetchFieldFinanceLedger(ownerUid: string, max = 80): Promise<FieldFinanceLedgerRow[]> {
  if (!isFirebaseConfigured()) return [];
  const uid = ownerUid.trim();
  if (!uid) return [];

  const db = getFirestoreDb();
  const q = query(collection(db, FIELD_FINANCES_COLLECTION), where("ownerUid", "==", uid), limit(120));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => parseRow(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  return rows.slice(0, max);
}

export async function backfillLocalEntriesToCloud(input: {
  ownerUid: string;
  ownerPublicId?: string | null;
  personId: string;
  personName: string;
  entries: AccountEntry[];
}): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const list = input.entries.slice(0, 100);
  await Promise.all(
    list.map((entry) =>
      upsertFieldFinanceLedgerEntry({
        ownerUid: input.ownerUid,
        ownerPublicId: input.ownerPublicId,
        personId: input.personId,
        personName: input.personName,
        entry
      }).catch(() => undefined)
    )
  );
}
