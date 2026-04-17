import ar from "./locales/ar.json";
import en from "./locales/en.json";
import ku from "./locales/ku.json";

export const SUPPORTED_LANGUAGES = ["ar", "ku", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: ReadonlySet<AppLanguage> = new Set(["ar", "ku"]);

type Dict = Record<string, unknown>;

const dictionaries: Record<AppLanguage, Dict> = { ar, en, ku };

function getPath(source: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Dict)[part];
  }, source);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val == null ? "" : String(val);
  });
}

export function normalizeLanguage(code: string | null | undefined): AppLanguage {
  if (!code) return "en";
  const base = code.toLowerCase().split("-")[0] ?? "";
  if (base === "ar") return "ar";
  if (base === "ku" || base === "ckb" || base === "sor") return "ku";
  return "en";
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return RTL_LANGUAGES.has(language);
}

export function translate(language: AppLanguage, key: string, vars?: Record<string, string | number>): string {
  const current = getPath(dictionaries[language], key);
  if (typeof current === "string") return interpolate(current, vars);

  const fallback = getPath(dictionaries.en, key);
  if (typeof fallback === "string") return interpolate(fallback, vars);

  return key;
}
