import { Timestamp } from "firebase/firestore";
import dayjs from "./dayjs";

/**
 * يحوّل تاريخ الحجز من Firestore (نص YYYY-MM-DD أو Timestamp) إلى YYYY-MM-DD
 * لاستخدامه في الفلترة والترتيب. بدون ذلك، Timestamp يُصبح نصاً غير صالح لـ dayjs
 * فيختفي الحجز من تبويبات اليوم/القادم/السابق.
 */
export function toBookingCalendarDay(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Timestamp) {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? "" : dayjs(d).format("YYYY-MM-DD");
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const parsed = dayjs(t);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = dayjs(ms);
    return d.isValid() ? d.format("YYYY-MM-DD") : "";
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const fn = (value as { toDate?: () => Date }).toDate;
    if (typeof fn === "function") {
      const d = fn.call(value);
      if (d instanceof Date && !Number.isNaN(d.getTime())) return dayjs(d).format("YYYY-MM-DD");
    }
  }
  return "";
}

export type BookingDayTab = "today" | "upcoming" | "past" | "unknown";

/** لتبويبات الرئيسية — تواريخ غير صالحة تُصنَّف unknown ويُعرَض الحجز تحت «السابق» */
export function classifyBookingDayTab(dateStr: string, now: Date = new Date()): BookingDayTab {
  const t = (dateStr ?? "").trim();
  if (!t) return "unknown";
  const d0 = dayjs(now).startOf("day");
  const d = dayjs(t).startOf("day");
  if (!d.isValid()) return "unknown";
  if (d.isSame(d0, "day")) return "today";
  if (d.isAfter(d0, "day")) return "upcoming";
  return "past";
}
