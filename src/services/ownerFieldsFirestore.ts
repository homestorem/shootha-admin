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
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { FIELD_REQUESTS_COLLECTION } from "./fieldRequestService";
import { fetchDashboardVenuesForOwner, type DashboardVenueDoc } from "./dashboardVenuesFirestore";
import { extractFieldExtrasFromFirestore } from "../lib/fieldDocExtras";

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
  /** من Firestore عند توفرها (مثل تطبيق اللاعب / لوحة التحكم) */
  phone?: string;
  pricePerHour?: number;
  price60?: number;
  price90?: number;
  price120?: number;
  price180?: number;
  openHour?: number;
  closeHour?: number;
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
    const extras = extractFieldExtrasFromFirestore(data);
    const fieldSize =
      typeof data.fieldSize === "string"
        ? data.fieldSize
        : typeof data.field_size === "string"
          ? data.field_size
          : undefined;
    list.push({
      id: d.id,
      ownerUid: String(data.ownerUid ?? ""),
      name: String(data.name ?? ""),
      location: typeof data.location === "string" ? data.location : undefined,
      status: st === "closed" || st === "maintenance" ? st : "open",
      fieldRequestId: typeof data.fieldRequestId === "string" ? data.fieldRequestId : null,
      fieldSize,
      ...extras
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
    fieldSize: d.field_size,
    phone: d.phone ?? d.ownerPhone,
    pricePerHour: d.pricePerHour,
    price60: d.price60,
    price90: d.price90,
    price120: d.price120,
    price180: d.price180,
    openHour: d.openHour,
    closeHour: d.closeHour
  };
}

/**
 * ملاعب `owner_fields` + ملاعب الداشبورد حيث ownerId يطابق المالك.
 */
export async function fetchMergedFieldsForUid(ownerUid: string, ownerPublicId: string): Promise<OwnerFieldDoc[]> {
  await ensureOwnerFieldsFromApprovedRequests(ownerUid);
  const [local, remote] = await Promise.all([
    fetchOwnerFieldsForUid(ownerUid),
    fetchDashboardVenuesForOwner(ownerPublicId, ownerUid)
  ]);
  const remoteRows = remote.map((d) => dashboardVenueToOwnerFieldDoc(d, ownerPublicId));
  const normalizeName = (v: string) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-]+/g, "");
  const normalizeLoc = (v: string | undefined) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-]+/g, "");
  const hasDurationPrices = (x: Pick<OwnerFieldDoc, "price90" | "price120" | "price180">) =>
    x.price90 != null || x.price120 != null || x.price180 != null;
  const remoteByName = new Map<string, OwnerFieldDoc>();
  for (const r of remoteRows) {
    const key = normalizeName(r.name);
    if (!key) continue;
    if (!remoteByName.has(key)) remoteByName.set(key, r);
  }
  const remoteWithPrices = remoteRows.filter((r) => hasDurationPrices(r));

  const localRows = local.map((f) => {
    const key = normalizeName(f.name);
    let remoteMatch = key ? remoteByName.get(key) : undefined;
    if (!remoteMatch) {
      const locKey = normalizeLoc(f.location);
      if (locKey) {
        remoteMatch = remoteWithPrices.find((r) => normalizeLoc(r.location) === locKey);
      }
    }
    if (!remoteMatch && remoteWithPrices.length === 1) {
      remoteMatch = remoteWithPrices[0];
    }

    const needDurationPrices = !hasDurationPrices(f);
    return {
      ...f,
      source: "app" as const,
      pricePerHour: f.pricePerHour ?? remoteMatch?.pricePerHour,
      price60: f.price60 ?? remoteMatch?.price60 ?? remoteMatch?.pricePerHour,
      price90: needDurationPrices ? f.price90 ?? remoteMatch?.price90 : f.price90,
      price120: needDurationPrices ? f.price120 ?? remoteMatch?.price120 : f.price120,
      price180: needDurationPrices ? f.price180 ?? remoteMatch?.price180 : f.price180
    };
  });
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
