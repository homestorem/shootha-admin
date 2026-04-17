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
  where
} from "firebase/firestore";
import dayjs from "../lib/dayjs";
import { toBookingCalendarDay } from "../lib/firestoreBookingDate";
import { getFirestoreDb, getFirebaseAuth } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import type { AttendanceStatus } from "../lib/bookingAttendance";
import { appendOwnerFieldActionLog, type OwnerFieldActionKind } from "./ownerFieldActionsFirestore";

/** مجموعة `bookings` كما تكتبها لوحة التحكم (ownerId = owner_...) */
export const VENUE_BOOKINGS_COLLECTION = "bookings" as const;

export const VENUE_BOOKING_ID_PREFIX = "vb:" as const;

/** حجز يدوي من تطبيق المالك — يُزامَن مع الداشبورد/تطبيق اللاعب */
export const SYNC_SOURCE_OWNER_APP = "owner_app" as const;

/** نص موحّد لحجز المالك اليدوي (واجهة + مستندات المزامنة) */
export const OWNER_MANUAL_BOOKING_DISPLAY_NAME = "حجز من قبل صاحب الملعب";

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
  /** خدمات مطلوبة من اللاعب (مُجمّعة من الحقول المعروفة في Firestore) */
  servicesSummary?: string;
  attendanceStatus?: AttendanceStatus;
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

/** تجميع حقول الخدمات الشائعة في مستند bookings (داشبورد / تطبيق اللاعب). */
function parseVenueBookingServicesSummary(x: Record<string, unknown>): string | undefined {
  const fromArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((i): i is string => typeof i === "string").map((s) => s.trim()).filter(Boolean);
  };
  const merged = [
    ...fromArray(x.services),
    ...fromArray(x.playerServices),
    ...fromArray(x.requestedServices),
    ...fromArray(x.extraServices)
  ];
  if (merged.length) return [...new Set(merged)].join("، ");
  if (typeof x.servicesSummary === "string" && x.servicesSummary.trim()) return x.servicesSummary.trim();
  if (typeof x.services === "string" && x.services.trim()) return x.services.trim();
  for (const key of ["serviceNotes", "servicesNote", "extras", "playerNotes"] as const) {
    const v = x[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
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
      date: toBookingCalendarDay(x.date) || str(x.date),
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
      isSettled: x.settledAt != null,
      servicesSummary: parseVenueBookingServicesSummary(x),
      attendanceStatus:
        x.attendanceStatus === "attended" || x.attendanceStatus === "no_show"
          ? x.attendanceStatus
          : undefined
    });
  });
  rows.sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  return rows;
}

/** عند `skipOwnerActionLog` لا يُضاف سجل في `owner_field_actions` (مزامنة داخلية من owner_bookings). */
export type VenueBookingWriteOpts = { skipOwnerActionLog?: boolean };

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
  attendanceStatus?: AttendanceStatus;
};

function classifyVenuePatch(patch: UpdateVenueBookingInput): OwnerFieldActionKind {
  const keys = (Object.keys(patch) as (keyof UpdateVenueBookingInput)[]).filter(
    (k) => patch[k] !== undefined
  );
  if (keys.length === 1 && keys[0] === "status") return "booking_status_changed";
  if (keys.length === 1 && keys[0] === "attendanceStatus") return "attendance_set";
  return "booking_updated";
}

function venueActionSummary(
  action: OwnerFieldActionKind,
  venueName: string,
  dateStr: string,
  patch: UpdateVenueBookingInput
): string {
  const v = venueName.trim() || "حجز";
  const d = dateStr.trim() || "—";
  if (action === "booking_status_changed") return `تغيير حالة حجز — ${v} — ${d} — ${String(patch.status ?? "")}`;
  if (action === "attendance_set") return `تسجيل حضور — ${v} — ${d}`;
  return `تعديل حجز — ${v} — ${d}`;
}

async function appendVenueBookingActionLog(
  bookingDocId: string,
  patch: UpdateVenueBookingInput,
  action: OwnerFieldActionKind
): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid?.trim();
  if (!uid) return;
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, VENUE_BOOKINGS_COLLECTION, bookingDocId));
  if (!snap.exists()) return;
  const raw = snap.data() as Record<string, unknown>;
  const ownerPublicId = typeof raw.ownerId === "string" ? raw.ownerId : null;
  const venueName = typeof raw.venueName === "string" ? raw.venueName : "";
  const dateStr = typeof raw.date === "string" ? raw.date : "";
  appendOwnerFieldActionLog({
    ownerUid: uid,
    ownerPublicId,
    action,
    sourceCollection: "bookings",
    targetId: bookingDocId,
    targetUiId: `${VENUE_BOOKING_ID_PREFIX}${bookingDocId}`,
    summary: venueActionSummary(action, venueName, dateStr, patch),
    meta: {
      status: patch.status ?? null,
      attendanceStatus: patch.attendanceStatus ?? null
    }
  });
}

export async function updateVenueBookingDoc(
  bookingDocId: string,
  patch: UpdateVenueBookingInput,
  opts?: VenueBookingWriteOpts
): Promise<void> {
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
  if (patch.attendanceStatus != null) clean.attendanceStatus = patch.attendanceStatus;
  await updateDoc(doc(db, VENUE_BOOKINGS_COLLECTION, bookingDocId), clean);
  if (!opts?.skipOwnerActionLog) {
    const action = classifyVenuePatch(patch);
    await appendVenueBookingActionLog(bookingDocId, patch, action);
  }
}

export async function setVenueBookingAttendance(venueBookingId: string, status: AttendanceStatus): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error("FIREBASE_NOT_CONFIGURED");
  const db = getFirestoreDb();
  const ref = doc(db, VENUE_BOOKINGS_COLLECTION, venueBookingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("NOT_FOUND");
  const raw = snap.data() as Record<string, unknown>;
  if (raw.settledAt != null) throw new Error("ALREADY_SETTLED");
  await updateDoc(ref, {
    attendanceStatus: status,
    attendanceConfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  const uid = getFirebaseAuth().currentUser?.uid?.trim();
  if (uid) {
    const ownerPublicId = typeof raw.ownerId === "string" ? raw.ownerId : null;
    const venueName = typeof raw.venueName === "string" ? raw.venueName : "";
    const dateStr = typeof raw.date === "string" ? raw.date : "";
    appendOwnerFieldActionLog({
      ownerUid: uid,
      ownerPublicId,
      action: "attendance_set",
      sourceCollection: "bookings",
      targetId: venueBookingId,
      targetUiId: `${VENUE_BOOKING_ID_PREFIX}${venueBookingId}`,
      summary: `حضور حجز — ${status === "attended" ? "حضر" : "لم يحضر"} — ${venueName.trim() || "حجز"} — ${dateStr.trim() || "—"}`,
      meta: { attendanceStatus: status }
    });
  }
}

export async function deleteVenueBookingDoc(
  bookingDocId: string,
  opts?: VenueBookingWriteOpts
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirestoreDb();
  const r = doc(db, VENUE_BOOKINGS_COLLECTION, bookingDocId);
  const snap = await getDoc(r);
  const raw = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  await deleteDoc(r);
  if (opts?.skipOwnerActionLog || !raw) return;
  const uid = getFirebaseAuth().currentUser?.uid?.trim();
  if (!uid) return;
  const ownerPublicId = typeof raw.ownerId === "string" ? raw.ownerId : null;
  appendOwnerFieldActionLog({
    ownerUid: uid,
    ownerPublicId,
    action: "booking_deleted",
    sourceCollection: "bookings",
    targetId: bookingDocId,
    targetUiId: `${VENUE_BOOKING_ID_PREFIX}${bookingDocId}`,
    summary: `حذف حجز — ${String(raw.venueName ?? "").trim() || "حجز"} — ${String(raw.date ?? "").trim() || "—"}`,
    meta: { status: raw.status != null ? String(raw.status) : null }
  });
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
  phone?: string | null;
  services?: string[] | null;
  paymentMethod?: string | null;
  attendanceStatus?: AttendanceStatus;
};

/** حقول مستند bookings لمزامنة حجز يدوي من التطبيق */
export function buildOwnerAppMirrorFields(
  ownerBookingDocId: string,
  ownerPublicId: string,
  o: OwnerBookingLikeForMirror
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ownerId: ownerPublicId,
    ownerBookingId: ownerBookingDocId,
    syncSource: SYNC_SOURCE_OWNER_APP,
    date: o.date,
    startTime: normalizeHm(o.startTime),
    duration: durationMinutesToDashboardDuration(o.durationMinutes),
    venueId: o.fieldId,
    venueName: o.fieldName,
    playerName:
      o.source === "player"
        ? o.playerName?.trim() || null
        : OWNER_MANUAL_BOOKING_DISPLAY_NAME,
    totalPrice: o.totalPrice,
    price: o.totalPrice,
    status: mapOwnerStatusToVenueStatus(o.status),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const pm = o.paymentMethod?.trim();
  if (pm) base.paymentMethod = pm;
  const ph = o.phone?.trim();
  if (ph) base.phone = ph;
  const services = (o.services ?? []).map((s) => s.trim()).filter(Boolean);
  if (services.length) {
    base.services = services;
    base.servicesSummary = services.join("، ");
  }
  return base;
}

export async function syncVenueMirrorFromOwnerBooking(
  mirrorBookingDocId: string,
  o: OwnerBookingLikeForMirror
): Promise<void> {
  await updateVenueBookingDoc(
    mirrorBookingDocId,
    {
      date: o.date,
      startTime: normalizeHm(o.startTime),
      duration: durationMinutesToDashboardDuration(o.durationMinutes),
      venueName: o.fieldName,
      venueId: o.fieldId,
      totalPrice: o.totalPrice,
      price: o.totalPrice,
      status: mapOwnerStatusToVenueStatus(o.status),
      playerName:
        o.source === "player" ? o.playerName?.trim() || undefined : OWNER_MANUAL_BOOKING_DISPLAY_NAME,
      ...(o.phone?.trim() ? { phone: o.phone.trim() } : {}),
      ...(o.services?.length ? { services: o.services, servicesSummary: o.services.join("، ") } : {}),
      ...(o.paymentMethod?.trim() ? { paymentMethod: o.paymentMethod.trim() } : {}),
      ...(o.attendanceStatus != null ? { attendanceStatus: o.attendanceStatus } : {})
    },
    { skipOwnerActionLog: true }
  );
}
