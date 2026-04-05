import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebase";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import {
  buildOwnerAppMirrorFields,
  deleteVenueBookingDoc,
  endTimeFromDuration,
  SYNC_SOURCE_OWNER_APP,
  syncVenueMirrorFromOwnerBooking,
  VENUE_BOOKINGS_COLLECTION,
  type VenueBookingDoc
} from "./venueBookingsFirestore";

export const OWNER_BOOKINGS_COLLECTION = "owner_bookings" as const;

export type BookingSourceKind = "manual" | "player";

export type OwnerBookingDoc = {
  id: string;
  ownerUid: string;
  fieldId: string;
  fieldName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  source: BookingSourceKind;
  playerName?: string | null;
  playerUserId?: string | null;
  services?: string[];
  /** مستند مرآة في مجموعة bookings */
  mirrorBookingId?: string | null;
  /** تم إنهاء المباراة والتقييم */
  isSettled?: boolean;
};

export type InsertOwnerBookingInput = {
  ownerUid: string;
  fieldId: string;
  fieldName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  status?: string;
  source: BookingSourceKind;
  playerName?: string | null;
  services?: string[];
  /** لمزامنة الحجز اليدوي مع bookings (الداشبورد / تطبيق اللاعب) */
  ownerPublicId?: string;
};

export function parseOwnerBookingData(id: string, data: Record<string, unknown>): OwnerBookingDoc {
  const servicesRaw = data.services;
  const services = Array.isArray(servicesRaw)
    ? servicesRaw.filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    fieldId: String(data.fieldId ?? ""),
    fieldName: String(data.fieldName ?? ""),
    date: String(data.date ?? ""),
    startTime: String(data.startTime ?? ""),
    endTime: String(data.endTime ?? ""),
    durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 60,
    totalPrice: typeof data.totalPrice === "number" ? data.totalPrice : 0,
    status: String(data.status ?? "approved"),
    source: data.source === "player" ? "player" : "manual",
    playerName: typeof data.playerName === "string" ? data.playerName : null,
    playerUserId: typeof data.playerUserId === "string" ? data.playerUserId : null,
    services,
    mirrorBookingId: typeof data.mirrorBookingId === "string" ? data.mirrorBookingId : null,
    isSettled: data.settledAt != null
  };
}

export async function fetchOwnerBookingsForUid(ownerUid: string): Promise<OwnerBookingDoc[]> {
  if (!isFirebaseConfigured()) return [];
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, OWNER_BOOKINGS_COLLECTION), where("ownerUid", "==", ownerUid), limit(200))
  );
  const rows: OwnerBookingDoc[] = [];
  snap.forEach((d) => rows.push(parseOwnerBookingData(d.id, d.data() as Record<string, unknown>)));
  rows.sort((a, b) => {
    const da = `${a.date}T${a.startTime}`;
    const db_ = `${b.date}T${b.startTime}`;
    return db_.localeCompare(da);
  });
  return rows;
}

export async function fetchOwnerBookingsForField(ownerUid: string, fieldId: string): Promise<OwnerBookingDoc[]> {
  const all = await fetchOwnerBookingsForUid(ownerUid);
  return all.filter((b) => b.fieldId === fieldId && b.status !== "cancelled");
}

export async function insertOwnerBooking(input: InsertOwnerBookingInput): Promise<{ id: string }> {
  if (!isFirebaseConfigured()) throw new Error("FIREBASE_NOT_CONFIGURED");
  const db = getFirestoreDb();
  const ownerRef = doc(collection(db, OWNER_BOOKINGS_COLLECTION));
  const basePayload: Record<string, unknown> = {
    ownerUid: input.ownerUid,
    fieldId: input.fieldId,
    fieldName: input.fieldName,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    totalPrice: input.totalPrice,
    status: input.status ?? "approved",
    source: input.source,
    playerName: input.playerName?.trim() || null,
    services: input.services?.length ? input.services : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const sync =
    input.source === "manual" && Boolean(input.ownerPublicId?.trim());

  if (sync) {
    const mirrorRef = doc(collection(db, VENUE_BOOKINGS_COLLECTION));
    const ownerPublicId = input.ownerPublicId!.trim();
    const mirrorPayload = buildOwnerAppMirrorFields(ownerRef.id, ownerPublicId, {
      fieldId: input.fieldId,
      fieldName: input.fieldName,
      date: input.date,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      totalPrice: input.totalPrice,
      status: input.status ?? "approved",
      source: input.source,
      playerName: input.playerName
    });
    const batch = writeBatch(db);
    batch.set(ownerRef, { ...basePayload, mirrorBookingId: mirrorRef.id });
    batch.set(mirrorRef, mirrorPayload);
    await batch.commit();
    return { id: ownerRef.id };
  }

  const batch = writeBatch(db);
  batch.set(ownerRef, basePayload);
  await batch.commit();
  return { id: ownerRef.id };
}

export async function updateOwnerBookingDoc(
  bookingId: string,
  patch: Partial<
    Pick<
      OwnerBookingDoc,
      | "date"
      | "startTime"
      | "endTime"
      | "durationMinutes"
      | "totalPrice"
      | "status"
      | "source"
      | "playerName"
      | "services"
      | "fieldName"
    >
  >
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const ref = doc(db, OWNER_BOOKINGS_COLLECTION, bookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const prev = parseOwnerBookingData(bookingId, snap.data() as Record<string, unknown>);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp()
  });
  const merged: OwnerBookingDoc = { ...prev, ...patch };
  if (prev.mirrorBookingId) {
    await syncVenueMirrorFromOwnerBooking(prev.mirrorBookingId, {
      fieldId: merged.fieldId,
      fieldName: merged.fieldName,
      date: merged.date,
      startTime: merged.startTime,
      durationMinutes: merged.durationMinutes,
      totalPrice: merged.totalPrice,
      status: merged.status,
      source: merged.source,
      playerName: merged.playerName
    });
  }
}

export async function deleteOwnerBookingDoc(bookingId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const ref = doc(db, OWNER_BOOKINGS_COLLECTION, bookingId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const m = (snap.data() as Record<string, unknown>).mirrorBookingId;
    if (typeof m === "string" && m) {
      await deleteVenueBookingDoc(m);
    }
  }
  await deleteDoc(ref);
}

export async function updateOwnerBookingStatusFirestore(bookingId: string, status: string): Promise<void> {
  await updateOwnerBookingDoc(bookingId, { status });
}

function toHm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** دقائق من بداية اليوم من "HH:mm" */
function minutesFromMidnight(hm: string): number {
  const [h, m] = hm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** يتداخل [a0,a1) مع [b0,b1) */
function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

export type TimeSlot = { start: string; end: string; label: string };

export type VenueBookingSlotMode = "slots" | "display";

/** تحويل حجز الداشبورد لصيغة الحجز المحلي (فترات / عرض). */
export function venueBookingToOwnerBookingDoc(
  v: VenueBookingDoc,
  mode: VenueBookingSlotMode
): OwnerBookingDoc {
  const end = endTimeFromDuration(v.date, v.startTime, v.duration);
  const [h0, m0] = v.startTime.split(":").map((x) => parseInt(x, 10));
  const [h1, m1] = end.split(":").map((x) => parseInt(x, 10));
  let dur = h1 * 60 + m1 - (h0 * 60 + m0);
  if (dur <= 0) dur += 24 * 60;
  const id =
    mode === "slots" && v.syncSource === SYNC_SOURCE_OWNER_APP && v.ownerBookingId
      ? v.ownerBookingId
      : `vb:${v.id}`;
  return {
    id,
    ownerUid: "",
    fieldId: v.venueId,
    fieldName: v.venueName,
    date: v.date,
    startTime: v.startTime,
    endTime: end,
    durationMinutes: dur,
    totalPrice: v.totalPrice ?? v.price ?? 0,
    status: v.status ?? "confirmed",
    source: "player",
    playerName: v.playerName ?? null
  };
}

/**
 * فترات متاحة (افتراض 08:00–22:00) بدون تداخل مع حجوزات نفس الملعب في التاريخ.
 */
export function computeAvailableSlots(
  date: string,
  bookingsOnDate: OwnerBookingDoc[],
  slotMinutes: number,
  dayStartHour = 8,
  dayEndHour = 22,
  excludeBookingId?: string | null
): TimeSlot[] {
  const dayStart = dayStartHour * 60;
  const dayEnd = dayEndHour * 60;
  const occupied = bookingsOnDate
    .filter(
      (b) =>
        b.id !== excludeBookingId && b.date === date && b.status !== "cancelled"
    )
    .map((b) => ({
      s: minutesFromMidnight(b.startTime),
      e: minutesFromMidnight(b.endTime)
    }))
    .filter((x) => x.e > x.s);

  const slots: TimeSlot[] = [];
  let t = dayStart;
  while (t + slotMinutes <= dayEnd) {
    const s = t;
    const e = t + slotMinutes;
    const clash = occupied.some((o) => rangesOverlap(s, e, o.s, o.e));
    if (!clash) {
      const startHm = toHm(s);
      const endHm = toHm(e);
      slots.push({
        start: startHm,
        end: endHm,
        label: `${startHm} — ${endHm}`
      });
    }
    t += slotMinutes;
  }
  return slots;
}
