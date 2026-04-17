import { deriveOwnerIdFromUid } from "../lib/ownerId";
import dayjs from "../lib/dayjs";
import { settlementIncomeFromAttendance } from "../lib/bookingAttendance";
import { appendBookingIncomeEntry, type AccountEntry } from "./accountsStore";
import { upsertFieldFinanceLedgerEntry } from "./fieldFinancesFirestore";
import { fetchOwnerBookingsForUid } from "./ownerBookingsFirestore";
import { endTimeFromDuration, fetchVenueBookingsForOwner } from "./venueBookingsFirestore";

/** ربط مالية الملاعب بالحجوزات: يضيف وارد الحجز تلقائياً عند انتهاء الوقت (أو عند التسوية). */
export async function syncAccountsIncomeFromBookings(input: {
  ownerUid: string;
  ownerPublicId?: string;
  /** لسجل «مالية الملاعب» في Firestore */
  personName?: string;
}): Promise<void> {
  const ownerUid = input.ownerUid.trim();
  if (!ownerUid) return;
  const ownerPublicId = (input.ownerPublicId ?? deriveOwnerIdFromUid(ownerUid)).trim();
  const personName = (input.personName ?? "").trim() || "مالك الملعب";

  const pushLedger = async (entry: AccountEntry | null) => {
    if (!entry) return;
    await upsertFieldFinanceLedgerEntry({
      ownerUid,
      ownerPublicId,
      personId: ownerUid,
      personName,
      entry
    }).catch(() => undefined);
  };

  const [ownerBookings, venueBookings] = await Promise.all([
    fetchOwnerBookingsForUid(ownerUid),
    fetchVenueBookingsForOwner(ownerPublicId)
  ]);
  const now = dayjs();

  for (const b of ownerBookings) {
    const isApprovedLike = b.status === "approved" || b.status === "confirmed";
    const ended = dayjs(`${b.date}T${b.endTime}:00`).isBefore(now);
    if (!isApprovedLike || (!b.isSettled && !ended)) continue;
    const amount = settlementIncomeFromAttendance(Number(b.totalPrice ?? 0), b.attendanceStatus);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const entry = await appendBookingIncomeEntry({
      linkedBookingId: `owner:${b.id}`,
      amount,
      kind: "income_booking",
      note: `إيراد حجز ${b.fieldName} — ${b.date}`
    });
    await pushLedger(entry);
  }

  for (const v of venueBookings) {
    const isApprovedLike = v.status === "approved" || v.status === "confirmed";
    const endTime = endTimeFromDuration(v.date, v.startTime, v.duration);
    const ended = dayjs(`${v.date}T${endTime}:00`).isBefore(now);
    if (!isApprovedLike || (!v.isSettled && !ended)) continue;
    if (v.ownerBookingId) continue; // mirrored from owner_booking; already handled above
    const amount = settlementIncomeFromAttendance(Number(v.totalPrice ?? v.price ?? 0), v.attendanceStatus);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const entry = await appendBookingIncomeEntry({
      linkedBookingId: `venue:${v.id}`,
      amount,
      kind: "income_booking",
      note: `إيراد حجز ${v.venueName} — ${v.date}`
    });
    await pushLedger(entry);
  }
}
