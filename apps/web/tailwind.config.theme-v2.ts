/**
 * Tailwind config extension for What A App theme v2
 *
 * Adds:
 *   - lp-* color slots (alias to CSS vars from theme.css)
 *   - lp-* animation keyframes (motion library)
 *   - lp-* animation utilities
 *
 * The :root defaults in index.css use Palette C (Violet + Amber).
 * Override at runtime by setting `data-palette="A" | "B" | "C"` on `<html>`.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Hind Siliguri"', "system-ui", "sans-serif"],
        bn: ['"Hind Siliguri"', '"Inter"', "sans-serif"],
        display: ['"Inter"', '"Hind Siliguri"', "system-ui", "sans-serif"],
        mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', '"Roboto Mono"', "monospace"],
      },
      colors: {
        // ─────────────────────────────────────────────────────────────
        // LP (landing page) — direct CSS var passthrough from theme.css
        // ─────────────────────────────────────────────────────────────
        lp: {
          bg: "var(--lp-bg)",
          "bg-1": "var(--lp-bg-1)",
          surface: "var(--lp-surface)",
          "surface-2": "var(--lp-surface-2)",
          "surface-glass": "var(--lp-surface-glass)",
          elevated: "var(--lp-elevated)",
          text: "var(--lp-text)",
          muted: "var(--lp-text-muted)",
          dim: "rgb(var(--lp-text-dim-rgb) / <alpha-value>)",
          border: "var(--lp-border)",
          "border-strong": "var(--lp-border-strong)",
          "border-accent": "var(--lp-border-accent)",

          // Brand
          primary: "var(--lp-primary)",
          "primary-hover": "var(--lp-primary-hover)",
          "primary-text": "var(--lp-primary-text)",
          "primary-text-strong": "var(--lp-primary-text-strong)",
          "on-primary": "var(--lp-on-primary)",
          "primary-rgb": "rgb(var(--lp-primary-rgb) / <alpha-value>)",

          // CTA — action color (separate from brand)
          cta: "var(--lp-cta)",
          "cta-hover": "var(--lp-cta-hover)",
          "cta-rgb": "rgb(var(--lp-cta-rgb) / <alpha-value>)",
          "on-cta": "var(--lp-on-cta)",

          // Status
          success: "var(--lp-success)",
          warning: "var(--lp-warning)",
          danger: "var(--lp-danger)",

          // WhatsApp / channel
          wa: "var(--lp-wa)",
          "wa-rgb": "rgb(var(--lp-wa-rgb) / <alpha-value>)",
          "wa-text": "var(--lp-wa-text)",
          "on-wa": "var(--lp-on-wa)",

          // Glows
          "glow-primary": "var(--lp-glow-primary)",
          "glow-cta": "var(--lp-glow-cta)",
        },
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
        "3xl": "var(--r-3xl)",
        pill: "var(--r-pill)",
        card: "var(--r-xl)",
        control: "var(--r-md)",
      },
      boxShadow: {
        "elevation-1": "var(--elevation-1)",
        "elevation-2": "var(--elevation-2)",
        "elevation-3": "var(--elevation-3)",
        "elevation-4": "var(--elevation-4)",
        "glass-depth": "var(--glass-depth)",
        "glass-depth-strong": "var(--glass-depth-strong)",
        "glass-depth-hover": "var(--glass-depth-hover)",
        "glow-primary": "0 4px 14px -3px var(--lp-glow-primary)",
        "glow-cta": "0 4px 14px -3px var(--lp-glow-cta)",
      },
      transitionTimingFunction: {
        spring: "var(--lp-ease-spring)",
        "spring-strong": "var(--lp-ease-spring-strong)",
      },
      transitionDuration: {
        instant: "var(--dur-instant)",
        fast: "var(--dur-fast)",
        DEFAULT: "var(--dur)",
        slow: "var(--dur-slow)",
        stage: "var(--dur-stage)",
        cinematic: "var(--dur-cinematic)",
      },
      keyframes: {
        // Existing keyframes from prior config — kept for back-compat
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },

        // New motion library — matches theme.css
        "lp-fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "lp-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "lp-pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--lp-glow-cta)" },
          "50%":      { boxShadow: "0 0 0 12px transparent" },
        },
        "lp-shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "lp-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "lp-orbit": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "lp-scale-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "lp-slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        "lp-slide-in-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },

        // Legacy animations (kept for back-compat with existing components)
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to:   { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to:   { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%":   { opacity: "0", transform: "scale(0.3)" },
          "50%":  { transform: "scale(1.05)" },
          "70%":  { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(0.8)", opacity: "0.8" },
          "50%":  { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(0.8)", opacity: "0.8" },
        },
      },
      animation: {
        // Motion library (matches theme.css)
        "lp-fade-up": "lp-fade-up var(--dur-slow) var(--lp-ease) forwards",
        "lp-fade-in": "lp-fade-in var(--dur) var(--lp-ease) forwards",
        "lp-pulse-glow": "lp-pulse-glow 3s var(--lp-ease-inout) infinite",
        "lp-shimmer": "lp-shimmer 2.5s linear infinite",
        "lp-float": "lp-float 6s var(--lp-ease-inout) infinite",
        "lp-orbit-slow": "lp-orbit 30s linear infinite",
        "lp-orbit-reverse": "lp-orbit 40s linear infinite reverse",
        "lp-scale-in": "lp-scale-in var(--dur) var(--lp-ease-spring) forwards",
        "lp-slide-in-right": "lp-slide-in-right var(--dur-slow) var(--lp-ease) forwards",
        "lp-slide-in-up": "lp-slide-in-up var(--dur-slow) var(--lp-ease) forwards",

        // Legacy (kept for back-compat)
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "bounce-in": "bounce-in 0.5s ease-out",
        shake: "shake 0.5s ease-in-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      backdropSaturate: {
        glass: "var(--glass-saturate)",
      },
      perspective: {
        "3d": "1000px",
      },
      transformStyle: {
        "3d": "preserve-3d",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;