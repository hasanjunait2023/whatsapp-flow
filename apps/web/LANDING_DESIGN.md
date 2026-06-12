# LANDING_DESIGN.md — Sales Landing Page Design System

**Product:** Ecomex Automation — a Bangladesh WhatsApp + Facebook + Instagram CRM / commerce-automation SaaS for small businesses.
**Surface:** Public marketing/sales landing page (`/`), high-conversion, mobile-first.
**Reference language:** Dark AI-SaaS ("Eclipse / BoostIQ" style) — near-black canvas, violet primary, soft purple glows, glassy translucent cards, geometric sans.
**Stack:** Existing `apps/web` — Vite + React + TS + Tailwind 3.4 + shadcn/ui (default style) + lucide-react + framer-motion + embla-carousel + radix accordion.

> This is a **spec**, not components. The frontend engineer implements it. Build it as a **self-contained dark surface** that does NOT depend on the app's `next-themes` toggle or `.scheme-*` classes (see §1.1).

---

## 0. The one-sentence promise

> **Sell more on WhatsApp, Facebook & Instagram — one inbox, AI replies, zero missed orders.**

Everything on the page serves that sentence. Bengali businesses lose orders because messages pile up across three apps and get answered late. The page sells *recovered revenue and peace of mind*, not "AI".

Tone: confident, calm, concrete. Numbers over adjectives. Local proof over generic logos.

---

## 1. Architecture & scoping decisions (read first)

### 1.1 The landing page is its own dark theme — do NOT reuse the app theme

The app's global CSS (`src/index.css`) sets:
- `body { font-family: "Noto Serif Bengali", serif }` — a **serif**, wrong for this reference.
- A maroon/red default `--primary` and HSL token system with `.dark` + `.scheme-*` variants.

If you render the landing page inside the app shell, it will inherit the serif font and maroon accent. **Do not fight the global tokens with overrides scattered across components.** Instead:

**Scope everything under a single root class `.lp` on the landing page wrapper**, and define landing-specific tokens there. The landing page is *always dark* regardless of the user's app theme. Example skeleton (engineer writes the real file):

```css
/* src/styles/landing.css — imported only by the landing route */
.lp {
  /* force the dark marketing palette locally; ignore .dark / .scheme-* */
  color-scheme: dark;
  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: var(--lp-font-sans);
  /* tokens defined in §2 */
}
.lp :where(h1,h2,h3,h4,h5,h6,p,span,a,button,li,input) {
  font-family: var(--lp-font-sans);
}
/* Bangla opt-in: anything tagged lang="bn" or .bn uses the serif Bengali face */
.lp :where([lang="bn"], .bn) {
  font-family: var(--lp-font-bn);
}
```

Mount the landing route outside the authed `AppLayout`, with `<div className="lp">` as the outermost node. All Tailwind classes below assume they resolve against `.lp` tokens. Where a token isn't expressible as a Tailwind color, use arbitrary values (`bg-[var(--lp-bg)]`) or add a small `lp` extension to `tailwind.config.ts` (see §2.6).

### 1.2 Fonts: add a geometric sans; keep Bengali serif for Bangla only

Reference wants Inter/Geist. The app currently ships only Noto Serif Bengali.

- **Primary (Latin/UI): Inter** — variable, free, geometric, ships excellent tabular figures (needed for prices/stats). Already Google-Fonts-friendly.
- **Display option (optional, hero headline only): Geist** or **Inter Tight** for tighter tracking. If you want one font, **Inter alone is fine** — use tight tracking + heavier weight for the hero.
- **Bangla: Noto Serif Bengali** (already preloaded in `index.html`) for `lang="bn"` microcopy ONLY. Do not set Bangla text in Inter — it has no Bengali glyphs and will tofu.

Add Inter to `index.html` `<head>` (keep the existing Bengali preconnect/link):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!-- existing Bengali link stays -->
```

Preload only the weight used above the fold (Inter 700) for LCP. `font-display: swap`.

### 1.3 Accent strategy: violet primary + WhatsApp green as the success/trust signal

Two-color system, never muddled:
- **Violet** = brand, CTAs, focus, glows, links, "Most Popular". The personality.
- **WhatsApp green** = success only: check marks in pricing, "online" dots, "delivered" ticks, the floating WhatsApp action, trust badges. It earns attention precisely because it's rare.

Rule: **a button is violet OR a green WhatsApp action — never both colors on one control.** Green never competes with the primary CTA. On any single screen, ≤1 green "live"/"online" pulse visible at a time.

---

## 2. Design tokens

All tokens live on `.lp`. Hex is the source of truth for handoff; I also give the **HSL triplet** so they slot into the project's existing `hsl(var(--x))` convention if the engineer prefers. (App tokens are HSL-based; matching that is less surprising than introducing oklch mid-codebase.)

### 2.1 Background layers (dark, near-black with a violet undertone)

| Token | Role | Hex | HSL |
|---|---|---|---|
| `--lp-bg` | Page canvas (deepest) | `#08080C` | `240 20% 4%` |
| `--lp-bg-1` | Section alt / raised band | `#0C0C13` | `240 17% 6%` |
| `--lp-surface` | Card base | `#111119` | `240 18% 8%` |
| `--lp-surface-2` | Card hover / nested | `#15151F` | `240 18% 10%` |
| `--lp-surface-glass` | Glass card fill (use w/ blur) | `rgba(255,255,255,0.04)` | overlay |
| `--lp-elevated` | Highlighted pricing card | `#16131F` | `258 22% 10%` (violet-tinted) |

Canvas is intentionally **not pure `#000`** — a hair of violet (240° hue) makes the whole page feel designed and lets glows blend. Pure black reads cheap and makes glows look like artifacts.

### 2.2 Violet ramp (primary)

| Token | Role | Hex | HSL |
|---|---|---|---|
| `--lp-violet-50` | Tint text on violet | `#EDE9FE` | `255 92% 95%` |
| `--lp-violet-300` | Hover text / icon | `#C4B5FD` | `255 95% 85%` |
| `--lp-violet-400` | Links, accents | `#A78BFA` | `255 92% 76%` |
| `--lp-violet-500` | **Primary** (buttons, ring) | `#8B5CF6` | `258 90% 66%` |
| `--lp-violet-600` | Primary hover/pressed | `#7C3AED` | `262 83% 58%` |
| `--lp-violet-700` | Borders on violet surfaces | `#6D28D9` | `263 70% 50%` |
| `--lp-glow` | Radial glow color | `#7C3AED` @ low alpha | use in radial-gradient |

Primary CTA = `--lp-violet-500`, hover `--lp-violet-600`. Text on primary = `#FFFFFF` (contrast 4.7:1 on 500 — passes AA for ≥18px/bold; CTA labels are bold ≥16px, OK; for body-size violet text use `--lp-violet-50` on dark, not white-on-violet).

### 2.3 WhatsApp / success green (secondary)

| Token | Role | Hex | HSL |
|---|---|---|---|
| `--lp-green-400` | "Online" dot, ticks (on dark) | `#34D399` | `158 64% 52%` |
| `--lp-green-500` | WhatsApp brand action | `#25D366` | `142 70% 49%` |
| `--lp-green-600` | Green pressed | `#1EBE5D` | `145 73% 43%` |
| `--lp-green-tint` | Success chip bg | `rgba(37,211,102,0.12)` | overlay |

`#25D366` is the official WhatsApp green. Use `--lp-green-400` (`#34D399`) for small text/ticks on dark because pure `#25D366` text on `#08080C` is ~3.3:1 (fails AA for small text); `#34D399` is ~6.5:1. Use `#25D366` only for ≥24px icons, fills, and the FAB.

### 2.4 Text & borders

| Token | Role | Hex | HSL | Contrast on `--lp-bg` |
|---|---|---|---|---|
| `--lp-text` | Primary text | `#F4F4F6` | `240 14% 96%` | 18.1:1 |
| `--lp-text-muted` | Subheads, body-secondary | `#A1A1B5` | `240 12% 67%` | 7.4:1 |
| `--lp-text-dim` | Captions, meta, footnotes | `#6E6E85` | `243 11% 48%` | 4.6:1 (AA small ✓) |
| `--lp-border` | Hairline card border | `rgba(255,255,255,0.08)` | overlay | — |
| `--lp-border-strong` | Hover / focus border | `rgba(255,255,255,0.16)` | overlay | — |
| `--lp-border-violet` | Highlighted card edge | `rgba(139,92,246,0.45)` | overlay | — |

Do not put text below `--lp-text-dim` brightness anywhere. Glass card borders are **light-on-dark hairlines**, never dark-on-dark.

### 2.5 Type scale (Inter, mobile-first with clamp)

Fluid scale via `clamp(min, preferred, max)`. min = 360px mobile, max ≈ 1280px+. All headings: `font-feature-settings: "ss01","cv05"` optional; **letter-spacing tightens as size grows.**

| Token | Use | clamp() | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| `--lp-text-display` | Hero H1 | `clamp(2.5rem, 1.4rem + 5.2vw, 5rem)` (40→80px) | 800 | `-0.03em` | 1.04 |
| `--lp-text-h2` | Section titles | `clamp(1.75rem, 1.1rem + 2.8vw, 3rem)` (28→48px) | 700 | `-0.02em` | 1.1 |
| `--lp-text-h3` | Card titles, pricing tier | `clamp(1.125rem, 1rem + 0.6vw, 1.375rem)` (18→22px) | 600 | `-0.01em` | 1.25 |
| `--lp-text-lead` | Hero subhead | `clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem)` (17→20px) | 400 | `0` | 1.5 |
| `--lp-text-body` | Body, card copy | `1rem` (16px) | 400 | `0` | 1.6 |
| `--lp-text-sm` | Meta, badges, nav | `0.875rem` (14px) | 500 | `0` | 1.45 |
| `--lp-text-xs` | Eyebrow, footnote, legal | `0.75rem` (12px) | 500–600 | `0.04em` (eyebrows uppercase) | 1.4 |
| `--lp-price` | Big price number | `clamp(2rem, 1.4rem + 2.6vw, 2.75rem)` (32→44px) | 800, **tabular-nums** | `-0.02em` | 1 |

Hero H1 sits on **2 lines max** at desktop with a manual `<br>` or `max-w` to control the break (reference does this). Price numbers MUST use `font-variant-numeric: tabular-nums` so "৳০" and "৳১,৪৯৯" align across cards.

### 2.6 Spacing, radius, shadow, blur

**Spacing — 8px base scale** (4px allowed only for icon gaps). Use Tailwind's default scale; it's already 4px-based. Enforce these specific values:
- Inline gaps: 4 / 8 / 12 / 16 px (`gap-1 / 2 / 3 / 4`)
- Card padding: **24px mobile, 32px desktop** (`p-6 md:p-8`)
- Stack rhythm inside cards: 12–16px
- Grid gutters: **16px mobile, 24px desktop** (`gap-4 md:gap-6`)
- Section vertical padding: `clamp(4rem, 3rem + 6vw, 7.5rem)` top & bottom (64→120px) → token `--lp-space-section`
- Content max width: **1200px** (`max-w-[1200px] mx-auto`); narrow text blocks (hero subhead, mid-CTA copy) cap at **640–720px** for readability.
- Mobile side padding: **20px** (`px-5`); desktop `px-6`.

**Radius scale** (`--radius` in app is `0.75rem`; landing runs a touch rounder for the "soft premium" feel):

| Token | Value | Use |
|---|---|---|
| `--lp-r-sm` | `10px` | chips, badges, inputs, small buttons |
| `--lp-r-md` | `16px` | buttons, icon tiles |
| `--lp-r-lg` | `20px` | cards |
| `--lp-r-xl` | `28px` | feature spotlight, large media cards |
| `--lp-r-pill` | `9999px` | pills, nav CTA, stat chips |

**Shadow scale** — dark UI relies on **glow + hairline border**, not gray drop shadows (gray shadows are invisible/muddy on near-black). Two families:

| Token | Value | Use |
|---|---|---|
| `--lp-shadow-card` | `0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.7)` | resting cards (subtle lift + top inner highlight) |
| `--lp-shadow-pop` | `0 16px 48px -16px rgba(0,0,0,0.8)` | hover lift, popovers |
| `--lp-glow-violet` | `0 0 40px -8px rgba(124,58,237,0.45)` | primary CTA, highlighted pricing card |
| `--lp-glow-violet-lg` | `0 0 120px 10px rgba(124,58,237,0.30)` | hero background orb |
| `--lp-glow-green` | `0 0 24px -6px rgba(37,211,102,0.40)` | WhatsApp FAB only |

The **inset top highlight** (`rgba(255,255,255,0.04)` 1px inset) is what makes glass cards read as physical glass on dark. Apply to all surface cards.

**Blur:** glass cards use `backdrop-blur-xl` (24px) with `--lp-surface-glass` fill + `--lp-border`. Reuse the existing `.glass` utility's intent but with landing tokens.

**Optional Tailwind extension** (`tailwind.config.ts → theme.extend.colors.lp`) so the engineer can write `bg-lp-surface text-lp-muted border-lp-border` instead of arbitrary values:

```ts
lp: {
  bg: "var(--lp-bg)", "bg-1": "var(--lp-bg-1)",
  surface: "var(--lp-surface)", "surface-2": "var(--lp-surface-2)",
  elevated: "var(--lp-elevated)",
  text: "var(--lp-text)", muted: "var(--lp-text-muted)", dim: "var(--lp-text-dim)",
  violet: { 400:"#A78BFA",500:"#8B5CF6",600:"#7C3AED",700:"#6D28D9" },
  green: { 400:"#34D399",500:"#25D366",600:"#1EBE5D" },
}
```
Borders/overlays with alpha stay as arbitrary values.

### 2.7 Motion

| Token | Value | Use |
|---|---|---|
| `--lp-dur-fast` | `150ms` | hover color, border |
| `--lp-dur` | `250ms` | buttons, cards lift, accordion |
| `--lp-dur-slow` | `450ms` | section reveal, glow drift |
| `--lp-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) | enters, lifts |
| `--lp-ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | accordions, carousels |

Animate **transform / opacity / filter only** (per project web rules). On-scroll reveals: fade + 12–16px rise, `--lp-dur-slow`, staggered 60ms via framer-motion `whileInView` (`viewport={{ once: true, margin: "-80px" }}`). Hero glow: very slow (12–18s) drifting scale/translate, `prefers-reduced-motion` disables it. Buttons: scale 0.98 on `:active`, never on hover (hover = brightness/glow only). **All motion gated by `prefers-reduced-motion: reduce` → reduce to opacity-only or none.**

---

## 3. Section-by-section component spec

Page order (matches reference, adapted): **Nav → Hero → Logo/Trust strip → SolutionsGrid → FeatureSpotlight ×2–3 → MidCTA → Pricing → CommitmentCards → Testimonials → FAQ → Footer**, plus a **sticky mobile CTA bar** and a **floating WhatsApp button**.

Global section wrapper: `<section className="relative px-5 md:px-6 py-[var(--lp-space-section)]">` with inner `max-w-[1200px] mx-auto`. Alternate canvas: most sections on `--lp-bg`; Pricing and Testimonials on `--lp-bg-1` for gentle banding. Every section gets an `id` for nav anchors (`#features`, `#how`, `#pricing`, `#faqs`).

---

### 3.1 Nav (sticky, translucent)

**Layout:** sticky top, full-width, `h-16` (64px). Inner `max-w-[1200px]` flex row, `justify-between items-center`.
- **Left:** wordmark — reuse `AppLogo` mark + "Ecomex" wordmark in Inter 700, `--lp-text`. Mark may carry a small violet glow.
- **Center (desktop ≥1024px):** links `Features · How it works · Pricing · FAQs` → smooth-scroll anchors. `--lp-text-sm`, color `--lp-text-muted`, hover `--lp-text` + 2px violet underline grow (transform scaleX). 32px gap.
- **Right:** ghost "Log in" (text link, `--lp-text-muted`→`--lp-text`) + solid **violet pill "Get Started"** (`--lp-r-pill`, `bg-lp-violet-500 hover:bg-lp-violet-600`, white text 600, `px-5 py-2.5`, `--lp-glow-violet` on hover).

**Translucency / states:**
- At scrollY 0: transparent background, no border.
- After scrollY > 24px: `--lp-surface-glass` + `backdrop-blur-xl` + bottom `--lp-border` hairline. Transition `--lp-dur`.
- Implement with a scroll listener or `IntersectionObserver` sentinel at top of hero (preferred — no scroll churn).

**Mobile (<1024px):** wordmark left; right shows the violet "Get Started" pill (compact) + a hamburger (`lucide Menu`). Hamburger opens a **full-screen sheet** (radix Dialog or vaul Drawer — both in deps): large stacked links, the two CTAs at the bottom, `safe-top`/`safe-bottom` padding. Close = `lucide X`. Trap focus; `Esc` closes.

**A11y:** `<header><nav aria-label="Primary">`. Active section link gets `aria-current="true"` (scroll-spy via IntersectionObserver). Skip-link `href="#main"` first in DOM, visible on focus.

```
DESKTOP NAV
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ Ecomex      Features  How it works  Pricing  FAQs     Log in  [Get Started]│
└──────────────────────────────────────────────────────────────────────┘
MOBILE NAV
┌───────────────────────────────────────┐
│ ◆ Ecomex                 [Get Started] ≡ │
└───────────────────────────────────────┘
```

---

### 3.2 Hero (centered)

**Composition:** centered text column over a soft violet glow, with a hero product shot below the CTAs.

Layers (back→front):
1. **Background grid+glow** (absolute, `pointer-events-none`, `aria-hidden`): a faint dot/line grid mask + one large radial `--lp-glow-violet-lg` orb top-center (≈120% width, offset up), optionally a second smaller orb bottom-right. Grid is `radial-gradient` dots at `rgba(255,255,255,0.03)`, masked to fade at edges (`mask-image: radial-gradient(...)`). This is the single most important "premium" cue — do not skip, do not overdo (keep glow opacity ≤0.30).
2. **Eyebrow pill:** small pill above H1 — `--lp-surface-glass` + `--lp-border`, `--lp-r-pill`, `px-3 py-1`, `--lp-text-xs` uppercase tracked. Contains a tiny green pulse dot + text e.g. **"Now with AI replies in Bangla & English"**. Dot = `--lp-green-400` with `animate-pulse-dot` (existing keyframe).
3. **H1** (`--lp-text-display`, weight 800, `--lp-text`): two lines, controlled break. Copy:
   > **Sell more on WhatsApp, Facebook & Instagram.**
   > <span class="text-lp-violet-400">One inbox. AI replies. Zero missed orders.</span>
   Second line (or the 3 noun-phrases) in `--lp-violet-400` for the accent gradient moment. Optionally apply a violet→white text-gradient to the second line (mind contrast — keep the lightest stop ≥ `--lp-violet-300`).
4. **Subhead** (`--lp-text-lead`, `--lp-text-muted`, `max-w-[640px] mx-auto`):
   > Ecomex unifies your WhatsApp, Messenger & Instagram DMs in one screen, auto-replies to customers day and night, and turns chats into confirmed orders — with bKash & Nagad, courier booking, and delivery tracking built in.
5. **CTA row** (`flex flex-col sm:flex-row gap-3 justify-center`, full-width buttons on mobile):
   - **Primary:** "Start free trial" — violet pill, white 600, `h-12 px-7`, `--lp-glow-violet` on hover, `lucide ArrowRight` icon that nudges +2px on hover. **`type=button` → routes to signup.**
   - **Secondary:** "Get a demo" — ghost/outline: transparent bg, `--lp-border-strong`, `--lp-text`, hover `--lp-surface-2`. Opens `DemoRequestDialog` (already in repo). Optionally a `lucide Play`/`MessageCircle` leading icon.
   - Microcopy under CTAs, `--lp-text-xs --lp-text-dim`: "No card required · Free 14-day trial · Setup in minutes". Provide Bangla variant via `lang="bn"`.
6. **Stat chips row** (`flex flex-wrap gap-3 justify-center`, `mt-8`): 3–4 glass chips, each `--lp-surface-glass`/`--lp-border`/`--lp-r-pill`, `px-4 py-2`. Big number `--lp-text` 700 tabular-nums + small label `--lp-text-dim`. e.g. **"500+ businesses"**, **"2M+ messages handled"**, **"4hrs saved/day"**, **"3 channels, 1 inbox"**. (Use real numbers only — placeholders flagged for marketing.)
7. **Hero product shot** (below, `mt-12 md:mt-16`): the unified inbox screenshot in a **device/browser frame** floating on the glow. See §4 slot `HERO_SHOT`. Add a subtle violet glow behind it and a 1px `--lp-border` frame; optional slight `perspective` tilt (≤4°) — keep legible.

**Reduced motion:** glow static, no drift; product shot no float; arrow no nudge.

```
HERO
                    ·  ·  ·  ·  ·  ·  ·  ·            (faint dot grid + violet orb)
                ( • Now with AI replies in Bangla & English )
            Sell more on WhatsApp, Facebook & Instagram.
            One inbox.  AI replies.  Zero missed orders.       ← violet accent line
        Ecomex unifies your DMs, auto-replies day & night, and
              turns chats into confirmed orders. bKash/Nagad,
                      courier & tracking built in.
                 [ Start free trial → ]   [ Get a demo ]
              No card required · 14-day trial · Setup in minutes
        ( 500+ businesses ) ( 2M+ messages ) ( 4hrs saved/day )
        ┌──────────────────────────────────────────────────┐
        │  [ HERO_SHOT — unified inbox screenshot, framed ] │
        └──────────────────────────────────────────────────┘
```

---

### 3.3 Trust / logo strip ("trusted by")

Directly under hero. `--lp-text-xs --lp-text-dim` centered caption: **"Powering sales for businesses across Bangladesh"**. Below: a row of **greyscale, low-opacity (40–55%) logos** at uniform height (`h-6 md:h-7`), `gap-8`, wrapping on mobile, optionally a slow marquee (pausable, reduced-motion → static).
**Critical for BD trust:** include payment/courier marks customers recognize — **bKash, Nagad, Rocket, Pathao, Steadfast, RedX** — rendered monochrome. These do more for conversion than fake company logos. See §4 slot `TRUST_LOGOS`. Logos get `aria-label`; container `aria-label="Trusted payment and delivery partners"`.

---

### 3.4 SolutionsGrid

**Title block (centered):** eyebrow `--lp-text-xs` uppercase violet "WHY ECOMEX"; H2 `--lp-text-h2`: **"Everything you need to sell over chat"**; optional one-line `--lp-text-muted` subhead capped at 600px.

**Grid:** 6 cards, `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6`. (Reference is 2×3; on desktop 3×2 reads better for 6 and keeps cards from going too wide — engineer may use `lg:grid-cols-2` to match reference exactly if preferred. Default: 3 across.)

**Card anatomy** (`SolutionCard`):
- Container: `--lp-surface`, `--lp-border`, `--lp-r-lg`, `p-6 md:p-8`, `--lp-shadow-card`, top inset highlight. `relative overflow-hidden`.
- **Icon tile** top-left: `size-11`, `--lp-r-md`, gradient `linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))`, `--lp-border`, centered `lucide` icon `--lp-violet-400` (size 20). One icon per card.
- **Title** `--lp-text-h3` `--lp-text`, `mt-5`.
- **Body** `--lp-text-body` `--lp-text-muted`, 1–2 lines, `mt-2`.
- Optional faint corner glow on hover (a violet radial in a corner, opacity 0→1).

**The 6 cards** (adapted to our product, not "AI business" generic):

| Icon (lucide) | Title | Line |
|---|---|---|
| `Inbox` | Unified inbox | WhatsApp, Messenger & Instagram DMs in one screen — assign, tag, reply. |
| `Bot` | AI auto-replies | Answers FAQs, prices & availability in Bangla and English, 24/7. |
| `ShoppingBag` | Orders from chat | Turn a conversation into a confirmed order with stock, totals & invoice. |
| `Truck` | Courier & tracking | Book Pathao, Steadfast or RedX and share live delivery status automatically. |
| `Wallet` | bKash & Nagad | Send payment links, confirm transactions, reconcile — no spreadsheets. |
| `BarChart3` | Sales insights | See revenue, response time, top products & agent performance at a glance. |

**Hover state:** border → `--lp-border-strong`, lift `-translate-y-0.5`, `--lp-shadow-pop`, icon tile glow up, `--lp-dur`. Focusable if the whole card is a link (else not). If cards link to feature sections, wrap in `<a>` with visible focus ring (§5).

```
SOLUTIONS GRID (desktop 3×2)
            WHY ECOMEX
   Everything you need to sell over chat
┌────────────┐ ┌────────────┐ ┌────────────┐
│ ▣ Unified  │ │ ▣ AI auto- │ │ ▣ Orders   │
│   inbox    │ │   replies  │ │   from chat│
│ one screen…│ │ 24/7 BN/EN…│ │ confirm…   │
└────────────┘ └────────────┘ └────────────┘
┌────────────┐ ┌────────────┐ ┌────────────┐
│ ▣ Courier  │ │ ▣ bKash &  │ │ ▣ Sales    │
│   & track  │ │   Nagad    │ │   insights │
└────────────┘ └────────────┘ └────────────┘
```

---

### 3.5 FeatureSpotlight (×2–3 alternating)

Wide rounded showcase cards that alternate image-left / image-right, each anchoring one pillar with a real product screenshot. Reference has one; we use **2–3** to show the product depth (inbox, AI agent, orders/courier).

**Layout per spotlight:** `--lp-r-xl`, `--lp-bg-1` or a faint violet-tinted surface, `--lp-border`, `p-6 md:p-10`, `grid lg:grid-cols-2 gap-8 lg:gap-12 items-center`. Alternate which column the media sits in (`lg:[&>*:first-child]:order-2` on even index, or just conditionally render order). On mobile, **media always stacks below copy** (copy first = faster perceived value).

**Copy column:**
- Eyebrow `--lp-text-xs` uppercase violet (e.g. "UNIFIED INBOX").
- H2/H3 hybrid headline `--lp-text-h2` (smaller end) `--lp-text`.
- 2–3 sentence body `--lp-text-body --lp-text-muted`.
- A short **checklist** (3 items) with green `lucide Check` in a `--lp-green-tint` circle + `--lp-text-sm`.
- Small **violet text-button** with arrow: "See how it works →" (anchors to demo or scrolls).

**Media column:** screenshot in a frame (browser chrome on desktop shots, phone frame on mobile-app shots) with violet glow behind, `--lp-r-lg`, `--lp-border`. Optional floating accessory chip (e.g. a green "● Online" badge or an "AI replied in 2s" chip) overlapping a corner for depth — `absolute`, glass, small.

**The spotlights:**

1. **Unified inbox** — eyebrow "ONE INBOX", headline *"Three apps, one screen. Nothing slips."* Checklist: "WhatsApp + Messenger + Instagram", "Assign chats to your team", "Quick replies & tags". Media slot `SHOT_INBOX` (desktop browser frame).
2. **AI agent** — eyebrow "AI THAT SOUNDS LIKE YOU", headline *"An assistant that answers in seconds — in Bangla."* Checklist: "Learns your products & prices", "Replies 24/7, hands off to humans", "You stay in control". Media slot `SHOT_AI` (chat thread, show a Bangla reply + green ticks).
3. **Orders & courier** — eyebrow "CHAT → ORDER → DOORSTEP", headline *"From 'koto?' to delivered — without leaving the chat."* Checklist: "Build orders with live stock", "bKash/Nagad payment links", "Book courier & track delivery". Media slot `SHOT_ORDER` (order/courier view).

**Reduced motion:** no float on accessory chips or media.

```
FEATURE SPOTLIGHT (image right, then next one image left)
┌──────────────────────────────────────────────────────────┐
│  ONE INBOX                          ┌───────────────────┐ │
│  Three apps, one screen.            │  [ SHOT_INBOX ]   │ │
│  Nothing slips.                     │   browser frame   │ │
│  copy copy copy…                    │  ●Online (chip)   │ │
│  ✓ WA + Messenger + IG              └───────────────────┘ │
│  ✓ Assign to team                                         │
│  ✓ Quick replies & tags                                   │
│  See how it works →                                       │
└──────────────────────────────────────────────────────────┘
```

---

### 3.6 MidCTA band

Centered conversion band on a violet-tinted surface with glow. `--lp-r-xl`, `--lp-elevated` or a violet gradient wash (`linear-gradient(135deg, rgba(124,58,237,0.18), rgba(139,92,246,0.06))`) over `--lp-bg-1`, `--lp-border-violet`, `--lp-glow-violet`, generous `py-12 md:py-16`, content `max-w-[720px] mx-auto text-center`.
- H2 `--lp-text-h2`: **"Stop losing orders to slow replies."**
- Sub `--lp-text-lead --lp-text-muted`: "Start free today. Connect WhatsApp in minutes and let Ecomex handle the rest."
- Primary violet CTA "Start free trial →" + ghost "Talk to us".
- Optional tiny trust line: "Join 500+ Bangladeshi businesses".

This is a mid-page re-ask — keep it punchy, one idea.

---

### 3.7 Pricing (4-up: 3 priced + Enterprise, Pro highlighted)

**Title block:** eyebrow violet "PRICING"; H2 **"Simple pricing that grows with you"**; sub `--lp-text-muted` "Taka pricing. No hidden fees. Cancel anytime."
**Billing toggle** (radix Switch, already in deps): "Monthly / Yearly" with a green `--lp-green-tint` "Save 2 months" chip. Toggling updates all prices (tabular-nums prevents layout shift). Default Yearly (anchors lower monthly-equivalent).

**Grid:** 4 cards. `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 items-stretch`. On `md` it's 2×2 (Pro top-right gets the highlight); on `xl` it's a clean 4-across row. Avoid forcing 4-across on small laptops — 2×2 stays elegant. Equalize card heights (`items-stretch` + flex column with CTA pinned bottom via `mt-auto`).

**Tier model (BD f-commerce shaped):**

| Tier | Who | Price (illustrative — marketing confirms) | CTA |
|---|---|---|---|
| **Starter** | Solo seller, 1 WhatsApp | ৳0 / forever (or ৳৪৯৯/mo) | "Start free" (ghost) |
| **Growth** | Growing shop, all 3 channels | ৳১,৯৯৯ /mo | "Start free trial" (violet) |
| **Pro** ⭐ *Most popular* | Busy store + AI + team | ৳৪,৯৯৯ /mo | "Start free trial" (violet, glowing) |
| **Enterprise** | Multi-brand / high volume | "Let's talk" (negotiable) | "Contact sales" (ghost) |

**Card anatomy** (`PricingCard`):
- Container: `--lp-surface`, `--lp-border`, `--lp-r-lg`, `p-6 md:p-8`, flex column, `--lp-shadow-card`.
- **Tier name** `--lp-text-h3`; one-line audience `--lp-text-sm --lp-text-dim`.
- **Price** block: `--lp-price` tabular-nums `--lp-text` + cadence `/mo` in `--lp-text-sm --lp-text-dim`. Enterprise shows **"Let's talk"** at `--lp-text-h3` instead of a number (no fake price). If yearly, show struck monthly + effective.
- **CTA** (full width) — see table; pinned to bottom.
- **Divider** hairline `--lp-border`.
- **Feature checklist:** `lucide Check` in `--lp-green-400` (size 16) + `--lp-text-sm --lp-text`. ~5–7 rows; higher tiers say **"Everything in [prev], plus:"** as the first row (dim). Unavailable features either omitted or `lucide Minus` in `--lp-text-dim` (don't strike-through — noisy).

**Highlighted "Pro" card:**
- `--lp-elevated` bg, `--lp-border-violet` (or a 1px violet gradient ring), `--lp-glow-violet`, and on `xl` a slight scale up (`xl:scale-[1.03] z-10`) — but **never break the grid baseline on mobile** (no scale <md; it causes overflow). Reduced-motion keeps scale (it's static), fine.
- **"Most popular" tag**: a pill at top, half-overlapping the top edge (`absolute -top-3 left-1/2 -translate-x-1/2`), `bg-lp-violet-500` white `--lp-text-xs` 600 uppercase. Card needs `relative` + `mt-3` headroom.

**A11y/clarity:** the toggle has a visible label and `aria-label`; price changes announced via `aria-live="polite"` region. Each card is a `<article>` with an accessible name = tier. Most-popular conveyed in text, not color alone (the tag text does this).

```
PRICING (xl: 4-across, Pro raised)
   PRICING  ·  Simple pricing that grows with you   [ Monthly | ●Yearly ]  (Save 2mo)
┌──────────┐ ┌──────────┐ ┌══════════┐ ┌──────────┐
│ Starter  │ │ Growth   │ │★MOST POP │ │Enterprise│
│ Solo     │ │ All 3 ch │ │  Pro     │ │ Multi    │
│ ৳0       │ │ ৳1,999/mo│ │ ৳4,999/mo│ │ Let's    │
│          │ │          │ │ (glow)   │ │ talk     │
│ ✓ …      │ │ ✓ …      │ │ ✓ …      │ │ ✓ …      │
│ ✓ …      │ │ ✓ …      │ │ ✓ …      │ │ ✓ …      │
│[Start    │ │[Start    │ │[Start    │ │[Contact  │
│ free]    │ │ trial]   │ │ trial]   │ │ sales]   │
└──────────┘ └──────────┘ └══════════┘ └──────────┘
            (md breakpoint = 2×2; Pro top-right highlighted)
```

---

### 3.8 CommitmentCards ("Our Vision / Our Mission")

Two large photo cards side by side. `grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6`. Optional section eyebrow/H2: **"Built in Bangladesh, for Bangladeshi business"**.

**Card anatomy** (`CommitmentCard`):
- `--lp-r-xl`, `relative overflow-hidden`, `aspect-[4/5] md:aspect-[3/4]` (portrait, premium), `--lp-border`.
- Full-bleed image (slot `PHOTO_VISION`, `PHOTO_MISSION`).
- **Gradient scrim** bottom→top: `linear-gradient(to top, rgba(8,8,12,0.92) 0%, rgba(8,8,12,0.4) 45%, transparent 75%)` so overlaid text stays legible on any photo.
- Overlaid content bottom-left, `p-6 md:p-8`: small violet eyebrow ("OUR VISION" / "OUR MISSION"), heading `--lp-text-h3 --lp-text`, 1–2 line body `--lp-text-sm --lp-text-muted`, and a violet text-link with arrow ("Read our story →") if there's a destination (else omit — no dead links).
- Hover: image `scale-105` (slow, `--lp-dur-slow`, transform only), scrim slightly deepens.

Photos must show **real local context** (Bangladeshi shop owners, products, packaging) — stock "diverse office" photos read as template. Flag to marketing in §4.

```
COMMITMENT
┌───────────────────────┐ ┌───────────────────────┐
│ [PHOTO_VISION]        │ │ [PHOTO_MISSION]       │
│                       │ │                       │
│  OUR VISION           │ │  OUR MISSION          │
│  Every shop, online…  │ │  Make selling on chat │
│  Read our story →     │ │  effortless. →        │
└───────────────────────┘ └───────────────────────┘
```

---

### 3.9 Testimonials ("What our clients are saying")

Carousel of photo/video testimonial cards (use **embla-carousel-react**, already a dep). Title block: eyebrow violet "LOVED BY SELLERS"; H2 **"What Bangladeshi sellers say"**.

**Carousel:** embla, `slidesToScroll: 1`, `align: "start"`, loop optional. Show ~1 card mobile / 2–3 desktop (peek next). Below: **dots** (`--lp-text-dim` → active `--lp-violet-500`) + optional prev/next ghost arrow buttons (`lucide ChevronLeft/Right`, ≥44px touch target). Embla supports keyboard; ensure arrows are real `<button>`s with `aria-label`.

**Card anatomy** (`TestimonialCard`):
- `--lp-surface`, `--lp-border`, `--lp-r-lg`, `p-6`, flex column, fixed-ish min-height for alignment.
- **Two variants:**
  - **Quote card:** big `lucide Quote` mark (violet, low opacity) or a leading violet bar; quote `--lp-text-body --lp-text` (2–4 lines); footer = avatar (`size-10` rounded, slot `AVATAR_n`) + name `--lp-text-sm 600` + business/handle `--lp-text-xs --lp-text-dim`. Optional 5× `lucide Star` filled `--lp-amber`/violet.
  - **Video card:** 16:9 thumbnail (slot `VIDEO_THUMB_n`) with a **green play button** (`--lp-green-500` circle, white `lucide Play`, `--lp-glow-green` subtle) center; clicking opens a dialog/lightbox with the video (radix Dialog). Title/name overlaid at bottom with scrim.
- Optional small **green verified tick** or "Verified buyer" chip for credibility.

**A11y:** carousel region `aria-roledescription="carousel"` + `aria-label`; each slide `aria-label="Testimonial N of M"`. Play buttons describe the video. Reduced-motion: no autoplay; if autoplay used at all, it pauses on hover/focus and respects reduced-motion (default: **no autoplay**).

```
TESTIMONIALS
   LOVED BY SELLERS · What Bangladeshi sellers say
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ “ Ecomex…”  │ │ [▶ video]   │ │ “ AI replies│
│             │ │  green play │ │   in Bangla”│
│ (•) Rahim   │ │  Nusrat —   │ │ (•) Karim   │
│  Dhaka shop │ │  Boutique   │ │  Ctg store  │
└─────────────┘ └─────────────┘ └─────────────┘
              ● ● ○ ○        ‹  ›
```

---

### 3.10 FAQ (two-column accordion)

Use **radix Accordion** (already a dep) — the shadcn `Accordion` component. Title block: H2 **"Frequently asked questions"**; sub `--lp-text-muted` "Still curious? Message us on WhatsApp." (with a green WhatsApp link).

**Layout:** `grid md:grid-cols-2 gap-x-10 gap-y-0` — split items across two columns on desktop (e.g. items 1–4 left, 5–8 right; or CSS columns). Single column mobile. `type="single" collapsible` (or `multiple` — pick single for focus).

**Item anatomy:**
- Trigger row: question `--lp-text-h3` (smaller end, ~17px) `--lp-text`, full-width, `py-5`, hairline `--lp-border` bottom. Right-aligned **plus icon** (`lucide Plus`) that **rotates 45° → ×** when open (transform rotate, `--lp-dur`). Hover: question → `--lp-violet-300`.
- Content: `--lp-text-body --lp-text-muted`, `pb-5`, max-width ~60ch. Accordion uses existing `accordion-down/up` keyframes (`--radix-accordion-content-height`).

**Suggested FAQs:** Does it work with my existing WhatsApp number? · Do customers need to install anything? · Does the AI really reply in Bangla? · Can I take payments via bKash/Nagad? · Which couriers are supported? · Is my data safe? · Can my team use it together? · What does it cost / is there a free plan?

**A11y:** radix handles roles/`aria-expanded`/keyboard. Ensure the plus-icon is `aria-hidden` (state announced by radix). Focus ring on triggers (§5).

```
FAQ
   Frequently asked questions
┌ Does it work with my number?        + ┐  ┌ Which couriers are supported?    + ┐
├ Do customers install anything?      + ┤  ├ Is my data safe?                 + ┤
├ Does the AI reply in Bangla?        − ┤  ├ Can my team use it together?     + ┤
│   Yes — it understands and replies…  │  ├ Is there a free plan?            + ┤
└ Can I take bKash/Nagad payments?    + ┘  └ …                                  ┘
```

---

### 3.11 Footer

Dark, structured. `--lp-bg-1`, top `--lp-border`. `py-16`. Inner `max-w-[1200px]`.

**Top: newsletter band** (`grid md:grid-cols-2 gap-8 items-center`, `pb-12 border-b --lp-border`):
- Left: H3 **"Stay connected"** `--lp-text` + line `--lp-text-muted` "Product tips & updates for sellers. No spam."
- Right: inline form — email `<input>` (`--lp-surface`, `--lp-border`, `--lp-r-md`, `h-12`, `--lp-text` placeholder `--lp-text-dim`) + violet submit "Subscribe". On mobile stacks full-width. Real `<form>`, `type=email required`, `aria-label`, inline success/error text (`--lp-green-400` / `--lp-destructive`). Honeypot field (per web rules) not CAPTCHA.

**Middle: columns** (`grid grid-cols-2 md:grid-cols-5 gap-8 py-12`):
- Col 1 (span 2 on md): wordmark + one-line description `--lp-text-muted` + **social icons** row (`lucide` Facebook, Instagram, Linkedin, Youtube; plus a **green WhatsApp** icon → wa.me link). Icons `size-9` rounded `--lp-surface` tiles, hover `--lp-surface-2` + icon→`--lp-violet-300` (WhatsApp→green).
- Col 2 **Product**: Features, Pricing, AI agent, Integrations.
- Col 3 **Company**: About, Blog, Careers, Contact.
- Col 4 **Support**: Help center, WhatsApp us, Status, API docs.
- Col 5 **Legal**: Privacy, Terms, Refund policy.
Links `--lp-text-sm --lp-text-muted` hover `--lp-text`. Column headers `--lp-text-xs uppercase --lp-text-dim tracking`.

**Bottom bar** (`pt-8 border-t --lp-border flex flex-col md:flex-row justify-between gap-4`): `© 2026 Ecomex Automation. Made in Bangladesh 🇧🇩` `--lp-text-xs --lp-text-dim` + a small **language switcher** (EN / বাংলা) reusing `LanguageSwitcher` + payment-trust mini-row (bKash/Nagad monochrome).

**A11y:** `<footer>`, nav landmarks per column (`<nav aria-label="Product">` etc.), all icon links labeled.

---

### 3.12 Sticky mobile CTA bar (mobile only)

Persistent bottom bar on `<md` that converts the always-scrolling thumb-user. **Not on desktop.**
- `fixed inset-x-0 bottom-0 z-40 md:hidden`, `--lp-surface-glass` + `backdrop-blur-xl` + top `--lp-border`, `safe-bottom` padding, `p-3`.
- Two actions, `flex gap-3`:
  - **Primary** (flex-1): violet "Start free trial" (`h-12`, `--lp-r-md`, bold) → signup.
  - **WhatsApp** (icon button, `size-12`): green circle `--lp-green-500`, white `lucide MessageCircle`/WhatsApp glyph, `--lp-glow-green` → `wa.me` link. This is the **only** green button on screen at a time.
- **Behavior:** hidden until the user scrolls past the hero CTAs (so it doesn't double up with them); slide-up in (`slide-up` keyframe). Hide when the footer newsletter or pricing CTAs are in view (avoid stacking duplicate asks) — optional polish via IntersectionObserver. Reduced-motion: appears without slide.
- Ensure page content has `pb-20 md:pb-0` so the bar never covers the footer's last row.

```
STICKY MOBILE CTA (bottom, <md)
┌───────────────────────────────────────┐
│ [   Start free trial   ]      ( ⬤ WA )│   ← violet primary + green WhatsApp
└───────────────────────────────────────┘
```

### 3.13 Floating WhatsApp button (optional, desktop)

Repo already has `FloatingWhatsAppButton.tsx`. On desktop, a single green FAB bottom-right (`size-14`, `--lp-green-500`, `--lp-glow-green`, gentle `float`/`pulse-ring` — reduced-motion static). Don't show it on mobile (the sticky bar already has WhatsApp). Keep ≤1 floating green element.

---

## 4. Image / screenshot slots (engineer fills; flag to marketing)

Provide exact aspect ratios so layout never shifts (set `width`/`height` or `aspect-[]` + `object-cover`). Use `loading="lazy"` except `HERO_SHOT` (eager + `fetchpriority="high"`). Prefer AVIF/WebP with fallback. Frame device shots; do not ship raw bezels-less screenshots floating without a frame (looks unfinished).

| Slot | Where | Aspect / size | Content | Notes |
|---|---|---|---|---|
| `HERO_SHOT` | Hero, below CTAs | **16:10**, render ≤1200×750 | Unified inbox, light data, a Bangla message + green ticks visible | Eager, high priority; browser frame; violet glow behind |
| `TRUST_LOGOS` | Trust strip | each `h-6/7`, SVG | bKash, Nagad, Rocket, Pathao, Steadfast, RedX | Monochrome/greyscale; real marks; `aria-label` each |
| `SHOT_INBOX` | Spotlight 1 | **16:10** browser frame | Inbox list + open conversation, assignment/tags | desktop chrome |
| `SHOT_AI` | Spotlight 2 | **9:16 or 4:5** phone frame | Chat thread w/ AI reply in Bangla, "AI replied" chip | green ticks; show handoff toggle |
| `SHOT_ORDER` | Spotlight 3 | **16:10** browser frame | Order builder + courier/tracking panel | bKash link + Pathao status |
| `PHOTO_VISION` | Commitment | **3:4** portrait | Real BD shop owner / market scene | not stock office |
| `PHOTO_MISSION` | Commitment | **3:4** portrait | Packing/handover/delivery moment | local context |
| `AVATAR_1..n` | Testimonials | **1:1**, 80px | Real customer faces (with consent) | rounded |
| `VIDEO_THUMB_1..n` | Testimonials | **16:9** | Video poster frames | green play overlay; mp4 in dialog |
| `OG_IMAGE` | `<head>` meta | **1200×630** | Branded share card (replace current lovable.dev placeholder) | update `index.html` og/twitter image |

**Placeholder strategy until assets exist:** use a `--lp-surface` block with `--lp-border`, a centered `lucide ImageIcon` `--lp-text-dim`, and the slot name — never a broken `<img>`. Keep the exact aspect box so swapping in the real asset causes zero layout shift.

---

## 5. Accessibility (must-pass)

- **Contrast:** all body text combos in §2.4 meet WCAG AA (4.5:1) on their stated background; large headings ≥3:1. Don't place `--lp-text-muted` on `--lp-surface-2`/glass without rechecking — glass over a bright glow can drop contrast; if so, deepen the scrim or bump to `--lp-text`. White-on-violet only for bold ≥16px (CTA labels); body-size violet text uses `--lp-violet-50`.
- **Color is never the only signal:** "Most popular" has a text tag; success uses a check **icon** not just green; "online" uses a labeled dot; pricing differences are in text, not hue.
- **Focus:** every interactive element has a **visible focus-visible ring** — 2px `--lp-violet-400` + 2px offset against `--lp-bg` (reuse the existing `.focus-ring` utility's pattern but with violet ring). Never remove outlines without a replacement. Test full keyboard tab order: nav → hero CTAs → … → footer; mobile sheet & dialogs trap focus and restore on close.
- **Targets:** all tap targets ≥44×44px (CTAs `h-12`, icon buttons `size-11/12`, carousel arrows padded). Critical on mobile.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` → disable hero glow drift, float, marquee, autoplay, parallax, slide-ins; keep instantaneous opacity or nothing. Provide it globally:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .lp *, .lp *::before, .lp *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- **Semantics:** one `<h1>` (hero). Sections use `<section aria-labelledby>` tied to their H2. Landmarks: `header`, `main#main`, `footer`, labeled `nav`s. Decorative glow/grid layers `aria-hidden`. Images have meaningful `alt` (or `alt=""` if purely decorative). Form inputs have associated `<label>` (visually-hidden ok).
- **Language:** Bangla strings carry `lang="bn"` (also routes them to the Bengali font, §1.1). Page `<html lang>` reflects current i18n locale.
- **Motion-safe announcements:** pricing toggle uses `aria-live="polite"`; carousel position is conveyed to SR users.

---

## 6. Anti-template note (make it look intentional, not stock)

This page must not read as "default dark shadcn landing #4,000." Concrete commitments that buy intentionality:

1. **Local proof beats generic logos.** bKash/Nagad/Pathao/Steadfast monochrome marks + real Bangladeshi seller faces and shop photos. This single choice is the strongest signal that the product is *for them*. No "diverse stock office".
2. **Green is scarce and meaningful.** Violet owns the page; WhatsApp green appears only for live/online/success/WhatsApp and never as a second decorative accent. Restraint is the design — most clones smear two accents everywhere.
3. **Real product, framed.** Hero and spotlights show actual screenshots in proper device/browser frames with one floating accessory chip for depth — not abstract 3D blobs or fake dashboards. The product *is* the hero image.
4. **Glass = hairline + inset highlight + glow, not gray drop-shadows.** The `rgba(255,255,255,0.04)` inset top edge on every card and violet glows (never muddy black shadows) are what make it feel premium on near-black. Get this detail right and the whole page lifts.
5. **Rhythm, not uniform padding.** Section bands alternate (`--lp-bg` / `--lp-bg-1`), spotlights alternate image side, Pro pricing card breaks the grid (raised + glow), commitment cards are tall portraits among wide cards. Deliberate asymmetry.
6. **Type does work.** Inter with genuinely tight display tracking (`-0.03em` at 80px) and tabular figures on every number (prices, stats) — the hero line breaks are art-directed, not left to chance. Bangla set in its proper serif face, never tofu'd into Inter.
7. **Bilingual by design.** Bangla microcopy under CTAs and a EN/বাংলা switch signal "built here," not a translated Western template.
8. **One canvas hue.** Background is violet-tinted near-black (`#08080C`, 240° hue), not `#000` — glows blend instead of looking like JPEG artifacts. Tiny detail, big "designed" payoff.

**Banned here:** centered gradient-blob hero with no product; uniform 3-card grid with identical emphasis; two decorative accent colors fighting; gray drop-shadows on dark; unmodified shadcn card defaults; "AI business success" generic copy; stock office photography; non-tabular price numbers that jiggle on toggle.

---

## 7. Implement-this handoff (build order for the frontend engineer)

1. **Tokens & scope first.** Create `src/styles/landing.css` with all `.lp` tokens (§2) + the reduced-motion block (§5) + the `[lang="bn"]` font rule (§1.1). Add Inter to `index.html` (§1.2). Optionally extend `tailwind.config.ts` with the `lp` color group (§2.6). Mount the landing route outside `AppLayout` with `<div className="lp">` as root.
2. **Primitives:** define `LpButton` variants (`primary` violet, `ghost` outline, `whatsapp` green) wrapping shadcn `Button` with the landing tokens; `LpCard` (surface + border + inset highlight + shadow); `Eyebrow`, `StatChip`, `GlassPill`, `SectionShell` (handles `max-w`, padding, `id`, `aria-labelledby`), and `GlowBackdrop` (the reusable radial-glow + dot-grid layer).
3. **Sections** in page order (§3.1→§3.11), each its own file under `src/components/landing/`. Use `framer-motion` `whileInView` for reveals (§2.7). Embla for testimonials (§3.9), radix Accordion for FAQ (§3.10), radix Switch for pricing toggle (§3.7), radix/vaul for mobile nav sheet & video lightbox.
4. **Sticky mobile bar + WhatsApp FAB** (§3.12–3.13); wire scroll-reveal with IntersectionObserver (no scroll-event churn).
5. **Image slots** as placeholder blocks with correct aspect (§4); hand the slot table to marketing for real assets; replace `OG_IMAGE` in `index.html`.
6. **A11y pass** (§5): keyboard tab-through, focus rings, contrast spot-check on glass-over-glow, reduced-motion verify, SR labels on icon-only controls.
7. **Perf:** lazy-load below-fold images, eager hero shot, defer the video module until a play button is clicked, keep landing JS lean (don't pull the whole app bundle into the marketing route — code-split it).

**Definition of done:** matches the reference's dark/violet/glass language; shows real product screenshots; green appears only as success/WhatsApp; passes AA contrast & keyboard nav; looks intentional per §6; mobile-first with a working sticky CTA; Bangla renders in the serif face, Latin in Inter.
