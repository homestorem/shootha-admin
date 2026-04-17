const ARABIC_KURDISH_LATIN_NAME_REGEX = /^[\p{Script=Arabic}\p{Script=Latin}\s'.-]+$/u;
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'’+\-.]+)@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function normalizeArabicText(value: string): string {
  return value
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUserInput(value: string): string {
  return normalizeArabicText(value).trim();
}

export function isValidLocalizedName(value: string): boolean {
  const v = normalizeUserInput(value);
  if (v.length < 2 || v.length > 80) return false;
  return ARABIC_KURDISH_LATIN_NAME_REGEX.test(v);
}

export function isValidEmailStrict(value: string): boolean {
  const v = normalizeUserInput(value).toLowerCase();
  if (v.length > 254) return false;
  return EMAIL_REGEX.test(v);
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}
