/**
 * المفتاح الدولي ثابت في التطبيق — الافتراضي +964 (العراق).
 * يُمكن تجاوزه بـ EXPO_PUBLIC_DEFAULT_PHONE_DIAL.
 */
const rawDial = (process.env.EXPO_PUBLIC_DEFAULT_PHONE_DIAL ?? "+964").trim();
export const DEFAULT_DIAL_CODE = rawDial.startsWith("+") ? rawDial : `+${rawDial}`;

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * بريد تسجيل الدخول بالـ OTP: `otp.<أرقام E.164 بدون +>@shoota.local`
 * يُعاد الرقم بصيغة E.164 (مع +) لعرضه أو حفظه في الملف الشخصي.
 */
export function e164FromOtpLoginEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = email.trim().toLowerCase().match(/^otp\.(\d{8,16})@shoota\.local$/);
  return m ? `+${m[1]}` : null;
}

/** إزالة صفر الاتصال المحلي إن وُجد */
export function normalizeNationalDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

/** تحقق الرقم الوطني حسب المفتاح: +964 جوال عراقي عادة 7xxxxxxxx (10 أرقام) */
export function isValidNationalNumber(national: string): boolean {
  if (!national) return false;
  if (DEFAULT_DIAL_CODE === "+964") {
    return /^7\d{9}$/.test(national);
  }
  if (DEFAULT_DIAL_CODE === "+966") {
    return /^5\d{8}$/.test(national);
  }
  return national.length >= 8 && national.length <= 12;
}

export function buildE164FromNational(rawLocal: string): { ok: true; e164: string } | { ok: false } {
  const national = normalizeNationalDigits(rawLocal);
  if (!isValidNationalNumber(national)) return { ok: false };
  return { ok: true, e164: `${DEFAULT_DIAL_CODE}${national}` };
}

/** رقم كامل E.164 إن وُجد إدخال محلي صالح، وإلا فارغ */
export function resolveContactE164(reqLocal: string, fallbackUserPhone: string | undefined): string | null {
  const t = reqLocal.trim();
  if (t) {
    const b = buildE164FromNational(t);
    return b.ok ? b.e164 : null;
  }
  const f = (fallbackUserPhone || "").trim();
  return f || null;
}

export function hasResolvableContact(reqLocal: string, fallbackUserPhone: string | undefined): boolean {
  return resolveContactE164(reqLocal, fallbackUserPhone) != null;
}

/**
 * رقم لـ wa.me (أرقام فقط، بدون +): يدعم 964… أو شكلاً محلياً عراقياً 07xxxxxxxxx.
 */
export function toWhatsappWaMeDigits(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return null;
  const d = digitsOnly(s);
  if (!d) return null;
  if (d.startsWith("964") && d.length >= 12 && d.length <= 15) return d;
  const nat = normalizeNationalDigits(s);
  if (DEFAULT_DIAL_CODE === "+964" && /^7\d{9}$/.test(nat)) return `964${nat}`;
  if (d.length >= 10 && d.length <= 15 && !d.startsWith("0")) return d;
  return null;
}

/** رابط فتح واتساب من رقم أو https — أو null */
export function buildWhatsappOpenUrlFromRaw(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const id = toWhatsappWaMeDigits(s);
  return id ? `https://wa.me/${id}` : null;
}
