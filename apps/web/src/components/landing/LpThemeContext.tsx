import { createContext, useContext, type ReactNode } from "react";

import { useLpTheme, type LpTheme } from "./useLpTheme";

interface LpThemeValue {
  theme: LpTheme;
  setTheme: (next: LpTheme) => void;
  toggleTheme: () => void;
}

const LpThemeContext = createContext<LpThemeValue | null>(null);

/**
 * Provides the landing theme to the `.lp` root (which sets `data-theme`) and the
 * Nav toggle. Low-frequency state read by few consumers — context is the right
 * tool here (not an external store).
 */
export function LpThemeProvider({ children }: { children: (theme: LpTheme) => ReactNode }) {
  const value = useLpTheme();
  return <LpThemeContext.Provider value={value}>{children(value.theme)}</LpThemeContext.Provider>;
}

export function useLpThemeContext(): LpThemeValue {
  const ctx = useContext(LpThemeContext);
  if (!ctx) {
    throw new Error("useLpThemeContext must be used within <LpThemeProvider>");
  }
  return ctx;
}
