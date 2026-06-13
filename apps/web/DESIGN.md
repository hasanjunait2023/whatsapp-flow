# DESIGN.md — Exact Dashboard Structure ("Finexy-style" reference)

> This is the **structural / layout** contract. Color + type + motion tokens live in
> `DESIGN_SYSTEM.md` (Direction A "Warm Light Fintech", already shipped). This file
> pins the EXACT shell + page anatomy the founder approved from the reference, and
> maps our CRM's sections onto it. Build every panel page to this skeleton.

---

## 0. The look in one line
A friendly, **rounded, light** fintech dashboard: a thin **icon rail** on the left, a
white **top bar with pill-nav** for the primary sections, a big personal greeting, and a
**bento grid of soft white cards** with exactly ONE orange highlight tile, big tabular
numbers, soft status pills, and a clean activity table. Generous whitespace, ~20–24px
radius everywhere, near-flat soft shadows. App-like, mobile-first, zero-lag.

---

## 1. APP SHELL (the structural skeleton)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  cream page bg (#F5F2EC)  — thin gutter all around the rounded app surface  │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ TOP BAR (white, rounded, sticky, glass)                                 │ │
│ │  [◆ logo+name]   [ Overview · Activity · Manage · … pill-nav ]   [🔍 🔔 ⓘ │profile▾]│
│ ├──────┬────────────────────────────────────────────────────────────────┤ │
│ │ ICON │  CONTENT CANVAS                                                  │ │
│ │ RAIL │   "Good morning, <name>"  + subtitle                             │ │
│ │ (⚙☀  │   ┌── BENTO GRID (12-col, gap 20–24px) ───────────────────────┐ │ │
│ │  ▣📅 │   │  [ hero tile ] [orange tile] [stat][stat]  [ chart tile ] │ │ │
│ │  ✉📈 │   │  [ progress  ] [ cards ]    [ recent-activities table   ] │ │ │
│ │  👥…  │   └────────────────────────────────────────────────────────┘ │ │
│ │ ?  ⎋ │                                                                  │ │
│ └──────┴────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Outer frame
- Page background: `hsl(var(--background))` cream. The whole app sits on a large
  rounded surface (radius 28–32px) with a ~12–20px cream gutter around it (the cream
  shows as a frame). On mobile the gutter collapses to 0 and the surface is full-bleed.

### 1.2 Top bar (primary navigation)
- White/`--card`, full width of the app surface, height ~64px, sticky, subtle
  **glass** (`--glass-bg` + backdrop-blur) + hairline bottom border, radius matches the
  surface top corners.
- **Left:** brand = orange rounded-square icon (the favicon glyph) + product name
  (near-black, semibold). Clicking → Dashboard.
- **Center:** **pill-nav** of the PRIMARY sections. Inactive = grey text, no bg, ~14px
  medium. **Active = solid near-black pill** (`--secondary`) with white text, radius
  full. Hover on inactive = `--muted` soft pill. (Our sections below.)
- **Right (cluster):** search (opens Cmd+K palette), notification bell (badge dot),
  help/info, **theme toggle** (sun/moon), then a **profile chip** = avatar + name +
  email (2-line, truncated) + chevron in a `--muted` rounded pill → dropdown
  (profile / settings / workspace switch / admin / sign out).
- Mobile: pill-nav hides; primary sections move to the **bottom tab bar**. Top bar keeps
  brand + search + bell + profile.

### 1.3 Left icon rail (quick tools / secondary jumps)
- Thin (~64px), `--card`/white, rounded, icon-ONLY, vertical stack, generous gaps.
- Top: settings ⚙, theme ☀/☾. Then quick-jump icons (Dashboard ▣ = active black
  rounded square, Inbox ✉, Orders 🧾, Contacts 👥, Analytics 📈, …). Bottom pinned:
  help ?, sign-out ⎋.
- **Active icon** = filled near-black rounded square (`--secondary`) OR orange-soft tint
  with a 3px left/inner orange marker (`--sidebar-accent`). Tooltip on hover (label).
- Touch target ≥44px. On mobile the rail is hidden (bottom tab bar replaces it).

### 1.4 Content canvas
- `max-width: 1440px`, centered, padding `clamp(16px, 3vw, 32px)`.
- **Greeting header:** `getGreeting()` + ", <first name>" — display size (28–34px bold,
  near-black) + a muted subtitle line. Optional right-aligned date / quick action.
- Below: the **bento grid**.

### 1.5 Our sections → top pill-nav (IA mapping)
The reference has 6 top tabs. We collapse our ~30 pages into a small primary set; the
icon rail + in-page tabs carry the rest.

**TENANT top pill-nav:** `Overview` (Dashboard) · `Inbox` · `Sales` · `Finance` ·
`Team` · `Settings`.
- Overview → /dashboard. Inbox → /inbox (with in-page sub-tabs: WhatsApp / Facebook /
  Groups / Contacts / WA-Functions). Sales → /orders (sub-tabs: Orders / Products /
  Inventory / Complaints). Finance → /accounts (sub-tabs: Accounting / Billing /
  Reports). Team → /team (sub-tabs: Team / Chat / Boards / Reports). Settings →
  /settings.
- The deeper tools (Automation, Workflows, AI Agent, Analytics, Segmentation, Instances,
  Notifications, Service Boards) live in the **left icon rail** + the relevant section's
  in-page sub-tabs. Nothing is removed — just re-housed.

**ADMIN top pill-nav:** `Overview` · `Tenants` · `Billing` · `Operations` · `Marketing`
· `Settings` — same pattern, admin pages grouped under these.

> In-page **sub-tabs** use the pill `Tabs` primitive (track + active card). This keeps
> the top pill-nav short (6 items) like the reference while preserving every page.

---

## 2. BENTO GRID + CARD ANATOMY (match the reference exactly)

12-column CSS grid, `gap: clamp(16px, 1.5vw, 24px)`, cards `rounded-card` (20–24px),
`shadow-elevation-1`, `bg-card`, padding 20–24px. Tiles span columns asymmetrically.

### 2.1 Hero tile ("Total Balance" equivalent) — span 4–5 cols
- Tiny muted label (uppercase-ish) → **big tabular number** (32–40px bold, count-up) →
  a small unit/period chip (e.g. ৳/period dropdown) → a **trend pill** (↑ x% vs last
  month; green=`success-soft`, red=`destructive-soft`).
- Two buttons: **primary near-black** + **secondary ghost** (reference: Transfer /
  Request → for us e.g. "New order" / "Broadcast").
- Optional sub-strip: "Wallets | Total N" + 3 mini chips with flag/icon + amount +
  Active/Inactive pill (for us → channels: WhatsApp / Facebook / Instagram numbers +
  connected/disconnected).

### 2.2 Orange highlight tile — span 2 cols — **EXACTLY ONE per page**
- `bg-primary` (orange) full fill, white text, `shadow-elevation-accent`. A headline
  KPI (count-up) + trend pill + a small icon top-right + an optional subtle bg
  sparkline/pattern at low opacity. This is the page's focal point (reference:
  "Total Earnings $950"). Use for the most important metric (e.g. Today's revenue).

### 2.3 Small stat cards — span 2 cols each
- Icon chip (status-soft bg) + label + **big tabular number** + trend pill. White card.
  4–5 in a KPI strip (reference: Spending / Income / Revenue).

### 2.4 Chart tile — span 4–6 cols, ~2 rows
- Title + muted subtitle + **legend pills** (e.g. Profit orange / Loss black) top-right.
- **Grouped/overlaid bar chart**: orange bars (`--chart-1`) + near-black bars
  (`--chart-2`), rounded tops, hairline horizontal gridlines, y-axis k-formatted,
  x-axis short month labels, token-styled tooltip (popover bg). Use Recharts (already a
  dep) — NO entrance jank, disable per-bar animation on low-end.

### 2.5 Progress tile ("Monthly Spending Limit") — span 4 cols
- Title + an **orange progress bar** (rounded, track = `--muted`) + "X spent out of Y"
  with the numbers in tabular figures.

### 2.6 "Cards" tile (optional, brand flavor) — span 4 cols
- "+ Add new" affordance + 1–2 **card visuals** (rounded gradient rectangles, one
  near-black + one orange, masked number / EXP / CVV, "Active" pill). For us this maps to
  **payment methods / connected accounts** as card-style visuals, or a "plan" card.

### 2.7 Recent Activities table — span 6–8 cols, full bottom row
- Header: title + **search input** + **Filter** button (ghost, icon).
- Table (restyled primitive): columns = `[checkbox] · ID · Activity (icon+label) ·
  Amount (tabular, right) · Status (pill) · Date · [⋯]`.
- **Status pills:** Completed = `success-soft` + green dot, Pending = `warning-soft` +
  amber dot, In Progress = `info-soft` + blue dot, Failed = `destructive-soft`.
- 40px rows, sticky header (overline muted caps), row hover = `--muted-soft`, ⋯ action
  menu on hover. Virtualize when > 200 rows. For us → recent orders / conversations /
  payments.

---

## 3. SPACING / RADIUS / SHADOW / MOTION (pin to the reference feel)
- Radius: cards 20–24px, controls/inputs 12px, pills/buttons full, icon-rail items 14px.
- Shadow: near-flat — `shadow-elevation-1` at rest, `-2`/`-accent` on hover only.
- Whitespace: the reference breathes — never crowd; 20–24px card padding, 24px grid gaps.
- Motion (LazyMotion, `m.*`, transform/opacity only): page-enter fade+8–12px; KPI
  stagger 40–60ms; card hover-lift `y:-2`; number count-up; pill-nav active uses a
  shared-layout `layoutId` underline/fill (cheap). Respect reduced-motion.

---

## 4. MOBILE (app-like — non-negotiable)
- Top pill-nav → **bottom tab bar** (≤5 items: Overview, Inbox, Sales, Finance, More) +
  `env(safe-area-inset-bottom)`, 56px + safe-area, icons+labels, orange active.
- Bento → single column, stat cards 2-up. Tables → card rows or horizontal scroll with
  sticky first col. Modals → bottom **sheets** (swipe-to-dismiss). Touch targets ≥44px.
- Left icon rail hidden on mobile.

---

## 5. DON'Ts (keep the premium feel)
- Never more than ONE orange surface per page. Orange = action/active/focus only.
- No pure-white cards on pure-white bg — cream bg + `--card` off-white cards (layering).
- No harsh/heavy shadows, no thick borders. Hairlines only.
- No layout-animating, no animating > ~20 list items, no Three.js/WebGL.
- Don't crowd: if a page feels dense, add whitespace + group into cards.

---

## 6. Build order (every page)
1. Wrap content in `pageEnter`. 2. Greeting/title header. 3. KPI strip (stat cards +
the one orange tile). 4. The page's primary bento tiles (chart / table / lists). 5.
Status pills + tabular numbers everywhere money/counts appear. 6. Skeletons on load,
empty states, optimistic mutations. 7. Verify mobile single-column + 44px targets.
