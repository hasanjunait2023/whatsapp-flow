import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Hind Siliguri"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          soft: "hsl(var(--destructive-soft))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
          light: "hsl(var(--brand-light))",
        },
        whatsapp: {
          DEFAULT: "hsl(var(--whatsapp))",
          foreground: "hsl(var(--whatsapp-foreground))",
          light: "hsl(var(--whatsapp-light))",
        },
        facebook: "hsl(var(--facebook))",
        instagram: "hsl(var(--instagram))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          soft: "hsl(var(--muted-soft))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Landing-page palette — scoped under `.lp` (see src/styles/landing.css).
        // Two themes (light + dark) switched by `data-theme` on the `.lp` root.
        // Every value resolves a CSS variable so utilities re-theme automatically.
        lp: {
          bg: "var(--lp-bg)",
          "bg-1": "var(--lp-bg-1)",
          surface: "var(--lp-surface)",
          "surface-2": "var(--lp-surface-2)",
          elevated: "var(--lp-elevated)",
          text: "var(--lp-text)",
          muted: "var(--lp-text-muted)",
          // `dim` supports opacity modifiers (bg-lp-dim/50, text-lp-dim/80).
          dim: "rgb(var(--lp-text-dim-rgb) / <alpha-value>)",
          // Theme-agnostic semantic aliases (preferred for new code).
          accent: "rgb(var(--lp-accent-rgb) / <alpha-value>)",
          "accent-hover": "var(--lp-accent-hover)",
          "accent-text": "rgb(var(--lp-accent-text-rgb) / <alpha-value>)",
          "accent-text-strong": "var(--lp-accent-text-strong)",
          "on-accent": "var(--lp-on-accent)",
          "green-text": "var(--lp-green-text)",
          "on-green": "var(--lp-on-green)",
          danger: "var(--lp-danger)",
          // Ramp slots use rgb(var() / <alpha-value>) so both solid (bg-lp-violet-500)
          // and opacity-modified (bg-lp-violet-500/10) utilities re-theme correctly.
          violet: {
            50: "rgb(var(--lp-violet-50-rgb) / <alpha-value>)",
            300: "rgb(var(--lp-violet-300-rgb) / <alpha-value>)",
            400: "rgb(var(--lp-violet-400-rgb) / <alpha-value>)",
            500: "rgb(var(--lp-violet-500-rgb) / <alpha-value>)",
            600: "rgb(var(--lp-violet-600-rgb) / <alpha-value>)",
            700: "rgb(var(--lp-violet-700-rgb) / <alpha-value>)",
          },
          green: {
            400: "rgb(var(--lp-green-400-rgb) / <alpha-value>)",
            500: "rgb(var(--lp-green-500-rgb) / <alpha-value>)",
            600: "rgb(var(--lp-green-600-rgb) / <alpha-value>)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Design-system radius scale (§3.2)
        card: "20px",       // cards, stat cards, modals, sheets — Finexy signature
        control: "12px",    // buttons, inputs, selects, dropdowns
      },
      boxShadow: {
        // Warm, diffuse elevation scale (§3.3) — token-driven so dark theme re-themes.
        "elevation-1": "var(--elevation-1)",
        "elevation-2": "var(--elevation-2)",
        "elevation-3": "var(--elevation-3)",
        "elevation-accent": "var(--elevation-accent)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "50%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(0.8)", opacity: "0.8" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
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
        "shake": "shake 0.5s ease-in-out",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
