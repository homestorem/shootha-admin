import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import dayjs from "../lib/dayjs";
import { getFirestoreDb } from "../lib/firebase";
import { isFirebaseConfigured } from "../config/firebaseConfig";

/** مجموعة `bookings` كما تكتبها لوحة التحكم (ownerId = owner_...) */
export const VENUE_BOOKINGS_COLLECTION = "bookings" as const;

export const VENUE_BOOKING_ID_PREFIX = "vb:" as const;

/** حجز يدوي من تطبيق المالك — يُزامَن مع الداشبورد/تطبيق اللاعب */
export const SYNC_SOURCE_OWNER_APP = "owner_app" as const;

export type VenueBookingDoc = {
  id: string;
  ownerId: string;
  date: string;
  startTime: string;
  duration: number;
  venueId: string;
  venueName: string;
  fieldSize?: string;
  playerName?: string;
  playerUserId?: string;
  phone?: string;
  paymentMethod?: string;
  price?: number;
  totalPrice?: number;
  status?: string;
  createdAt?: unknown;
  syncSource?: string;
  /** مرجع مستند owner_bookings عند المزامنة من التطبيق */
  ownerBookingId?: string;
  isSettled?: boolean;
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

export function parseVenueBookingUiId(uiId: string): string | null {
  if (!uiId.startsWith(VENUE_BOOKING_ID_PREFIX)) return null;
  const rest = uiId.slice(VENUE_BOOKING_ID_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

/** إن كانت المدة ≤ 24 تُعامل كساعات، وإلا كدقائق */
export function endTimeFromDuration(date: string, startTime: string, duration: number): string {
  const [h, mi] = startTime.split(":").map((x) => parseInt(x, 10));
  const base = dayjs(`${date}T${String(h || 0).padStart(2, "0")}:${String(mi || 0).padStart(2, "0")}:00`);
  const minutesToAdd = duration > 24 ? Math.round(duration) : Math.round(duration * 60);
  return base.add(minutesToAdd, "minute").format("HH:mm");
}

export function normalizeHm(t: string): string {
  const p = t.split(":");
  if (p.length >= 2) return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}`;
  return t;
}

export async function fetchVenueBookingsForOwner(ownerPublicId: string): Promise<VenueBookingDoc[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(
      collection(db, VENUE_BOOKINGS_COLLECTION),
      where("ownerId", "==", ownerPublicId),
      limit(200)
    )
  );
  const rows: VenueBookingDoc[] = [];
  snap.forEach((d) => {
    const x = d.data() as Record<string, unknown>;
    rows.push({
      id: d.id,
      ownerId: str(x.ownerId),
      date: str(x.date),
      startTime: normalizeHm(str(x.startTime)),
      duration: num(x.duration, 1),
      venueId: str(x.venueId),
      venueName: str(x.venueName),
      fieldSize: x.fieldSize != null ? str(x.fieldSize) : undefined,
      playerName: x.playerName != null ? str(x.playerName) : undefined,
      playerUserId: x.playerUserId != null ? str(x.playerUserId) : undefined,
      phone: x.phone != null ? str(x.phone) : undefined,
      paymentMethod: x.paymentMethod != null ? str(x.paymentMethod) : undefined,
      price: x.price != null ? num(x.price) : undefined,
      totalPrice: x.totalPrice != null ? num(x.totalPrice) : undefined,
      status: x.status != null ? str(x.status) : undefined,
      createdAt: x.createdAt,
      syncSource: x.syncSource != null ? str(x.syncSource) : undefined,
      ownerBookingId: x.ownerBookingId != null ? str(x.ownerBookingId) : undefined,
      isSettled: x.settledAt != null
    });
  });
  rows.sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  return rows;
}

export type UpdateVenueBookingInput = {
  date?: string;
  startTime?: string;
  duration?: number;
  venueName?: string;
  venueId?: string;
  fieldSize?: string;
  playerName?: string;
  phone?: string;
  paymentMethod?: string;
  price?: number;
  totalPrice?: number;
  status?: string;
};

export async function updateVenueBookingDoc(bookingDocId: string, patch: UpdateVenueBookingInput): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.date != null) clean.date = patch.date;
  if (patch.startTime != null) clean.startTime = patch.startTime;
  if (patch.duration != null) clean.duration = patch.duration;
  if (patch.venueName != null) clean.venueName = patch.venueName;
  if (patch.venueId != null) clean.venueId = patch.venueId;
  if (patch.fieldSize != null) clean.fieldSize = patch.fieldSize;
  if (patch.playerName != null) clean.playerName = patch.playerName;
  if (patch.phone != null) clean.phone = patch.phone;
  if (patch.paymentMethod != null) clean.paymentMethod = patch.paymentMethod;
  if (patch.price != null) clean.price = patch.price;
  if (patch.totalPrice != null) clean.totalPrice = patch.totalPrice;
  if (patch.status != null) clean.status = patch.status;
  await updateDoc(doc(db, VENUE_BOOKINGS_COLLECTION, bookingDocId), clean);
}

export async function deleteVenueBookingDoc(bookingDocId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  await deleteDoc(doc(db, VENUE_BOOKINGS_COLLECTION, bookingDocId));
}

export async function updateVenueBookingStatus(bookingDocId: string, status: string): Promise<void> {
  await updateVenueBookingDoc(bookingDocId, { status });
}

/**
 * تحويل دقائق الحجز في التطبيق إلى حقل duration في bookings (≤٢٤ = ساعات، وإلا دقائق).
 */
export function durationMinutesToDashboardDuration(minutes: number): number {
  const m = Math.max(1, Math.round(minutes));
  if (m % 60 === 0) {
    const h = m / 60;
    if (h >= 1 && h <= 24) return h;
  }
  return m;
}

export function mapOwnerStatusToVenueStatus(status: string): string {
  const s = String(status ?? "").toLowerCase();
  if (s === "approved") return "confirmed";
  if (s === "pending") return "pending";
  if (s === "rejected" || s === "cancelled") return s;
  return status || "confirmed";
}

export type OwnerBookingLikeForMirror = {
  fieldId: string;
  fieldName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  source: string;
  playerName?: string | null;
};

/** حقول مستند bookings لمزامنة حجز يدوي من التطبيق */
export function buildOwnerAppMirrorFields(
  ownerBookingDocId: string,
  ownerPublicId: string,
  o: OwnerBookingLikeForMirror
): Record<string, unknown> {
  return {
    ownerId: ownerPublicId,
    ownerBookingId: ownerBookingDocId,
    syncSource: SYNC_SOURCE_OWNER_APP,
    date: o.date,
    startTime: normalizeHm(o.startTime),
    duration: durationMinutesToDashboardDuration(o.durationMinutes),
    venueId: o.fieldId,
    venueName: o.fieldName,
    playerName: o.source === "player" ? (o.playerName?.trim() || null) : "حجز يدوي (مالك)",
    totalPrice: o.totalPrice,
    price: o.totalPrice,
    status: mapOwnerStatusToVenueStatus(o.status),
    paymentMethod: "owner_manual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

export async function syncVenueMirrorFromOwnerBooking(
  mirrorBookingDocId: string,
  o: OwnerBookingLikeForMirror
): Promise<void> {
  await updateVenueBookingDoc(mirrorBookingDocId, {
    date: o.date,
    startTime: normalizeHm(o.startTime),
    duration: durationMinutesToDashboardDuration(o.durationMinutes),
    venueName: o.fieldName,
    venueId: o.fieldId,
    totalPrice: o.totalPrice,
    price: o.totalPrice,
    status: mapOwnerStatusToVenueStatus(o.status),
    playerName: o.source === "player" ? (o.playerName?.trim() || undefined) : "حجز يدوي (مالك)"
  });
}
