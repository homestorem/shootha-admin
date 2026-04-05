import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebase";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { FIELD_REQUESTS_COLLECTION } from "./fieldRequestService";
import { fetchDashboardVenuesForOwner, type DashboardVenueDoc } from "./dashboardVenuesFirestore";

export const OWNER_FIELDS_COLLECTION = "owner_fields" as const;

export type FieldOperationalStatus = "open" | "closed" | "maintenance";

export type OwnerFieldDoc = {
  id: string;
  ownerUid: string;
  name: string;
  location?: string;
  status: FieldOperationalStatus;
  fieldRequestId?: string | null;
  createdAt?: unknown;
  /** من مجموعة الداشبورد (venues / …) */
  source?: "app" | "dashboard";
  fieldSize?: string;
};

function normalizeReqStatus(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isApproved(s: string): boolean {
  return (
    s === "approved" ||
    s === "accepted" ||
    s === "مقبول" ||
    s === "تم القبول" ||
    s === "تم الموافقة"
  );
}

export async function fetchOwnerFieldsForUid(ownerUid: string): Promise<OwnerFieldDoc[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirestoreDb();
  const q = query(collection(db, OWNER_FIELDS_COLLECTION), where("ownerUid", "==", ownerUid), limit(80));
  const snap = await getDocs(q);
  const list: OwnerFieldDoc[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const st = (data.status as FieldOperationalStatus) || "open";
    list.push({
      id: d.id,
      ownerUid: String(data.ownerUid ?? ""),
      name: String(data.name ?? ""),
      location: typeof data.location === "string" ? data.location : undefined,
      status: st === "closed" || st === "maintenance" ? st : "open",
      fieldRequestId: typeof data.fieldRequestId === "string" ? data.fieldRequestId : null
    });
  });
  list.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return list;
}

function normDashStatus(s: string): string {
  return s.trim().toLowerCase();
}

function mapDashboardStatusToOperational(status: string | undefined): FieldOperationalStatus {
  if (status == null || !String(status).trim()) return "open";
  const n = normDashStatus(status);
  if (n === "rejected" || n === "مرفوض" || n === "disabled" || n === "معطل") return "closed";
  if (n === "pending" || n === "بالانتظار" || n === "review") return "maintenance";
  if (
    n === "approved" ||
    n === "accepted" ||
    n === "active" ||
    n === "مقبول" ||
    n === "نشط"
  ) {
    return "open";
  }
  return "maintenance";
}

function dashboardVenueToOwnerFieldDoc(d: DashboardVenueDoc, ownerPublicId: string): OwnerFieldDoc {
  const loc = [d.address, d.location].filter(Boolean).join(" — ") || undefined;
  return {
    id: d.id,
    ownerUid: ownerPublicId,
    name: d.name,
    location: loc,
    status: mapDashboardStatusToOperational(d.status),
    fieldRequestId: null,
    source: "dashboard",
    fieldSize: d.field_size
  };
}

/**
 * ملاعب `owner_fields` + ملاعب الداشبورد حيث ownerId يطابق المالك.
 */
export async function fetchMergedFieldsForUid(ownerUid: string, ownerPublicId: string): Promise<OwnerFieldDoc[]> {
  await ensureOwnerFieldsFromApprovedRequests(ownerUid);
  const [local, remote] = await Promise.all([
    fetchOwnerFieldsForUid(ownerUid),
    fetchDashboardVenuesForOwner(ownerPublicId)
  ]);
  const remoteRows = remote.map((d) => dashboardVenueToOwnerFieldDoc(d, ownerPublicId));
  const localRows = local.map((f) => ({ ...f, source: "app" as const }));
  const merged = [...remoteRows, ...localRows];
  merged.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return merged;
}

export async function setOwnerFieldStatus(fieldId: string, status: FieldOperationalStatus): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  await updateDoc(doc(db, OWNER_FIELDS_COLLECTION, fieldId), {
    status,
    updatedAt: serverTimestamp()
  });
}

/**
 * يُنشئ مستندات ملعب لكل طلب مقبول لا يملك ملعباً بعد (يظهر الملعب بعد قبول الإدارة).
 */
export async function ensureOwnerFieldsFromApprovedRequests(ownerUid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();

  const [reqSnap, fieldsSnap] = await Promise.all([
    getDocs(
      query(collection(db, FIELD_REQUESTS_COLLECTION), where("userUid", "==", ownerUid), limit(80))
    ),
    getDocs(query(collection(db, OWNER_FIELDS_COLLECTION), where("ownerUid", "==", ownerUid), limit(80)))
  ]);

  const linked = new Set<string>();
  fieldsSnap.forEach((d) => {
    const fr = d.data().fieldRequestId;
    if (typeof fr === "string" && fr) linked.add(fr);
  });

  const creates: Promise<unknown>[] = [];
  reqSnap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (!isApproved(normalizeReqStatus(data.status))) return;
    if (linked.has(d.id)) return;
    const name = String(data.fieldName ?? "").trim();
    if (!name) return;
    creates.push(
      addDoc(collection(db, OWNER_FIELDS_COLLECTION), {
        ownerUid,
        name,
        location: String(data.location ?? "").trim() || null,
        status: "open" as const,
        fieldRequestId: d.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
  });

  if (creates.length) await Promise.all(creates);
}
