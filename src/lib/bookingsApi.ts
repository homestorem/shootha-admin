import { isBackendSyncEnabled } from "./backendFlags";
import { t } from "../strings";

/** عند تفعيل `isBackendSyncEnabled`: استخدم `getApiClient()` من `src/api/httpClient.ts` لطلبات REST. */

/** يطابق BookingStatus في واجهة البطاقة */
export type BookingStatusUi = "pending" | "approved" | "rejected" | "cancelled" | "confirmed";

export const TABLE_BOOKINGS = "bookings" as const;
export const TABLE_FIELDS = "fields" as const;

/** مدات الحجز المسموحة في الواجهة (ساعة / ساعة ونص) */
export const BOOKING_DURATION_MINUTES_OPTIONS = [60, 90] as const;
export type BookingDurationMinutesOption = (typeof BOOKING_DURATION_MINUTES_OPTIONS)[number];

/** صف كما يعيده PostgREST من جدول bookings */
export type BookingRow = {
  id: number;
  field_id: string | null;
  player_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: string;
  total_price: number;
  status: string | null;
  created_at: string | null;
  created_by: string;
};

/** استجابة الاستعلام مع join على fields */
export type BookingRowWithField = BookingRow & {
  fields: { id: string; name: string; owner_id: string };
};

export type FieldOption = {
  id: string;
  name: string;
};

/** TODO: backend will be implemented later */
export async function fetchFieldsForOwner(_ownerUserId: string): Promise<FieldOption[]> {
  if (!isBackendSyncEnabled) return [];
  throw new Error(t.errors.backendLater);
}

/** TODO: backend will be implemented later */
export async function fetchBookingsForOwner(_ownerUserId: string): Promise<BookingRowWithField[]> {
  if (!isBackendSyncEnabled) return [];
  throw new Error(t.errors.backendLater);
}

/** TODO: backend will be implemented later */
export async function fetchPlayerLabels(_playerIds: string[]): Promise<Map<string, string>> {
  return new Map();
}

export type InsertBookingInput = {
  field_id: string;
  player_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  durationMinutes: number;
  total_price: number;
  status?: string;
  created_by: string;
};

/** تمثيل interval لـ Postgres كسلسلة minutes */
export function minutesToInterval(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  return `${m} minutes`;
}

/** TODO: backend will be implemented later */
export async function insertBooking(_row: InsertBookingInput): Promise<{ id: number }> {
  throw new Error(t.errors.backendLater);
}

/** TODO: backend will be implemented later */
export async function updateBookingStatus(_bookingId: number, _status: string): Promise<void> {
  throw new Error(t.errors.backendLater);
}

export function mapDbStatusToUi(s: string | null): BookingStatusUi {
  switch (s) {
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "confirmed":
      return "confirmed";
    default:
      return "pending";
  }
}

/** عرض وقت من قاعدة البيانات (HH:MM:SS → HH:MM) */
export function formatTimeForDisplay(sqlTime: string): string {
  if (!sqlTime) return "";
  const p = sqlTime.split(":");
  if (p.length >= 2) return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}`;
  return sqlTime;
}

/** عرض مدة interval بصيغة مقروءة */
export function formatDurationForDisplay(intervalStr: string): string {
  if (!intervalStr) return "";
  const iso = intervalStr.match(/(\d+):(\d+):(\d+)/);
  if (iso) {
    const h = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const sec = parseInt(iso[3], 10);
    const totalMin = h * 60 + m + (sec >= 30 ? 1 : 0);
    if (totalMin < 60) return `${totalMin} دقيقة`;
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return mm ? `${hh} س ${mm} د` : `${hh} ساعة`;
  }
  if (/min/i.test(intervalStr)) return intervalStr.replace(/\s*minutes?/i, " دقيقة").trim();
  return intervalStr;
}
