/** أسماء الأيام بالعربية — يتوافق مع `Date.getDay()` / `dayjs().day()` (٠ = الأحد … ٦ = السبت). */
export const AR_WEEKDAY_FROM_JS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت"
] as const;

export function getArabicWeekdayName(jsDay: number): string {
  return AR_WEEKDAY_FROM_JS[((jsDay % 7) + 7) % 7];
}
