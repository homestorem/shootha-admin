import { t } from "../strings";

/** قيم مُخزَّنة في Firestore / الداشبورد */
export const BOOKING_PAYMENT_KEYS = ["cash", "electronic", "bank_transfer", "pos"] as const;
export type BookingPaymentMethodKey = (typeof BOOKING_PAYMENT_KEYS)[number];

export function isBookingPaymentKey(v: string): v is BookingPaymentMethodKey {
  return (BOOKING_PAYMENT_KEYS as readonly string[]).includes(v);
}

/** عرض عربي لطريقة الدفع على البطاقة والواجهة */
export function formatBookingPaymentMethod(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") {
    return t.bookings.paymentUnspecified;
  }
  const k = String(raw).trim().toLowerCase().replace(/\s+/g, "_");

  if (k === "cash" || k === "نقد" || k === "نقدا" || k === "نقداً") return t.bookings.paymentCash;
  if (k === "electronic" || k === "digital" || k === "card" || k === "online" || k === "إلكتروني") {
    return t.bookings.paymentElectronic;
  }
  if (
    k === "bank_transfer" ||
    k === "bank" ||
    k === "transfer" ||
    k === "wire" ||
    k === "تحويل" ||
    k === "تحويل_بنكي"
  ) {
    return t.bookings.paymentBankTransfer;
  }
  if (k === "pos" || k === "device" || k === "terminal") return t.bookings.paymentPos;
  if (k === "owner_manual") return t.bookings.paymentOwnerManual;

  return String(raw).trim();
}

export function paymentChipLabel(key: BookingPaymentMethodKey): string {
  switch (key) {
    case "cash":
      return t.bookings.paymentCash;
    case "electronic":
      return t.bookings.paymentElectronic;
    case "bank_transfer":
      return t.bookings.paymentBankTransfer;
    case "pos":
      return t.bookings.paymentPos;
    default:
      return key;
  }
}
