/**
 * أوقات العرض: 12 ساعة مع ص/م — التخزين يبقى HH:mm في Firestore والمنطق.
 */

/** توحيد وقت من SQL أو نص إلى HH:mm (للحساب والفرز) */
export function normalizeToHm(sqlTime: string): string {
  if (!sqlTime?.trim()) return "";
  const p = sqlTime.trim().split(":");
  if (p.length >= 2) {
    const h = (p[0] || "0").padStart(2, "0");
    const m = (p[1] || "00").replace(/\D/g, "").slice(0, 2).padStart(2, "0");
    return `${h}:${m}`;
  }
  return sqlTime.trim();
}

/** عرض HH:mm بصيغة 12 ساعة مع ص (صباحاً) / م (مساءً) */
export function formatHm12HourAr(hm: string): string {
  const normalized = normalizeToHm(hm);
  if (!normalized) return "";
  const [hs, ms] = normalized.split(":");
  let h24 = parseInt(hs, 10);
  let m = parseInt(ms, 10) || 0;
  if (!Number.isFinite(h24)) h24 = 0;
  if (!Number.isFinite(m)) m = 0;
  m = Math.max(0, Math.min(59, m));
  h24 = ((h24 % 24) + 24) % 24;
  const isPm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = isPm ? "م" : "ص";
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
