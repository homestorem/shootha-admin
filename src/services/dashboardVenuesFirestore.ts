import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { extractFieldExtrasFromFirestore } from "../lib/fieldDocExtras";
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";

/**
 * مستندات الملاعب من لوحة التحكم (معرّف المستند = venueId في bookings).
 * إن كانت المجموعة عندك باسم `venues` غيّر القيمة أدناه.
 */
export const DASHBOARD_VENUES_COLLECTION = "fields" as const;

export type DashboardVenueDoc = {
  id: string;
  ownerId: string;
  name: string;
  address?: string;
  location?: string;
  status?: string;
  field_size?: string;
  phone?: string;
  ownerPhone?: string;
  /** حقول اختيارية من قاعدة البيانات (مثل تطبيق اللاعب) */
  pricePerHour?: number;
  price60?: number;
  price90?: number;
  price120?: number;
  price180?: number;
  openHour?: number;
  closeHour?: number;
};

function ownerIdMatches(input: { docOwnerId: string; ownerPublicId: string; ownerUid?: string }): boolean {
  const docOwnerId = input.docOwnerId.trim();
  const ownerPublicId = input.ownerPublicId.trim();
  if (!docOwnerId || !ownerPublicId) return false;
  if (docOwnerId === ownerPublicId) return true;

  const uid = (input.ownerUid ?? "").trim();
  if (!uid) return false;
  const tail = uid.length >= 6 ? uid.slice(-6) : uid;
  return docOwnerId === `owner_${tail}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function normStatus(s: string): string {
  return s.trim().toLowerCase();
}

/** يُعرض في التطبيق فقط إن وُجدت حالة مقبولة (أو بدون حقل status) */
function isApprovedForApp(status: string | undefined): boolean {
  if (status == null || !String(status).trim()) return true;
  const n = normStatus(status);
  return (
    n === "approved" ||
    n === "accepted" ||
    n === "active" ||
    n === "مقبول" ||
    n === "نشط"
  );
}

export async function fetchDashboardVenuesForOwner(ownerPublicId: string, ownerUid?: string): Promise<DashboardVenueDoc[]> {
  if (!isFirebaseConfigured() || !ownerPublicId.trim()) return [];
  const db = getFirestoreDb();
  const directSnap = await getDocs(
    query(
      collection(db, DASHBOARD_VENUES_COLLECTION),
      where("ownerId", "==", ownerPublicId),
      limit(120)
    )
  );
  // Fallback: in some docs ownerId may not exactly match the app profile value.
  const snap = directSnap.empty
    ? await getDocs(query(collection(db, DASHBOARD_VENUES_COLLECTION), limit(240)))
    : directSnap;

  const rows: DashboardVenueDoc[] = [];
  snap.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const st = x.status != null ? str(x.status) : undefined;
    if (!isApprovedForApp(st)) return;
    const docOwnerId = str(x.ownerId).trim();
    if (!ownerIdMatches({ docOwnerId, ownerPublicId, ownerUid })) return;
    const extras = extractFieldExtrasFromFirestore(x);
    rows.push({
      id: d.id,
      ownerId: docOwnerId,
      name: str(x.name).trim() || "—",
      address: x.address != null ? str(x.address) : undefined,
      location: x.location != null ? str(x.location) : undefined,
      status: st,
      field_size: x.field_size != null ? str(x.field_size) : undefined,
      phone: x.phone != null ? str(x.phone) : undefined,
      ownerPhone: x.ownerPhone != null ? str(x.ownerPhone) : undefined,
      ...extras
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return rows;
}
