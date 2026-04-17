import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode, paletteFor, type AppPalette } from "../theme/colors";
import { AppLanguage, isRtlLanguage, normalizeLanguage, translate } from "../i18n";

const STORAGE_WHATSAPP = "@settings_support_whatsapp";
const STORAGE_TERMS_URL = "@settings_terms_url";
const STORAGE_THEME = "@settings_theme_mode";
const STORAGE_LANGUAGE = "@settings_language";

type SettingsContextType = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage, options?: { skipStorage?: boolean }) => void;
  isRTL: boolean;
  dir: "rtl" | "ltr";
  textAlign: "right" | "left";
  tr: (key: string, vars?: Record<string, string | number>) => string;
  palette: AppPalette;
  supportWhatsappRaw: string;
  termsUrlRaw: string;
  setSupportLinks: (whatsapp: string, termsUrl: string) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [supportWhatsappRaw, setSupportWhatsappRaw] = useState("");
  const [termsUrlRaw, setTermsUrlRaw] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const entries = await AsyncStorage.multiGet([STORAGE_WHATSAPP, STORAGE_TERMS_URL, STORAGE_THEME, STORAGE_LANGUAGE]);
        if (!alive) return;
        setSupportWhatsappRaw(entries[0][1] ?? "");
        setTermsUrlRaw(entries[1][1] ?? "");
        const tm = entries[2][1];
        if (tm === "dark" || tm === "light") {
          setThemeState(tm);
        }
        const persistedLanguage = normalizeLanguage(entries[3][1]);
        if (entries[3][1]) {
          setLanguageState(persistedLanguage);
        } else {
          const deviceLanguage = normalizeLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
          setLanguageState(deviceLanguage);
          void AsyncStorage.setItem(STORAGE_LANGUAGE, deviceLanguage);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    void AsyncStorage.setItem(STORAGE_THEME, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      void AsyncStorage.setItem(STORAGE_THEME, next);
      return next;
    });
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage, options?: { skipStorage?: boolean }) => {
    setLanguageState(nextLanguage);
    if (!options?.skipStorage) {
      void AsyncStorage.setItem(STORAGE_LANGUAGE, nextLanguage);
    }
  }, []);

  const setSupportLinks = useCallback(async (whatsapp: string, termsUrl: string) => {
    const w = whatsapp.trim();
    const u = termsUrl.trim();
    setSupportWhatsappRaw(w);
    setTermsUrlRaw(u);
    await AsyncStorage.multiSet([
      [STORAGE_WHATSAPP, w],
      [STORAGE_TERMS_URL, u]
    ]);
  }, []);

  const palette = useMemo(() => paletteFor(theme), [theme]);
  const isRTL = useMemo(() => isRtlLanguage(language), [language]);
  const dir = (isRTL ? "rtl" : "ltr") as "rtl" | "ltr";
  const textAlign = (isRTL ? "right" : "left") as "right" | "left";
  const tr = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      language,
      setLanguage,
      isRTL,
      dir,
      textAlign,
      tr,
      palette,
      supportWhatsappRaw,
      termsUrlRaw,
      setSupportLinks
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      language,
      setLanguage,
      isRTL,
      dir,
      textAlign,
      tr,
      palette,
      supportWhatsappRaw,
      termsUrlRaw,
      setSupportLinks
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("Settings context is not initialized.");
  return ctx;
};
