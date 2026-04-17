import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebaseClient";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import {
  parseAttendanceStatus,
  settlementIncomeFromAttendance,
  type AttendanceStatus
} from "../lib/bookingAttendance";
import { OWNER_BOOKINGS_COLLECTION, parseOwnerBookingData } from "./ownerBookingsFirestore";
import {
  OWNER_MANUAL_BOOKING_DISPLAY_NAME,
  VENUE_BOOKINGS_COLLECTION
} from "./venueBookingsFirestore";
import { appendBookingIncomeEntry } from "./accountsStore";
import { upsertFieldFinanceLedgerEntry } from "./fieldFinancesFirestore";

export const PLAYER_RATINGS_COLLECTION = "player_ratings" as const;

function assertFirebase(): void {
  if (!isFirebaseConfigured()) throw new Error("FIREBASE_NOT_CONFIGURED");
}

export type PostMatchContext = {
  mode: "owner" | "venue";
  isSettled: boolean;
  fieldName: string;
  playerDisplayName: string | null;
  playerUserId: string | null;
  totalPrice: number;
  date: string;
  attendanceStatus?: AttendanceStatus;
};

export async function fetchPostMatchContext(
  mode: "owner" | "venue",
  ownerBookingId?: string,
  venueBookingId?: string
): Promise<PostMatchContext | null> {
  assertFirebase();
  const db = getFirestoreDb();
  if (mode === "owner" && ownerBookingId) {
    const snap = await getDoc(doc(db, OWNER_BOOKINGS_COLLECTION, ownerBookingId));
    if (!snap.exists()) return null;
    const ob = parseOwnerBookingData(ownerBookingId, snap.data() as Record<string, unknown>);
    const display =
      ob.source === "player"
        ? ob.playerName?.trim() || null
        : ob.playerName?.trim() || OWNER_MANUAL_BOOKING_DISPLAY_NAME;
    return {
      mode: "owner",
      isSettled: Boolean(ob.isSettled),
      fieldName: ob.fieldName,
      playerDisplayName: display,
      playerUserId: ob.playerUserId ?? null,
      totalPrice: ob.totalPrice,
      date: ob.date,
      attendanceStatus: ob.attendanceStatus
    };
  }
  if (mode === "venue" && venueBookingId) {
    const snap = await getDoc(doc(db, VENUE_BOOKINGS_COLLECTION, venueBookingId));
    if (!snap.exists()) return null;
    const x = snap.data() as Record<string, unknown>;
    const total =
      typeof x.totalPrice === "number"
        ? x.totalPrice
        : typeof x.price === "number"
          ? x.price
          : 0;
    return {
      mode: "venue",
      isSettled: x.settledAt != null,
      fieldName: String(x.venueName ?? ""),
      playerDisplayName: typeof x.playerName === "string" ? x.playerName : null,
      playerUserId: typeof x.playerUserId === "string" ? x.playerUserId : null,
      totalPrice: total,
      date: String(x.date ?? ""),
      attendanceStatus: parseAttendanceStatus(x.attendanceStatus)
    };
  }
  return null;
}

export type CompletePostMatchInput = {
  mode: "owner" | "venue";
  ownerUid: string;
  ownerPublicId: string;
  /** الاسم المعروض لصاحب الملعب — يُسجَّل في «مالية الملاعب» */
  ownerDisplayName?: string | null;
  ownerBookingId?: string;
  venueBookingId?: string;
  rating: number;
  comment: string;
};

function hasSettledFlag(data: Record<string, unknown>): boolean {
  return data.settledAt != null;
}

export async function completePostMatch(input: CompletePostMatchInput): Promise<void> {
  assertFirebase();
  const r = Math.round(Number(input.rating));
  if (r < 1 || r > 5) throw new Error("BAD_RATING");
  const comment = input.comment.trim();
  const db = getFirestoreDb();

  if (input.mode === "owner") {
    const id = input.ownerBookingId;
    if (!id) throw new Error("MISSING_OWNER_BOOKING");
    const ref = doc(db, OWNER_BOOKINGS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("NOT_FOUND");
    const raw = snap.data() as Record<string, unknown>;
    const ob = parseOwnerBookingData(id, raw);
    if (ob.isSettled) throw new Error("ALREADY_SETTLED");
    const incomeOwner = settlementIncomeFromAttendance(ob.totalPrice, ob.attendanceStatus);

    await addDoc(collection(db, PLAYER_RATINGS_COLLECTION), {
      ownerUid: input.ownerUid,
      ownerPublicId: input.ownerPublicId,
      bookingKind: "owner",
      ownerBookingId: id,
      venueBookingId: ob.mirrorBookingId ?? null,
      playerUserId: ob.playerUserId ?? null,
      playerName: ob.playerName ?? null,
      rating: r,
      comment: comment || null,
      venueId: ob.fieldId,
      venueName: ob.fieldName,
      date: ob.date,
      totalPriceRecorded: incomeOwner,
      createdAt: serverTimestamp()
    });

    const settlePatch = {
      settledAt: serverTimestamp(),
      playerRating: r,
      ratingComment: comment || null,
      updatedAt: serverTimestamp()
    };
    await updateDoc(ref, settlePatch);
    if (typeof ob.mirrorBookingId === "string" && ob.mirrorBookingId) {
      const mref = doc(db, VENUE_BOOKINGS_COLLECTION, ob.mirrorBookingId);
      const ms = await getDoc(mref);
      if (ms.exists()) {
        await updateDoc(mref, settlePatch);
      }
    }

    const entryOwner = await appendBookingIncomeEntry({
      linkedBookingId: `owner:${id}`,
      amount: incomeOwner,
      kind: ob.source === "manual" ? "income_manual" : "income_external",
      note:
        incomeOwner <= 0
          ? `حجز ${ob.fieldName} — ${ob.date} (${r}/5) — عدم حضور (لا إيراد)`
          : `حجز ${ob.fieldName} — ${ob.date} (${r}/5)`
    });
    if (entryOwner) {
      const personName = (input.ownerDisplayName ?? "").trim() || "مالك الملعب";
      await upsertFieldFinanceLedgerEntry({
        ownerUid: input.ownerUid,
        ownerPublicId: input.ownerPublicId,
        personId: input.ownerUid,
        personName,
        entry: entryOwner
      }).catch(() => undefined);
    }
    return;
  }

  const vid = input.venueBookingId;
  if (!vid) throw new Error("MISSING_VENUE_BOOKING");
  const vref = doc(db, VENUE_BOOKINGS_COLLECTION, vid);
  const vsnap = await getDoc(vref);
  if (!vsnap.exists()) throw new Error("NOT_FOUND");
  const vraw = vsnap.data() as Record<string, unknown>;
  if (hasSettledFlag(vraw)) throw new Error("ALREADY_SETTLED");

  const venueId = String(vraw.venueId ?? "");
  const venueName = String(vraw.venueName ?? "");
  const date = String(vraw.date ?? "");
  const totalPrice =
    typeof vraw.totalPrice === "number"
      ? vraw.totalPrice
      : typeof vraw.price === "number"
        ? vraw.price
        : 0;
  const playerName = typeof vraw.playerName === "string" ? vraw.playerName : null;
  const playerUserId = typeof vraw.playerUserId === "string" ? vraw.playerUserId : null;
  const ownerBookingIdFromVenue =
    typeof vraw.ownerBookingId === "string" ? vraw.ownerBookingId : null;
  const attendanceVenue = parseAttendanceStatus(vraw.attendanceStatus);
  const incomeVenue = settlementIncomeFromAttendance(totalPrice, attendanceVenue);

  await addDoc(collection(db, PLAYER_RATINGS_COLLECTION), {
    ownerUid: input.ownerUid,
    ownerPublicId: input.ownerPublicId,
    bookingKind: "venue",
    ownerBookingId: ownerBookingIdFromVenue,
    venueBookingId: vid,
    playerUserId,
    playerName,
    rating: r,
    comment: comment || null,
    venueId,
    venueName,
    date,
    totalPriceRecorded: incomeVenue,
    createdAt: serverTimestamp()
  });

  const settlePatch = {
    settledAt: serverTimestamp(),
    playerRating: r,
    ratingComment: comment || null,
    updatedAt: serverTimestamp()
  };
  await updateDoc(vref, settlePatch);

  if (ownerBookingIdFromVenue) {
    const oref = doc(db, OWNER_BOOKINGS_COLLECTION, ownerBookingIdFromVenue);
    const os = await getDoc(oref);
    if (os.exists() && !hasSettledFlag(os.data() as Record<string, unknown>)) {
      await updateDoc(oref, settlePatch);
    }
  }

  const entryVenue = await appendBookingIncomeEntry({
    linkedBookingId: `venue:${vid}`,
    amount: incomeVenue,
    kind: "income_external",
    note:
      incomeVenue <= 0
        ? `حجز ${venueName} — ${date} (${r}/5) — عدم حضور (لا إيراد)`
        : `حجز ${venueName} — ${date} (${r}/5)`
  });
  if (entryVenue) {
    const personName = (input.ownerDisplayName ?? "").trim() || "مالك الملعب";
    await upsertFieldFinanceLedgerEntry({
      ownerUid: input.ownerUid,
      ownerPublicId: input.ownerPublicId,
      personId: input.ownerUid,
      personName,
      entry: entryVenue
    }).catch(() => undefined);
  }
}
