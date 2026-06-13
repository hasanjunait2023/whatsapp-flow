# WhatsApp/Facebook/Instagram CRM — Design System

> Single source of visual truth for the multi-tenant f-commerce CRM SaaS (Bangladesh market).
> Admin panel + Tenant panel, 59 pages. Staff use this **all day** — comfort, low eye-strain, and zero friction win over novelty.
>
> **This is a token-driven RESTYLE, not a rewrite.** The app already ships shadcn-style HSL tokens in `src/index.css`, CVA-variant primitives in `src/components/ui/`, `tailwindcss-animate`, and shells in `src/components/layout/`. Every change below maps onto an existing token or component. Engineers edit token values + a handful of variant strings; they do not rebuild components.
>
> Status: **PLAN / GATE 1 spec.** No implementation here.

---

## 0. Design Principles (the non-negotiables)

1. **All-day comfort first.** No pure `#FFFFFF`, no pure `#000000`. Cream canvas + near-black ink. AA contrast minimum, but we deliberately sit *below* maximum contrast on body text to cut glare.
2. **Calm by default, warm on intent.** Neutral surfaces carry 90% of the UI. The orange accent is reserved for primary action, active nav, and "look here" — it must stay rare to stay loud.
3. **One predictable layout.** Same shell, same density, same card rhythm on every one of the 59 pages. A manager who learns Orders knows where everything is in Accounting.
4. **Fast feedback over fancy motion.** Optimistic UI + skeletons + 150–220ms transitions. No animation may cost a frame on a mid-range Android (Redmi-class). Compositor properties only.
5. **Dense where it earns it.** Hero stat cards breathe; data tables are tight. Density is a deliberate choice per surface, not an accident.
6. **Bengali is a first-class citizen,** not an afterthought. The UI font must read cleanly at 13–14px in long lists.

---

## 1. COLOR SYSTEM (the centerpiece)

### 1.1 Three directions

**Direction A — "Warm Light Fintech" (RECOMMENDED).**
Cream canvas (`#F5F2EC`), white-cream cards, warm orange accent (`#F0552B`), near-black ink (`#1A1A18`). Directly channels the founder's Finexy reference: friendly, premium, low-glare, unmistakably *not* a generic SaaS dashboard. Carries a disciplined dark theme for night shifts. **This is the one to build.**

**Direction B — "Dual / Soft Neutral".**
A cooler, more neutral grey-slate light + dark pair with the same orange accent. Safer, more "Linear/Notion", but it throws away the warmth that makes the reference feel premium and human. Good fallback if the founder finds the cream too warm on cheap monitors. Lower risk, lower personality.

**Direction C — "Premium Dark + Glass".**
Dark-first, glassy charcoal surfaces, neon-orange accent, frosted panels. Looks stunning in a screenshot and great for demos. **Wrong for the job:** staff stare at this 8 hrs/day entering orders; a dark-first data-entry tool fatigues the eye on long tables and washes out in bright Dhaka офис lighting. Keep dark as an *option*, not the default.

> **Recommendation: Direction A**, with dark theme shipped from day one (not bolted on later). Rationale: matches the founder's target aesthetic, is the most comfortable for full-day data work, and is the lowest-effort restyle of the current maroon tokens — we are rotating hue + warming neutrals, not re-architecting.

### 1.2 The accent (orange family)

| Token | Hex | HSL | Use |
|---|---|---|---|
| `accent-500` (primary) | `#F0552B` | `12 86% 56%` | Primary CTA fill, active nav, key highlights |
| `accent-600` (hover) | `#D8431D` | `12 77% 48%` | Primary hover/pressed |
| `accent-400` (light) | `#FB7B57` | `14 95% 66%` | Dark-theme accent (brighter for contrast) |
| `accent-soft` (tint) | `#FCE9E1` | `16 80% 94%` | Soft accent background (selected rows, chips) |

`#F0552B` is the locked brand orange. It hits AA (4.6:1) on cream for large text and as a button fill with white text (4.7:1). Do **not** use it for body text on light.

### 1.3 The neutral scale (warm grey, never blue-grey)

All neutrals carry a hint of warmth (hue ~30–40, very low saturation) so they sit with the cream instead of fighting it.

| Step | Light hex | Dark hex | Role |
|---|---|---|---|
| canvas | `#F5F2EC` | `#16140F` | App background |
| surface | `#FCFAF6` | `#1E1B16` | Cards, sheets |
| surface-2 | `#F0EBE2` | `#26221B` | Subtle raised / hover fills |
| border | `#E6DFD3` | `#322D24` | Hairlines |
| ink-muted | `#7A736A` | `#A39A8C` | Secondary text, labels |
| ink | `#1A1A18` | `#F4F1EA` | Primary text |

### 1.4 Status colors (+ soft backgrounds for pills)

Each status ships a **solid** (text/icon/strong fill) and a **soft** (pill background). Pills use soft-bg + solid-text for the calm, readable Finexy look — not saturated fills.

| Status | Solid (light) | Soft bg (light) | Solid (dark) | Soft bg (dark) | Maps to |
|---|---|---|---|---|---|
| Success / Completed | `#1F9D55` `142 67% 37%` | `#E3F4EA` `142 50% 92%` | `#34C77B` | `142 40% 16%` | `--success` |
| Warning / Pending | `#C77C12` `35 83% 42%` | `#FBEFD8` `38 75% 91%` | `#E5A23B` | `38 50% 18%` | `--warning` |
| Info / In Progress | `#2B72D8` `216 69% 51%` | `#E2ECFB` `216 70% 93%` | `#5C9BF0` | `216 55% 20%` | `--info` |
| Destructive / Failed | `#D6453C` `4 66% 54%` | `#FBE4E2` `6 75% 93%` | `#F0635A` | `6 55% 20%` | `--destructive` |
| Neutral / Draft | `#7A736A` | `#EFEAE1` | `#A39A8C` | `#2A261F` | `--muted` |

> WhatsApp green (`#25D366`) and Facebook blue (`#1877F2`) stay as **channel brand** tokens only (channel badges/icons), never as UI status — keeps channel identity legible without polluting the status language.

### 1.5 Full token set — drop-in for `src/index.css`

Replaces the current maroon `:root` / `.dark` blocks. Same variable names the app already consumes, so **no component edits needed** for the recolor. New tokens are additive (`--*-soft`, `--shadow-*`, `--glass-*`, `--accent` semantics unchanged).

```css
/* ---------- LIGHT (default) ---------- */
:root {
  /* Canvas & surfaces */
  --background: 40 30% 94%;       /* #F5F2EC cream */
  --foreground: 40 6% 10%;        /* #1A1A18 ink */
  --card: 42 36% 98%;             /* #FCFAF6 */
  --card-foreground: 40 6% 10%;
  --popover: 42 36% 98%;
  --popover-foreground: 40 6% 10%;

  /* Accent = warm orange (primary) */
  --primary: 12 86% 56%;          /* #F0552B */
  --primary-foreground: 0 0% 100%;
  --brand: 12 86% 56%;
  --brand-foreground: 0 0% 100%;
  --brand-light: 16 80% 94%;      /* accent-soft */

  /* Secondary = near-black (Finexy's dark buttons) */
  --secondary: 40 6% 14%;         /* #26241F near-black */
  --secondary-foreground: 0 0% 100%;

  --muted: 38 22% 90%;            /* surface-2 #F0EBE2 */
  --muted-foreground: 36 8% 45%;  /* ink-muted #7A736A */
  --accent: 16 80% 94%;           /* soft orange tint surface */
  --accent-foreground: 12 77% 40%;

  /* Status — solid */
  --success: 142 67% 37%;
  --success-foreground: 0 0% 100%;
  --warning: 35 83% 42%;
  --warning-foreground: 0 0% 100%;
  --info: 216 69% 51%;
  --info-foreground: 0 0% 100%;
  --destructive: 4 66% 54%;
  --destructive-foreground: 0 0% 100%;

  /* Status — soft pill backgrounds (NEW) */
  --success-soft: 142 50% 92%;
  --warning-soft: 38 75% 91%;
  --info-soft: 216 70% 93%;
  --destructive-soft: 6 75% 93%;
  --muted-soft: 38 24% 91%;

  /* Channel brand (NEW) */
  --whatsapp: 145 63% 49%;        /* #25D366 */
  --whatsapp-foreground: 0 0% 100%;
  --whatsapp-light: 145 60% 94%;
  --facebook: 214 89% 52%;        /* #1877F2 */
  --instagram: 329 70% 52%;

  --border: 38 25% 86%;           /* #E6DFD3 */
  --input: 38 25% 86%;
  --ring: 12 86% 56%;
  --radius: 1rem;                 /* 16px base; cards override to 20px */

  /* Sidebar (icon rail) */
  --sidebar-background: 42 36% 98%;
  --sidebar-foreground: 40 6% 18%;
  --sidebar-primary: 12 86% 56%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 16 80% 94%;   /* active item tint */
  --sidebar-accent-foreground: 12 77% 40%;
  --sidebar-border: 38 25% 88%;
  --sidebar-ring: 12 86% 56%;
  --sidebar-muted: 36 8% 50%;

  /* Charts — orange + ink primary, then status hues */
  --chart-1: 12 86% 56%;          /* orange */
  --chart-2: 40 6% 18%;           /* near-black */
  --chart-3: 216 69% 51%;         /* info blue */
  --chart-4: 142 67% 37%;         /* success green */
  --chart-5: 35 83% 50%;          /* amber */

  /* Elevation shadow channel (warm, not pure black) — see §3 */
  --shadow-color: 36 30% 20%;

  /* Glass (NEW) — see §3 */
  --glass-bg: 42 36% 98% / 0.72;
  --glass-border: 40 20% 100% / 0.55;
}

/* ---------- DARK (night shift) ---------- */
.dark {
  --background: 40 16% 8%;        /* #16140F warm charcoal */
  --foreground: 40 30% 94%;       /* #F4F1EA */
  --card: 38 14% 11%;             /* #1E1B16 */
  --card-foreground: 40 30% 94%;
  --popover: 38 14% 11%;
  --popover-foreground: 40 30% 94%;

  --primary: 14 95% 66%;          /* #FB7B57 brighter orange */
  --primary-foreground: 40 16% 8%;
  --brand: 14 95% 66%;
  --brand-foreground: 40 16% 8%;
  --brand-light: 16 40% 18%;

  --secondary: 38 10% 18%;        /* raised dark */
  --secondary-foreground: 40 30% 94%;

  --muted: 38 12% 15%;
  --muted-foreground: 38 10% 62%;
  --accent: 16 40% 18%;
  --accent-foreground: 14 95% 78%;

  --success: 142 55% 48%;
  --success-foreground: 40 16% 8%;
  --warning: 38 75% 56%;
  --warning-foreground: 40 16% 8%;
  --info: 216 65% 62%;
  --info-foreground: 40 16% 8%;
  --destructive: 6 70% 60%;
  --destructive-foreground: 40 16% 8%;

  --success-soft: 142 40% 16%;
  --warning-soft: 38 50% 18%;
  --info-soft: 216 55% 20%;
  --destructive-soft: 6 55% 20%;
  --muted-soft: 38 14% 18%;

  --whatsapp: 145 58% 52%;
  --whatsapp-foreground: 0 0% 100%;
  --whatsapp-light: 145 30% 18%;
  --facebook: 214 80% 60%;
  --instagram: 329 65% 60%;

  --border: 38 12% 20%;
  --input: 38 12% 20%;
  --ring: 14 95% 66%;

  --sidebar-background: 40 16% 6%;
  --sidebar-foreground: 40 30% 94%;
  --sidebar-primary: 14 95% 66%;
  --sidebar-primary-foreground: 40 16% 8%;
  --sidebar-accent: 16 40% 16%;
  --sidebar-accent-foreground: 14 95% 78%;
  --sidebar-border: 38 12% 16%;
  --sidebar-ring: 14 95% 66%;
  --sidebar-muted: 38 10% 58%;

  --chart-1: 14 95% 66%;
  --chart-2: 40 20% 80%;
  --chart-3: 216 65% 62%;
  --chart-4: 142 55% 52%;
  --chart-5: 38 75% 58%;

  --shadow-color: 0 0% 0%;
  --glass-bg: 38 14% 11% / 0.62;
  --glass-border: 40 20% 100% / 0.08;
}
```

> The existing `.scheme-blue/green/purple` blocks can stay as optional tenant white-label themes — they already follow this token contract. Default ships orange.

### 1.6 New Tailwind color tokens to register

Add to `tailwind.config.ts → theme.extend.colors` (mirrors existing pattern):

```ts
success:     { DEFAULT:"hsl(var(--success))", foreground:"hsl(var(--success-foreground))", soft:"hsl(var(--success-soft))" },
warning:     { DEFAULT:"hsl(var(--warning))", foreground:"hsl(var(--warning-foreground))", soft:"hsl(var(--warning-soft))" },
info:        { DEFAULT:"hsl(var(--info))",    foreground:"hsl(var(--info-foreground))",    soft:"hsl(var(--info-soft))" },
destructive: { DEFAULT:"hsl(var(--destructive))", foreground:"hsl(var(--destructive-foreground))", soft:"hsl(var(--destructive-soft))" },
facebook:  "hsl(var(--facebook))",
instagram: "hsl(var(--instagram))",
```

---

## 2. TYPOGRAPHY

### 2.1 Font recommendation

| Role | Font | Why |
|---|---|---|
| **Latin UI + numbers** | **Inter** (already loaded) | Workhorse, superb tabular figures, every weight. Keep. |
| **Bengali UI** | **Hind Siliguri** (RECOMMEND) | Designed for UI/screen at small sizes; clean, even color in dense lists; pairs visually with Inter's geometry. |
| Bengali fallback | Noto Sans Bengali | If Hind Siliguri licensing/loading is a problem. Still good for UI. |
| Bengali headings only | Noto Serif Bengali (current) | **Demote** — a serif at 13px in a 50-row order table is heavy and tiring. Keep it *only* for marketing/landing display, never app body. |

> **Action:** change the app body stack from `"Noto Serif Bengali", serif` to a UI-first stack. This is the single biggest comfort win in the whole system.

```css
body {
  font-family: "Inter", "Hind Siliguri", system-ui, -apple-system, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1; /* Inter UI niceties */
}
:lang(bn), [lang="bn"] { font-family: "Hind Siliguri", "Inter", sans-serif; }

/* Numbers: tabular, lining — use everywhere amounts/counts appear */
.tabular-nums, .stat-value, td.num, .amount {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
}
```

Load only the weights used: Inter 400/500/600/700; Hind Siliguri 400/500/600. `font-display: swap`. Subset Latin + Bengali.

### 2.2 Type scale (fluid, `clamp()`)

| Token | clamp() | Weight | Line-height | Use |
|---|---|---|---|---|
| `display` | `clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)` | 700 | 1.1 | Dashboard greeting, big balance number |
| `h1` | `clamp(1.5rem, 1.3rem + 1vw, 2rem)` | 700 | 1.15 | Page title |
| `h2` | `clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)` | 600 | 1.2 | Card title |
| `h3` | `1.125rem` (18px) | 600 | 1.3 | Sub-section |
| `h4` | `1rem` (16px) | 600 | 1.4 | Group label |
| `body` | `0.9375rem` (15px) | 400 | **1.6** | Default reading text |
| `body-sm` | `0.875rem` (14px) | 400 | 1.55 | Table cells, dense |
| `label` | `0.8125rem` (13px) | 500 | 1.4 | Form labels, meta |
| `caption` | `0.75rem` (12px) | 500 | 1.35 | Timestamps, helper |
| `overline` | `0.6875rem` (11px) | 700, `0.08em` tracking, uppercase | 1.3 | Section dividers (matches current sidebar) |

> Generous **1.6 body line-height** is an explicit eye-strain choice. Numbers always `tabular-nums` so columns of taka amounts align and don't jitter on live updates.

---

## 3. SPACING / RADIUS / SHADOWS / GLASS

### 3.1 Spacing — strict 8pt scale (4pt half-steps)

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64` (Tailwind `1,2,3,4,5,6,8,10,12,16`). **Rule: no off-grid values.** (The reference's "13px padding" problem never happens because we forbid it.) Standard card padding = `20px` (`p-5`) for stat cards, `24px` (`p-6`) for content cards. Section gap = `24px`. Page padding = `clamp(16px, 4vw, 32px)`.

### 3.2 Radius scale

| Token | px | Use |
|---|---|---|
| `radius-pill` | `9999px` | Pills, badges, nav tabs, avatars |
| `radius-card` | `20px` | Cards, stat cards, modals, sheets — **the Finexy signature** |
| `radius-control` | `12px` | Buttons, inputs, selects, dropdowns |
| `radius-sm` | `8px` | Inner chips, table-cell affordances |

Set `--radius: 1rem` (16px) as the shadcn base, then override Card to `rounded-[20px]` and add a `rounded-card` utility. Buttons/inputs already use `rounded-lg` (≈ control) — bump to `rounded-xl`/12px in variant strings.

### 3.3 Shadow elevation scale (warm, diffuse — never harsh)

Shadows use `--shadow-color` (warm brown-grey on light, black on dark) at low opacity for the soft, premium diffusion in the reference. Replaces the current `.shadow-premium`.

```css
--elevation-0: none;
--elevation-1: 0 1px 2px hsl(var(--shadow-color) / 0.04),
               0 1px 3px hsl(var(--shadow-color) / 0.06);          /* resting card */
--elevation-2: 0 2px 4px hsl(var(--shadow-color) / 0.04),
               0 8px 16px -4px hsl(var(--shadow-color) / 0.08);    /* hover lift */
--elevation-3: 0 4px 8px hsl(var(--shadow-color) / 0.05),
               0 16px 32px -8px hsl(var(--shadow-color) / 0.12);   /* modal/popover */
--elevation-accent: 0 6px 20px -6px hsl(var(--primary) / 0.35);   /* primary CTA glow */
```

Map: `shadow-sm` → elevation-1, `shadow-premium` → elevation-2, `shadow-premium-lg` → elevation-3. Cards rest at elevation-1, lift to elevation-2 on hover (transform + shadow only).

### 3.4 Glass tokens

```css
.glass {
  background: hsl(var(--glass-bg));
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid hsl(var(--glass-border));
}
```

**Use glass:** sticky top bar, active-nav highlight, modal/sheet overlays, the credit-card-style instance/wallet visuals, mobile bottom-tab bar. **Do NOT use glass:** data tables, forms, dense lists, anything you read for minutes — glass over text reduces legibility and `backdrop-filter` is a known perf tax on cheap Androids. Flat `--card` there.

---

## 4. MOTION LANGUAGE (Framer Motion)

### 4.1 Hard performance rules

- **Animate `transform` and `opacity` ONLY.** Never `width/height/top/left/margin/padding/box-shadow-as-layout`. (Shadow changes are allowed because they don't trigger layout — but pair them with a transform, never animate `filter`/`backdrop-filter`.)
- **Bundle:** use `LazyMotion` + `domAnimation` + the `m` component (not `motion`). Keeps Framer ~5KB instead of ~34KB. One provider at the app root; import `m` everywhere.
- **`prefers-reduced-motion`:** global guard — when set, all variants collapse to opacity-only or instant. Wire a `useReducedMotion()` check + a `MotionConfig reducedMotion="user"`.
- **Budget:** nothing > 260ms; most things 150–220ms. No infinite animations except the skeleton shimmer and the live "connected" pulse dot.

### 4.2 Tokens

```ts
export const duration = { fast: 0.15, base: 0.22, slow: 0.32 }; // seconds
export const ease = {
  out:    [0.16, 1, 0.3, 1],   // expo-out — default
  inOut:  [0.65, 0, 0.35, 1],
};
export const spring = { modal: { type:"spring", stiffness:380, damping:30, mass:0.8 } };
```

### 4.3 Reusable variants

```ts
// Page enter — fade + 12px rise
export const pageEnter = {
  hidden:  { opacity: 0, y: 12 },
  show:    { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};
// List / grid stagger — 50ms between children
export const stagger = { show: { transition: { staggerChildren: 0.05 } } };
export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};
// Card hover-lift — GPU transform + shadow, NO layout
export const hoverLift = { whileHover: { y: -2 }, transition: { duration: duration.fast } };
// Modal / sheet — spring scale+fade
export const modal = {
  hidden: { opacity: 0, scale: 0.96 },
  show:   { opacity: 1, scale: 1, transition: spring.modal },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: duration.fast } },
};
```

- **Number count-up:** `useMotionValue` + `animate()` over the numeric value, render with `tabular-nums`. Skip when reduced-motion (show final value instantly). 600–800ms ease-out, only on first mount / meaningful change.
- **Skeleton shimmer:** reuse the existing `.shimmer` keyframe (background-position only — already compositor-safe). 1.5s loop.
- **Pulse dot** (live instance/online): reuse existing `pulse-ring` / `pulse-dot` keyframes (opacity + scale only).

> The current Tailwind `keyframes` (`fade-in`, `slide-up`, `scale-in`, `bounce-in`, `shake`, `float`) all already animate transform/opacity — **keep them**, they're compliant. Just stop using `bounce-in`/`float` in app surfaces (too playful for all-day work; fine on landing/auth).

---

## 5. LAYOUT SHELL (both panels)

Restyle of `DashboardLayout.tsx` and `AdminLayout.tsx` — same structure, retokenized.

### 5.1 Icon sidebar (left rail)

- **Collapsed (default on ≥1280px):** `72px`, **icon-only**, white-cream `--sidebar-background`, `radius-card` outer corners, rests slightly inset from canvas with `elevation-1`. Tooltip on hover for label.
- **Expanded:** `260px` (current), icon + label + section dividers (keep current `overline` dividers).
- **Active item:** soft orange tint `--sidebar-accent` background, orange icon + text (`--sidebar-accent-foreground`), `radius-control`, plus a 3px orange left-edge bar. Replace the current heavy `gradient-from-primary` fill — too loud for an all-day rail; the soft tint matches Finexy and fatigues less.
- **Workspace switcher** pinned top (current), **user chip** pinned bottom (current). Both keep `radius-control`.
- Touch targets ≥ 44px in expanded mode.

### 5.2 Top bar

`56px`, sticky, **glass** (`--glass-bg` + blur). Left→right:
`[ Greeting block ]` ……… `[ global search ]` `[ workspace switcher (compact) ]` `[ notification bell w/ count ]` `[ theme toggle ]` `[ language switcher ]` `[ profile avatar chip ]`.

- **Greeting block** (dashboard only): `display`-size "শুভ সকাল, <name>" / "Good morning, <name>" + `body-sm` muted subtitle ("Here's what's happening today"). On non-dashboard pages this slot shows the page title + breadcrumb instead (reuse `page-header.tsx`).
- Search is a pill (`radius-pill`), `⌘K` / `Ctrl+K` to focus (also opens command palette).
- Current top bar is right-aligned only; **add the left greeting/title slot** and the search pill.

### 5.3 Content canvas

- `max-width: 1440px`, centered, page padding `clamp(16px, 4vw, 32px)`.
- **Bento grid:** 12-col on desktop, `gap-6` (24px). Cards span 12/6/4/3 as needed (see §7). Collapses to 1-col on mobile, 2-col on tablet.
- Background = `--background` cream; cards = `--card`.

### 5.4 Mobile (app-like, mobile-first)

- Sidebar → hidden. **Bottom tab bar** (current `MobileBottomNav`), glass, `safe-bottom` inset, 5 primary tabs (Dashboard, Inbox, Orders, Contacts, More), ≥44px targets, active = orange icon + label.
- **Mobile header** (current `MobileHeader`): logo/title left, search + bell + avatar right, `safe-top`.
- Bento → single column, stat cards 2-up in a `grid-cols-2`.
- `touch-action: manipulation`, no tap highlight (utilities already exist).

### 5.5 Admin panel

Same shell, **distinct identity so staff never confuse panels:** admin sidebar uses the near-black `--secondary` as its rail background (inverted) with orange active state, and a thin orange "ADMIN" top-bar ribbon. Everything else (cards, tables, motion, type) is identical to tenant — one system, two skins.

---

## 6. CORE COMPONENT PRIMITIVES

All exist in `src/components/ui/`. Restyle via tokens + variant strings; do not rewrite.

| Component | File | Restyle |
|---|---|---|
| **Card / StatCard** | `card.tsx`, `stat-card.tsx` | Card → `rounded-[20px]`, rest `--elevation-1`, hover `--elevation-2`. StatCard already has trend delta + icon tile — recolor icon tile to status-soft bg, value `tabular-nums`, add optional `sparkline` slot. |
| **Button** | `button.tsx` | `default` = orange (already `bg-primary`). Add/relabel `secondary` to the near-black Finexy button (`bg-secondary text-secondary-foreground`). `ghost`/`outline` keep. Bump radius to `rounded-xl` (12px). Keep `active:scale-[0.98]`. Primary hover adds `--elevation-accent`. |
| **Input / Select** | `input.tsx`, `select.tsx` | `rounded-xl`, `--card` bg, `--border` hairline, focus = 2px `--ring` orange + soft glow. `h-10` (40px), labels `label` token. |
| **Table** | `table.tsx` | Sticky header (`--surface-2` bg, `overline` headers), row hover `--muted-soft`, row height 48px comfortable / 40px compact via **density toggle**, status via Pill, checkbox col, right-aligned `tabular-nums` for amounts. Zebra OFF (hairline rows are calmer for long reading). |
| **Badge / Pill** | `badge.tsx` | Add **soft variants**: `success-soft`, `warning-soft`, `info-soft`, `destructive-soft` = `bg-*-soft text-*` (the Finexy status pills). Keep solid variants for emphasis. `radius-pill`. |
| **Tabs** | `tabs.tsx` | Pill-style: track = `--muted` rounded-full, active tab = `--card` + `--elevation-1` (or orange for primary nav tabs). |
| **Modal / Sheet** | `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `responsive-dialog.tsx` | `rounded-[20px]`, `--elevation-3`, glass overlay scrim, `modal` spring variant. Sheet from right on desktop, bottom drawer on mobile (current vaul setup). |
| **Toast** | `toast.tsx`, `sonner.tsx` | `--card` + `--elevation-3`, status accent left-bar, slide-in from top-right (desktop) / top (mobile). |
| **Skeleton** | `skeleton.tsx` | `--muted` base + `.shimmer`. Every async surface ships a skeleton matching its final layout (no spinners on page bodies). |
| **EmptyState** | `empty-state.tsx` | Centered icon tile (status-soft bg), `h3` title, muted body, single primary orange CTA. Friendly Bengali-first copy. |
| **Avatar** | `avatar.tsx` | `radius-pill`, fallback = `--brand-light` bg + `--primary` initials. Online presence dot reuses `presence-indicator.tsx`. |
| **Chart wrapper** | `chart.tsx` | Series colors from `--chart-1..5` (orange + ink + status). Bars rounded-top, grid hairlines `--border`, tooltip = popover token, legend pills. Matches the reference's orange+black bar chart. |
| **PageHeader** | `page-header.tsx` | Title `h1`, optional breadcrumb, right-aligned action slot. Used on all non-dashboard pages. |

---

## 7. FLAGSHIP — Tenant Dashboard (bento, proof-of-concept)

12-col bento. Maps the CRM's real data onto the reference's card structure. `gap-6`, `max-w-[1440px]`.

```
┌────────────────────────────────────────────────────────────────────┐
│ TOP BAR (glass): "শুভ সকাল, Rahim" · subtitle        search · bell · me │
├──────────────────────────────────┬─────────────────────────────────┤
│ TODAY'S REVENUE  (col-span-7)    │ EARNINGS HIGHLIGHT (col-span-5)  │
│ ৳ 84,500  ▲12% vs yest           │ ORANGE FILLED card (--primary)   │
│ [tabular big number, count-up]   │ "Orders today" 142  ▲8%          │
│ mini wallet cards:               │ white text, sparkline, "View" → │
│ bKash · Nagad · COD · Card       │ (the one loud orange surface)    │
├──────────┬──────────┬────────────┴────────┬────────────────────────┤
│ UNREAD   │ ACTIVE   │ NEW ORDERS          │ AVG RESPONSE           │
│ WA/FB/IG │ INSTANCES│ (col-span-3)        │ TIME (col-span-3)      │
│ stat pill│ 4/5 ●live │ stat + trend        │ 2m 14s  ▼ better       │
│ col-3    │ col-3     │                     │                        │
├──────────┴──────────┴─────────────────────┴────────────────────────┤
│ ORDER STATUS (col-span-4)   │ ORDERS / REVENUE BAR CHART (col-8)   │
│ progress bars per status:   │ orange + ink bars, 14-day, legend    │
│ Pending/Confirmed/Shipped/  │ (the reference's signature chart)    │
│ Delivered/Returned          │                                      │
├─────────────────────────────┴──────────────────────────────────────┤
│ RECENT CONVERSATIONS (col-span-7)   │ TEAM ACTIVITY (col-span-5)   │
│ TABLE: avatar · name · channel pill │ live feed: who's online,     │
│  · last msg · status pill · time    │ assigned, replying… presence │
│  · checkbox · row hover             │ dots, "X handled today"      │
└─────────────────────────────────────┴──────────────────────────────┘
```

Card-by-card mapping:
- **Today's Revenue** = the reference "Total Balance" card. Big `tabular-nums` count-up, trend delta, payment-method mini wallet cards (bKash/Nagad/COD/Card) styled like the reference's wallet chips.
- **Earnings Highlight** = the reference's orange filled card — the *single* full-orange surface on the page. "Orders today" hero number + sparkline. Keeps orange rare/loud.
- **4 stat cards** = unread (WA/FB/IG split), active instances (`●live` pulse), new orders, avg response time — reuse `StatCard` with trend.
- **Order Status** = the reference's "spending limit" progress card, repurposed as order-pipeline progress bars (status-soft fills).
- **Bar chart** = the reference chart 1:1: orange + ink bars, legend pills, hairline grid, popover tooltip.
- **Recent Conversations** = the reference "Recent Activities" table: checkbox + avatar + channel pill + status pill + relative time + row hover.
- **Team Activity** = live presence feed (uses existing `usePresence`).

Mobile: stacks to 1-col; the four stat cards become a 2×2 grid; chart scrolls horizontally.

---

## 8. COMFORT / ERGONOMICS (full-day use)

- **Sub-max contrast on body:** ink `#1A1A18` on cream `#F5F2EC` = ~15:1 (plenty) but body *secondary* text uses ink-muted to soften the page — we never blast pure-black-on-pure-white glare.
- **Line-height 1.6** on body, **1.55** on dense tables — reading comfort over density purism.
- **Consistent density + predictable layout:** same shell, same card rhythm, same table density across all 59 pages. Plus a per-user **density toggle** (comfortable/compact) persisted in profile.
- **Fast feedback:** optimistic UI on every mutation (send message, change order status, assign), skeletons (never spinners) on page load, toasts for confirm. Target interaction feedback < 100ms.
- **Reduced-motion** respected globally (§4.1); also exposed as an explicit setting toggle, not just OS-derived.
- **Keyboard shortcuts:** `⌘K`/`Ctrl+K` command palette + search; `g` then `o/i/c` to jump to Orders/Inbox/Contacts; `j/k` row nav in tables; `n` new (context-aware); `?` shortcut sheet. Critical for staff doing the same task hundreds of times/day.
- **Focus-visible rings everywhere:** 2px `--ring` orange + 2px offset (the existing `.focus-ring` utility) — full keyboard operability, AA focus indication.
- **Night shift:** dark theme is real and shipped, auto-follows OS but overridable; same comfort discipline (warm charcoal, brighter orange, soft status pills).
- **No surprise motion:** nothing auto-animates on scroll in app surfaces; motion is tied to user action or first load only.

---

## 9. Implementation handoff (for the frontend engineer)

Order of operations — each step is independently shippable:

1. **Recolor** — swap the `:root` / `.dark` blocks in `src/index.css` for §1.5. Register §1.6 Tailwind tokens. *No component edits.* App goes orange/cream immediately.
2. **Type** — change body font stack (§2.1), add `tabular-nums` utility class, apply to stat values + amount cells.
3. **Radius + shadow + glass** — add `radius-card`, `--elevation-*`, glass tokens (§3). Point `Card` to `rounded-[20px]` + elevation utilities; restyle `.glass`.
4. **Primitives** — add soft Badge variants (§6), retitle Button `secondary` to near-black, bump control radii, density-toggle on Table.
5. **Shell** — retokenize sidebar active state (soft tint, not gradient), add top-bar greeting + search slot, glass top bar/bottom nav. Admin gets the inverted near-black rail.
6. **Motion** — add `LazyMotion`/`domAnimation` provider + `MotionConfig reducedMotion="user"`, the §4.3 variants module; convert page wrappers + card grids to `m` + stagger.
7. **Flagship Dashboard** — build the §7 bento using restyled primitives. This is the proof-of-concept; review it before rolling to the other 58 pages.

**Do not:** introduce new component libraries, animate layout properties, use glass on tables/forms, use pure white/black, or use the serif Bengali font in app body. Everything routes through tokens.
