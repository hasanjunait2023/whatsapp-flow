import { useCallback, useEffect, useState } from "react";

/**
 * Landing-page theme: an independent light/dark switch scoped to the `.lp`
 * marketing surface. Deliberately separate from the app's next-themes system
 * (which toggles the `.dark` class + `ecomex-theme` key) — the landing carries
 * its own `data-theme` attribute and persists to `lp-theme`.
 *
 * No flash of the wrong theme: the initial value is resolved synchronously from
 * localStorage / prefers-color-scheme during the first render (and pre-paint by
 * the inline bootstrap in index.html, which seeds `<html data-lp-theme>`).
 */
export type LpTheme = "light" | "dark";

export const LP_THEME_KEY = "lp-theme";

function resolveInitialTheme(): LpTheme {
  if (typeof window === "undefined") return "dark";
  // 1) Honour an explicit prior choice.
  try {
    const stored = window.localStorage.getItem(LP_THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage can throw in privacy modes — fall through to system pref.
  }
  // 2) Re-use whatever the index.html bootstrap already resolved (avoids a second
  //    matchMedia read and keeps SSR-less first paint in sync).
  const seeded = document.documentElement.getAttribute("data-lp-theme");
  if (seeded === "light" || seeded === "dark") return seeded;
  // 3) Fall back to the OS preference.
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useLpTheme() {
  const [theme, setThemeState] = useState<LpTheme>(resolveInitialTheme);

  // Keep <html data-lp-theme> + color-scheme in sync so native form controls and
  // the scrollbar match the landing theme even outside the `.lp` subtree.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-lp-theme", theme);
    const prevColorScheme = root.style.colorScheme;
    root.style.colorScheme = theme;
    return () => {
      root.style.colorScheme = prevColorScheme;
    };
  }, [theme]);

  const setTheme = useCallback((next: LpTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(LP_THEME_KEY, next);
    } catch {
      // Persisting is best-effort; the in-memory state still drives the UI.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(LP_THEME_KEY, next);
      } catch {
        /* best-effort */
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
