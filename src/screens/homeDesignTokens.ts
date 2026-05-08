import { DARK_MODE_NEON_GREEN } from "../theme/colors";

/** ألوان مرجع تصميم الصفحة الرئيسية (SHOOT'HA Business — داكن + نيون) */
export const HOME_NEON = DARK_MODE_NEON_GREEN;
export const HOME_NEON_DIM = "rgba(57, 255, 20, 0.35)";
export const HOME_ACCENT = "#2ECC71";
export const HOME_GRADIENT_TOP = "rgba(26, 61, 44, 0.88)";
export const HOME_GRADIENT_MID = "rgba(15, 36, 24, 0.84)";
export const HOME_GRADIENT_BOTTOM = "rgba(5, 5, 5, 0.8)";
export const HOME_CARD_BG = "rgba(20, 28, 22, 0.92)";
export const HOME_CARD_BORDER = "rgba(255, 255, 255, 0.14)";

/** نفس بنية التدرج الداكن — نسخة فاتحة (أبيض/رمادي فاتح بدل الأسود) */
export const HOME_LIGHT_GRADIENT_TOP = "#e2f0ea";
export const HOME_LIGHT_GRADIENT_MID = "#c8e4d6";
export const HOME_LIGHT_GRADIENT_BOTTOM = "#f5faf7";
/** توقف وسيطة للتدرج العلوي→سفلي (مرآة الوضع الداكن) */
export const HOME_LIGHT_GRADIENT_STOPS = [
  HOME_LIGHT_GRADIENT_TOP,
  HOME_LIGHT_GRADIENT_MID,
  "rgba(236, 248, 241, 0.94)",
  "rgba(250, 252, 251, 0.5)",
  "rgba(255, 255, 255, 0)"
] as const;
