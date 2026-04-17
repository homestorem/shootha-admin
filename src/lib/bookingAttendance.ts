import dayjs from "./dayjs";

/** حضر → إيراد كامل عند إنهاء الحجز؛ لم يحضر → خصم تلقائي (صفر إيراد في المالية المحلية) */
export type AttendanceStatus = "attended" | "no_show";

/** دقائق قبل موعد بداية الحجز التي يُفعّل عندها ظهور أزرار «حضر / لم يحضر» */
export const ATTENDANCE_LEAD_MINUTES = 15;

function padHmForDayjs(t: string): string {
  const p = t.trim().split(":");
  const h = (p[0] || "0").padStart(2, "0");
  const m = (p[1] || "00").padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * يعود true عندما يكون الوقت الحالي ≥ (بداية الحجز − ATTENDANCE_LEAD_MINUTES).
 * يُستخدم لإظهار واجهة تأكيد الحضور تلقائياً قبل الموعد بفترة محددة.
 */
export function isAttendanceWindowOpen(booking: { date: string; start_time: string }): boolean {
  const start = dayjs(`${booking.date}T${padHmForDayjs(booking.start_time)}:00`);
  const windowOpensAt = start.subtract(ATTENDANCE_LEAD_MINUTES, "minute");
  return !dayjs().isBefore(windowOpensAt);
}

export function parseAttendanceStatus(v: unknown): AttendanceStatus | undefined {
  if (v === "attended" || v === "no_show") return v;
  return undefined;
}

/** مبلغ يُسجَّل في المالية عند إنهاء الحجز */
export function settlementIncomeFromAttendance(
  totalPrice: number,
  attendance: AttendanceStatus | undefined
): number {
  if (attendance === "no_show") return 0;
  return totalPrice;
}
