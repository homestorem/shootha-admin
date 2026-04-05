/** أشكال المصادقة — تُحدَّث من استجابة الخادم عند تفعيل الربط */

export type AuthUser = {
  id: string;
  /** نفس `id` — معرّف Firebase Auth */
  uid?: string;
  /** معرّف المالك العام (مشتق من UID، غير قابل للإدخال يدوياً) */
  ownerId?: string;
  phone?: string;
  /** الاسم المعروض بعد التسجيل */
  display_name?: string;
  /**
   * معرّف ربط صاحب الملعب بالملعب (يُرسل للخادم عند التسجيل، لا يُعرض للمستخدم).
   */
  owner_field_link_id?: string | null;
  is_anonymous?: boolean;
  /** للتوافق مع أنظمة قديمة */
  user_metadata?: { name?: string };
};

export type AuthSession = {
  user: AuthUser;
  accessToken?: string | null;
};
