import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

import { useLpThemeContext } from "../LpThemeContext";

/**
 * Sun/moon theme toggle for the landing Nav. Switches the `.lp` surface between
 * the premium dark and the soft light theme. The icon shows the theme you'll get
 * when you click (sun while dark, moon while light), and the accessible label
 * describes the action.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useLpThemeContext();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] text-lp-muted transition-colors [transition-duration:var(--lp-dur-fast)] hover:border-[var(--lp-border-strong)] hover:text-lp-text",
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
