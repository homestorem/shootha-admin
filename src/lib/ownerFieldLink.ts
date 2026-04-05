import Constants from "expo-constants";

/**
 * معرّف ربط صاحب الملعب بالملعب — لا يُعرض في الواجهة.
 * يُحدَّد عبر رابط دعوة، أو متغير بيئة، أو `app.json` → `extra.fieldOwnerLinkId`.
 */
export function getOwnerFieldLinkFromConfig(): string | null {
  const env = typeof process !== "undefined" ? process.env.EXPO_PUBLIC_FIELD_OWNER_LINK_ID?.trim() : "";
  if (env) return env;
  const extra = Constants.expoConfig?.extra as { fieldOwnerLinkId?: string } | undefined;
  const fromExtra = extra?.fieldOwnerLinkId?.trim();
  return fromExtra || null;
}
