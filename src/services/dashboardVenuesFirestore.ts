import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebase";
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
};

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

export async function fetchDashboardVenuesForOwner(ownerPublicId: string): Promise<DashboardVenueDoc[]> {
  if (!isFirebaseConfigured() || !ownerPublicId.trim()) return [];
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(
      collection(db, DASHBOARD_VENUES_COLLECTION),
      where("ownerId", "==", ownerPublicId),
      limit(120)
    )
  );
  const rows: DashboardVenueDoc[] = [];
  snap.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    const st = x.status != null ? str(x.status) : undefined;
    if (!isApprovedForApp(st)) return;
    rows.push({
      id: d.id,
      ownerId: str(x.ownerId),
      name: str(x.name).trim() || "—",
      address: x.address != null ? str(x.address) : undefined,
      location: x.location != null ? str(x.location) : undefined,
      status: st,
      field_size: x.field_size != null ? str(x.field_size) : undefined,
      phone: x.phone != null ? str(x.phone) : undefined,
      ownerPhone: x.ownerPhone != null ? str(x.ownerPhone) : undefined
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return rows;
}
