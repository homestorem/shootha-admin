/**
 * معرّف مالك بسيط ومستقر من Firebase UID — لا يُكرَّر لنفس المستخدم.
 * الصيغة: owner_ + آخر 6 أحرف من uid.
 */
export function deriveOwnerIdFromUid(uid: string): string {
  const tail = uid.length >= 6 ? uid.slice(-6) : uid;
  return `owner_${tail}`;
}
