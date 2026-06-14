# What A App — Design Tokens Reference (TOKENS.md)

> The **agent/human-readable** mirror of the design tokens that already ship in the repo.
> Machine source of truth (never diverge from these — change the source, then this file):
> - App world: `apps/web/src/index.css` (`:root` and `.dark`, `.scheme-*`)
> - Landing/social world: `apps/web/src/styles/landing.css` (`.lp`, `.lp[data-theme]`)
> - Tailwind mappings: `apps/web/tailwind.config.ts`
>
> CSS stores color as **HSL channels** (`H S% L%`) consumed via `hsl(var(--token))`.
> Hex + oklch below are computed equivalents for design/content tools that need them.
> **In product code, reference the CSS variable — never paste a hex.**

---

## 1. World A — "Warm Light Fintech" (the APP), light/default

### Canvas & surfaces
| Token (CSS var) | HSL channels | Hex | oklch (approx) | Use |
|---|---|---|---|---|
| `--background` | `40 30% 94%` | `#F5F2EC` | `oklch(95% 0.012 80)` | App page background (cream) |
| `--foreground` | `40 6% 10%` | `#1A1A18` | `oklch(22% 0.004 80)` | Primary text (ink) |
| `--card` | `42 36% 98%` | `#FCFAF6` | `oklch(98% 0.008 85)` | Card / surface |
| `--muted` | `38 22% 90%` | `#F0EBE2` | `oklch(92% 0.013 80)` | Surface-2 / muted fills |
| `--muted-foreground` | `36 8% 45%` | `#7A736A` | `oklch(53% 0.012 70)` | Muted/secondary text |
| `--border` | `38 25% 86%` | `#E6DFD3` | `oklch(89% 0.016 80)` | Hairlines, dividers |

### Brand / accent — the single orange
| Token | HSL | Hex | oklch | Use |
|---|---|---|---|---|
| `--primary` / `--brand` | `12 86% 56%` | `#F0552B` | `oklch(64% 0.20 32)` | THE accent. CTAs, the one highlight tile, active states. |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | — | Text/icons on orange fill |
| `--brand-light` / `--accent` | `16 80% 94%` | `#FCE7DD` | `oklch(94% 0.03 45)` | Soft orange tint surface, active sidebar item |
| `--secondary` | `40 6% 14%` | `#26241F` | `oklch(26% 0.005 80)` | Near-black secondary buttons (Finexy dark buttons) |

### Status — solid + soft pill
| Role | Solid HSL / Hex | Soft (pill bg) HSL | Use |
|---|---|---|---|
| Success | `142 67% 37%` / `#1F9D52` | `142 50% 92%` | Confirmed / delivered |
| Warning | `35 83% 42%` / `#C57C12` | `38 75% 91%` | Pending / attention |
| Info | `216 69% 51%` / `#2D74D6` | `216 70% 93%` | Neutral info |
| Destructive | `4 66% 54%` / `#D6483C` | `6 75% 93%` | Failed / ban / danger |

### Channel brand (shared across both worlds)
| Channel | HSL | Hex | Use |
|---|---|---|---|
| WhatsApp | `145 63% 49%` | `#25D366` | WA channel chip; "it worked" green |
| Facebook | `214 89% 52%` | `#1877F2` | FB channel chip |
| Instagram | `329 70% 52%` | `#DB2E7E`* | IG channel chip (*single-hue stand-in; IG's real mark is a gradient — see note) |

> Instagram note: the IG token is a flat pink for chips. For a true IG brand moment use IG's official
> gradient (`#F58529 → #DD2A7B → #8134AF → #515BD4`) **only on the IG logo itself**, never as a UI accent.

### Shape, elevation, glass (World A)
| Token | Value | Use |
|---|---|---|
| `--radius` | `1rem` (16px) | base radius |
| `rounded-card` | `20px` | cards, stat tiles, modals, sheets — the signature |
| `rounded-control` | `12px` | buttons, inputs, selects, the logo square |
| `--elevation-1/2/3` | warm multi-layer shadows (`--shadow-color: 36 30% 20%`) | soft, never pure black |
| `--elevation-accent` | `0 6px 20px -6px hsl(var(--primary)/.35)` | glow under primary CTA |
| `.glass` | `blur(16px) saturate(140%)` over `--glass-bg` | sticky chrome/overlays only — never over dense text/tables |

### Gradients (World A) — defined as utilities in `index.css`
- `.gradient-brand`: `135deg, --brand → --primary` (warm orange sweep)
- `.gradient-primary` / `.text-gradient`: `135deg, --primary → --chart-2` (orange → near-black)
- `.gradient-success` / `-warning` / `-destructive`: status sweeps
> Use gradients sparingly — for hero tiles and the one highlight, not as default card fills.

### Theme variants (already in repo)
- `.dark` — "night shift": warm charcoal `#16140F`, brighter orange `#FB7B57`. Full set in `index.css`.
- `.scheme-blue / -green / -purple` — alternate accent schemes (maroon/orange is default). Tenants can
  re-accent; **brand default for marketing is always the orange.**

---

## 2. World B — "Near-Black Violet Luxury" (LANDING / social), dark default

Source: `apps/web/src/styles/landing.css`, scoped `.lp`. Ships its own light sub-theme too
(`.lp[data-theme="light"]`); values below are the default dark.

### Canvas & surfaces
| Token | Hex | Use |
|---|---|---|
| `--lp-bg` | `#08080c` | base near-black (faint violet undertone) |
| `--lp-bg-1` | `#0c0c13` | secondary bg layer |
| `--lp-surface` | `#111119` | card surface (put Bangla body here) |
| `--lp-surface-2` | `#15151f` | raised surface |
| `--lp-elevated` | `#16131f` | elevated card |

### Violet ramp (primary / brand)
| Token | Hex | Use |
|---|---|---|
| `--lp-violet-500` / `--lp-accent` | `#8b5cf6` | primary fill / brand accent |
| `--lp-violet-600` / `--lp-accent-hover` | `#7c3aed` | hover |
| `--lp-violet-400` / `--lp-accent-text` | `#a78bfa` | violet accent **text** on dark (AA) |
| `--lp-violet-300` | `#c4b5fd` | stronger accent text |
| `--lp-violet-700` | `#6d28d9` | deep violet |

### Green (WhatsApp / success — scarce + meaningful)
| Token | Hex | Use |
|---|---|---|
| `--lp-green-500` | `#25D366` | WhatsApp brand fill |
| `--lp-green-400` / `--lp-green-text` | `#34d399` | success text / ticks on dark (AA) |
| `--lp-green-600` | `#1ebe5d` | green hover |
| `--lp-on-green` | `#04130a` | text on green fill (AA 9.6:1) |

### Text & borders (dark)
| Token | Hex | Use |
|---|---|---|
| `--lp-text` | `#f4f4f6` | headings/body |
| `--lp-text-muted` | `#a1a1b5` | secondary |
| `--lp-text-dim` | `#82829a` | tertiary (AA-safe small text) |
| `--lp-danger` | `#f87171` | problem cards / errors |
| `--lp-border` | `rgba(255,255,255,.08)` | hairline |

### Shape & motion (World B)
| Token | Value |
|---|---|
| radii | `--lp-r-sm 10` · `-md 16` · `-lg 20` · `-xl 28` · `-pill 9999` |
| section space | `--lp-space-section: clamp(4rem, 3rem + 6vw, 7.5rem)` |
| motion | `--lp-dur-fast 150ms` · `--lp-dur 250ms` · `--lp-dur-slow 450ms` · ease `cubic-bezier(.22,1,.36,1)` |

---

## 3. Typography tokens

Fonts are loaded in `apps/web/index.html` (Google Fonts, non-blocking, `display=swap`):
`Inter:400,500,600,700` · `Hind Siliguri:400,500,600` · `Noto Serif Bengali:400,500,600,700`.

### Families by surface
| Surface | Latin | Bangla | CSS source |
|---|---|---|---|
| App UI body | `"Inter"` | `"Hind Siliguri"` | `index.css` `body` + `:lang(bn)` block |
| Landing / social | `"Inter"` | `"Noto Serif Bengali"` | `landing.css` `--lp-font-sans` / `--lp-font-bn` |

App body stack: `"Inter", "Hind Siliguri", system-ui, -apple-system, sans-serif` with
`font-feature-settings: "cv11" 1, "ss01" 1`. Bangla (`:lang(bn)` / `[lang="bn"]`) flips to
`"Hind Siliguri", "Inter", sans-serif` so Bangla never falls back to the serif inside the app.

### Numbers
Always tabular + lining via `.tabular-nums`, `.stat-value`, `td.num`, `.amount`
(`font-variant-numeric: tabular-nums lining-nums`). Use these classes for every COD amount, price,
order count, and metric so digits align in columns.

### Type scale
**App (use Tailwind text sizes):** body 15–16px, labels 13px, stat numbers 28–40px semibold,
section headers 18–20px semibold. 16px is the **minimum for Bangla body** (one step above Latin).

**Landing/social (fluid, from `landing.css`):**
| Token | clamp() |
|---|---|
| `--lp-text-display` | `clamp(2.5rem, 1.4rem + 5.2vw, 5rem)` |
| `--lp-text-h2` | `clamp(1.75rem, 1.1rem + 2.8vw, 3rem)` |
| `--lp-text-h3` | `clamp(1.125rem, 1rem + 0.6vw, 1.375rem)` |
| `--lp-text-lead` | `clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem)` |
| `--lp-price` | `clamp(2rem, 1.4rem + 2.6vw, 2.75rem)` |

### Weights
- Inter: 400 body · 500 medium labels · 600 headings/UI emphasis · 700 display only.
- Hind Siliguri: 400 body · 500 labels · 600 emphasis (no 700 loaded — don't request it).
- Noto Serif Bengali: 400 body · 600 subheads · 700 display.

### Bangla legibility rules (apply in every surface)
1. Bangla body min **16px**; never below.
2. Bangla line-height **≥1.6** (Latin 1.5) — matras need vertical room.
3. Bangla **never on a gradient or photo** without a solid plate behind it.
4. Don't letter-spaced-track Bangla (breaks conjuncts). Tracking is Latin-only.
5. In the app, Bangla = Hind Siliguri (sans). In landing/social headlines, Bangla = Noto Serif Bengali. Don't cross them.

---

## 4. Quick "which token" decision guide for agents

- Making an **in-app screen**? → World A tokens, `hsl(var(--…))`, one orange highlight max.
- Making a **landing section or ad/social creative**? → World B tokens (`--lp-*`), violet accent, green only for "it worked".
- Showing a **channel** (WA/FB/IG)? → channel tokens above; never recolor a channel's brand.
- Showing **money/counts**? → tabular-lining number classes, ink (app) or `--lp-text` (landing).
- Need **emphasis on cream**? → orange fill/border/icon, ink text — not orange text.
