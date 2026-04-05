/** أخطاء طلب الملعب — للتوافق مع الشاشات */
export function wrapFieldRequestError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}
