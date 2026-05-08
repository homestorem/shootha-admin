/** نظام ألوان — SHOOT'HA Business: أخضر العلامة #00C853، فاتح minimal فاخر، داكن فوق صورة ملعب */

/** أخضر العلامة الرئيسي (واجهة Careem/Tesla-like) — الوضع الفاتح */
export const BRAND_GREEN = "#00C853";

/** أخضر نيون للوضع الداكن — موحّد مع الصفحة الرئيسية */
export const DARK_MODE_NEON_GREEN = "#39FF14";

export type ThemeScheme = "light" | "dark";
export type ThemeMode = ThemeScheme;

export type AppPalette = {
  scheme: ThemeScheme;
  primary: string;
  primaryDeep: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  primaryMuted: string;
  accent: string;
  accentMuted: string;
  surface: string;
  surfaceCard: string;
  surfaceMuted: string;
  background: string;
  backgroundDark: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  border: string;
  borderFocus: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  success: string;
  heroMid: string;
  heroEnd: string;
  overlay: string;
  tabBarBg: string;
};

/**
 * وضع فاتح — نفس منطق الداكن (زجاج/طبقات) مع أبيض/رمادي فاتح بدل الأسود
 * ليتماشى مع خلفية العشب الموحّدة.
 */
export const lightPalette: AppPalette = {
  scheme: "light",
  primary: BRAND_GREEN,
  primaryDeep: BRAND_GREEN,
  primaryDark: "#009624",
  primaryLight: "#69F0AE",
  primarySoft: "rgba(0, 200, 83, 0.12)",
  primaryMuted: "rgba(0, 200, 83, 0.22)",
  accent: "#FFB800",
  accentMuted: "rgba(255, 184, 0, 0.16)",
  surface: "#E8EEEA",
  surfaceCard: "rgba(255, 255, 255, 0.82)",
  surfaceMuted: "#DCE6E0",
  background: "#FFFFFF",
  backgroundDark: "#121212",
  card: "#F0F6F2",
  text: "#000000",
  textSecondary: "rgba(0, 0, 0, 0.68)",
  textMuted: "rgba(0, 0, 0, 0.52)",
  textSubtle: "rgba(0, 0, 0, 0.42)",
  textOnPrimary: "#FFFFFF",
  border: "rgba(0, 0, 0, 0.1)",
  borderFocus: BRAND_GREEN,
  danger: "#FF3B30",
  dangerSoft: "rgba(255, 59, 48, 0.12)",
  warning: "#FFB800",
  success: BRAND_GREEN,
  heroMid: "#00B359",
  heroEnd: BRAND_GREEN,
  overlay: "rgba(12, 18, 34, 0.35)",
  tabBarBg: "rgba(255, 255, 255, 0.9)"
};

/**
 * وضع داكن — فوق صورة ملعب حادة + طبقة خفيفة؛ بطاقات زجاجية في الواجهة
 */
export const darkPalette: AppPalette = {
  scheme: "dark",
  primary: DARK_MODE_NEON_GREEN,
  primaryDeep: DARK_MODE_NEON_GREEN,
  primaryDark: "#2EE85A",
  primaryLight: "#8FFF9A",
  primarySoft: "rgba(57, 255, 20, 0.16)",
  primaryMuted: "rgba(57, 255, 20, 0.32)",
  accent: "#FFB800",
  accentMuted: "rgba(255, 184, 0, 0.14)",
  surface: "#121212",
  surfaceCard: "rgba(30, 30, 30, 0.72)",
  surfaceMuted: "#2C2C2C",
  background: "#000000",
  backgroundDark: "#000000",
  card: "#1E1E1E",
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.72)",
  textMuted: "rgba(255, 255, 255, 0.55)",
  textSubtle: "rgba(255, 255, 255, 0.45)",
  textOnPrimary: "#FFFFFF",
  border: "rgba(255, 255, 255, 0.12)",
  borderFocus: DARK_MODE_NEON_GREEN,
  danger: "#FF3B30",
  dangerSoft: "rgba(255, 59, 48, 0.16)",
  warning: "#FFB800",
  success: DARK_MODE_NEON_GREEN,
  heroMid: "#004D2E",
  heroEnd: DARK_MODE_NEON_GREEN,
  overlay: "rgba(0, 0, 0, 0.5)",
  tabBarBg: "rgba(28, 28, 28, 0.82)"
};

export function paletteFor(mode: ThemeMode): AppPalette {
  return mode === "dark" ? darkPalette : lightPalette;
}

export const colors = lightPalette;
