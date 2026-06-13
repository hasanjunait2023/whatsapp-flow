---
name: finexy-dashboard-ui
description: Use when building, restyling, or reviewing ANY admin/tenant panel page in apps/web. Applies the "Warm Light Fintech" dashboard design — icon rail + top pill-nav shell, bento cards, one orange highlight, status pills, tabular numbers, LazyMotion. Enforces the look + perf rules from DESIGN.md + DESIGN_SYSTEM.md.
---

# finexy-dashboard-ui — building pages in our design language

Read alongside `apps/web/DESIGN.md` (structure) and `apps/web/DESIGN_SYSTEM.md` (tokens).
This skill is the **recipe + checklist**. Follow it for every panel page.

## The 8 rules (non-negotiable)
1. **Tokens only.** Never hardcode hex. Use `bg-card text-foreground bg-primary text-muted-foreground border-border bg-success-soft …`. Page bg = cream (`--background`), cards = off-white (`--card`).
2. **One orange surface per page.** `bg-primary` fills exactly ONE focal tile (the top KPI). Everywhere else orange is text/icon/active-state/CTA only.
3. **Big tabular numbers.** Every money/count uses `tabular-nums` (class `.tabular-nums` or `font-variant-numeric`) so columns align + don't jitter. Animate with `useCountUp` from `@/lib/motion`.
4. **Status = pills.** Use the `<Badge variant="success-soft|warning-soft|info-soft|destructive-soft|neutral-soft">` with a leading dot. Completed=green, Pending=amber, In-Progress=blue, Failed=red.
5. **Cards: rounded + soft.** `rounded-card` (20–24px), `shadow-elevation-1`, 20–24px padding, hairline borders. Hover-lift only on interactive cards.
6. **Motion: cheap + respectful.** Use `m.*` (LazyMotion is app-wide), variants `pageEnter / staggerContainer / staggerItem / hoverLift / modalSpring` from `@/lib/motion`. Animate ONLY transform/opacity. Reduced-motion is global. Never animate >~20 list items; virtualize long tables.
7. **Mobile-first + app-like.** Single column on mobile, 44px touch targets, bottom sheets over modals, no horizontal overflow. Test at 360px.
8. **Real data + states.** Use existing hooks (never fake data). Always: Skeleton on load, EmptyState when empty, optimistic mutation + toast.

## Page skeleton (copy this shape)
```tsx
import { m } from "@/lib/motion";
import { pageEnter, staggerContainer, staggerItem } from "@/lib/motion";

export default function SomePage() {
  return (
    <m.div variants={pageEnter} initial="hidden" animate="show"
           className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-5 space-y-6">

      {/* 1. Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {/* 2. Optional in-page sub-tabs (pill Tabs) to keep top-nav short */}
      {/* <Tabs> … </Tabs> */}

      {/* 3. KPI strip — stat cards + the ONE orange tile */}
      <m.div variants={staggerContainer} initial="hidden" animate="show"
             className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <m.div variants={staggerItem}><KpiCard … /></m.div>
        {/* exactly one: <EarningsHighlightTile /> (bg-primary) */}
      </m.div>

      {/* 4. Bento body — 12-col asymmetric grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <Card className="lg:col-span-8 …">{/* chart / table */}</Card>
        <Card className="lg:col-span-4 …">{/* list / progress / cards */}</Card>
      </div>
    </m.div>
  );
}
```

## Component map (use these, don't reinvent)
| Need | Use |
|---|---|
| Card / tile | `@/components/ui/card` (Card, CardHeader, CardContent) — `rounded-card shadow-elevation-1` |
| KPI / stat | `@/components/dashboard/bento/KpiCard` |
| Orange focal KPI | `@/components/dashboard/bento/EarningsHighlightTile` |
| Bar/area chart | Recharts (dep) with `--chart-1` orange + `--chart-2` ink, rounded bars, token tooltip (see `OrdersRevenueChart`) |
| Progress | orange bar, track `bg-muted`, rounded-full |
| Table | `@/components/ui/table` (sticky header, 40px rows, row hover) + status `<Badge>` pills |
| Tabs (sub-nav) | `@/components/ui/tabs` (pill track + active card) |
| Button | `@/components/ui/button` — `default`=orange, `secondary`=near-black, `ghost` |
| Pill / status | `@/components/ui/badge` (`*-soft` variants) |
| Loading | `@/components/ui/skeleton` (shimmer, match the layout) |
| Number count-up | `useCountUp` from `@/lib/motion` |
| Motion | `m`, variants from `@/lib/motion` |

## Shell (already built — don't fight it)
- Top bar = brand + **pill-nav** (6 primary sections) + search/bell/theme/profile (glass).
- Left **icon rail** = quick-jump tools (active = near-black square / orange-soft).
- Mobile = bottom tab bar (safe-area) replaces both.
- New pages render inside `<Outlet/>` (per-route error boundary already wraps it).

## Definition of done (per page)
- [ ] Header (greeting/title + subtitle). [ ] KPI strip with exactly one orange tile.
- [ ] Bento grid, asymmetric, 20–24px gaps, `rounded-card` soft cards.
- [ ] Status pills + tabular numbers wherever status/money/counts appear.
- [ ] `pageEnter` + stagger + hover-lift, transform/opacity only, reduced-motion ok.
- [ ] Skeleton + EmptyState + optimistic mutations; real hooks, no fake data.
- [ ] Mobile single-column at 360px, 44px targets, no overflow.
- [ ] No hardcoded hex; tokens only. Build stays green.
