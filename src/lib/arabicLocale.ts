/** أرقام عربية للعرض (٠–٩) */
const EASTERN = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => EASTERN[Number(d)] ?? d);
}

/** نص تقدّم خطوات المعالج بالعربية فقط */
export function formatWizardStep(currentOneBased: number, total: number, stepTitle: string): string {
  return `الخطوة ${toArabicDigits(currentOneBased)} من ${toArabicDigits(total)} — ${stepTitle}`;
}
