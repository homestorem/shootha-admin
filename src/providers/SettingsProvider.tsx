import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { ThemeMode } from "../theme/colors";
import { t } from "../strings";

type SettingsContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>("light");

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light"))
    }),
    [theme]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error(t.errors.useSettingsContext);
  return ctx;
};
