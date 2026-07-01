# What A App — Theme v2 Quick Reference

**Date:** 2026-07-01
**Boss directive:** Match brand, add motion + 3D-glass, perfect mobile, optimize for long-term team.

---

## Files

| File | Purpose |
|---|---|
| `apps/web/src/styles/theme.css` | Master theme — 3 palettes × 2 modes, motion, glass, typography |
| `apps/web/tailwind.config.theme-v2.ts` | Tailwind extension (rename to `tailwind.config.ts` to activate) |
| `apps/web/_THEME_PLAN.md` | Full 4-phase rollout plan |

---

## How to use

### Activate theme v2

```bash
# 1. Replace existing tailwind config
cd apps/web
cp tailwind.config.ts tailwind.config.ts.bak
cp tailwind.config.theme-v2.ts tailwind.config.ts

# 2. Import theme.css in src/main.tsx (or wherever root styles are imported)
# import "./styles/theme.css";

# 3. (Optional) Switch palette via HTML attribute:
# <html data-palette="A"> for Indigo+Coral
# <html data-palette="B"> for Teal+Lava
# <html data-palette="C"> for Violet+Amber (default)
```

### Switch palettes at runtime

```tsx
// In your root component
<html data-palette="A" data-theme="dark"> {/* Indigo+Coral dark */}
<html data-palette="B" data-theme="light"> {/* Teal+Lava light */}
<html data-palette="C"> {/* Violet+Amber (default theme via .dark class) */}
```

### Apply 3D-glass card

```tsx
<div className="glass-3d-hover rounded-2xl p-6">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

### Apply amber CTA

```tsx
<button className="btn-cta">
  ৫ দিন ফ্রি শুরু করুন
</button>
```

### Apply motion

```tsx
<div className="lp-fade-up">...</div>          {/* Fade up on mount */}
<div className="lp-pulse-glow">...</div>        {/* Breathing glow */}
<div className="lp-orbit-slow">...</div>         {/* Slow rotation */}
<div className="lp-stagger">                     {/* Staggered children */}
  <div>...</div>
  <div>...</div>
</div>
```

### Apply typography

```tsx
<h1 className="lp-display">...</h1>             {/* Hero headline */}
<h2 className="lp-h2">...</h2>                  {/* Section heading */}
<h3 className="lp-h3">...</h3>                  {/* Card heading */}
<p className="lp-lead">...</p>                  {/* Subhead */}
<p className="lp-body">...</p>                  {/* Body text */}
<p className="lp-caption">...</p>               {/* Section eyebrow */}
```

### Apply gradient text

```tsx
<span className="lp-text-gradient">WhatsApp CRM</span>
```

### Apply mobile sticky CTA

```tsx
// In layout component
<main className="lp-with-sticky-cta">...</main>

// At bottom of layout
<div className="lp-sticky-cta md:hidden">
  <button className="btn-cta">৫ দিন ফ্রি শুরু করুন</button>
</div>
```

### Density toggle

```tsx
// Set on <html> element
<html data-density="compact">     {/* 14px base */}
<html data-density="default">     {/* 15px base — current */}
<html data-density="spacious">    {/* 16px base */}
```

### Reduced motion

```css
/* Already handled globally in theme.css via @media (prefers-reduced-motion: reduce) */
/* Users with this system pref get instant transitions, no animations */
```

---

## Token reference

### Colors (Palette C default = Violet + Amber)

| Token | Light | Dark |
|---|---|---|
| `--lp-bg` | `#f6f6fb` | `#08080c` |
| `--lp-bg-1` | `#eae9f2` | `#0c0c13` |
| `--lp-surface` | `#ffffff` | `#111119` |
| `--lp-surface-2` | `#f3f2f9` | `#15151f` |
| `--lp-elevated` | `#f6f3ff` | `#16131f` |
| `--lp-text` | `#1a1a22` | `#f4f4f6` |
| `--lp-text-muted` | `#56566a` | `#a1a1b5` |
| `--lp-text-dim` | `#65657e` | `#82829a` |
| `--lp-border` | `rgba(20,20,40,0.10)` | `rgba(255,255,255,0.08)` |
| `--lp-primary` | `#7c3aed` | `#a78bfa` |
| `--lp-primary-rgb` | `124 58 237` | `167 139 250` |
| `--lp-cta` | `#f59e0b` | `#fbbf24` |
| `--lp-cta-rgb` | `245 158 11` | `251 191 36` |
| `--lp-on-cta` | `#1a0a00` | `#1a0a00` |
| `--lp-glow-primary` | `rgba(124,58,237,0.32)` | `rgba(167,139,250,0.45)` |
| `--lp-glow-cta` | `rgba(245,158,11,0.40)` | `rgba(251,191,36,0.50)` |
| `--lp-wa` | `#25d366` | `#25d366` |
| `--lp-wa-text` | `#047857` | `#34d399` |

### Motion

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | `100ms` | Color flash |
| `--dur-fast` | `150ms` | Hover state |
| `--dur` | `250ms` | Default transition |
| `--dur-slow` | `450ms` | Page transitions, large UI |
| `--dur-stage` | `700ms` | Hero entrance choreography |
| `--dur-cinematic` | `1200ms` | Marketing flourishes |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default ease-out |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Delightful micro-moments |
| `--stagger-1..5` | `50ms..250ms` | Cascade delays |

### Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | `8px` | Tags, chips |
| `--r-md` | `12px` | Buttons, inputs |
| `--r-lg` | `16px` | Base |
| `--r-xl` | `20px` | Cards |
| `--r-2xl` | `28px` | Feature blocks |
| `--r-3xl` | `32px` | Oversize surfaces |
| `--r-pill` | `9999px` | Pill buttons |

### Elevation

| Token | Use |
|---|---|
| `--elevation-1` | Subtle lift (cards at rest) |
| `--elevation-2` | Default lift (cards on hover) |
| `--elevation-3` | Strong lift (modals, popovers) |
| `--elevation-4` | Dramatic lift (mobile sticky bar) |

---

## Do / Don't

### ✅ DO

- Use `lp-*` semantic tokens (`bg-lp-surface`, `text-lp-text`, `border-lp-border`)
- Use `bg-lp-cta` for action buttons (NOT brand color)
- Apply `.glass-3d-hover` to feature cards (gives 3D feel)
- Apply `.lp-fade-up` or `.lp-stagger` for entrance
- Honor `prefers-reduced-motion` (already global)
- Test on real mobile device before shipping
- Use `touch-target` class for all interactive elements <44×44px
- Verify WCAG AA contrast (4.5:1 body, 3:1 large text)

### ❌ DON'T

- Hardcode hex colors (`bg-[#7c3aed]`) — use `bg-lp-primary` instead
- Use `lp-primary` for CTA buttons — use `lp-cta` to separate brand from action
- Add motion that loops faster than 3s (feels jittery)
- Add parallax (battery drain + motion sickness)
- Use `backdrop-filter` on more than 3 surfaces per page (perf cost)
- Forget `safe-top` / `safe-bottom` on mobile chrome
- Use `onclick` without `onKeyDown` / `role` (a11y)

---

## Component patterns

### Hero CTA cluster

```tsx
<div className="flex flex-col sm:flex-row gap-3 lp-fade-up">
  <button className="btn-cta">
    ৫ দিন ফ্রি শুরু করুন
    <ArrowRight className="size-4" />
  </button>
  <button className="btn-secondary">
    <PlayCircle className="size-4" />
    দেখুন কিভাবে কাজ করে
  </button>
</div>
```

### Feature card with 3D glass

```tsx
<article className="glass-3d-hover rounded-2xl p-6 lp-fade-up">
  <div className="lp-tile-violet size-12 rounded-xl flex items-center justify-center mb-4">
    <Inbox className="size-6 text-lp-primary" />
  </div>
  <p className="lp-caption text-lp-primary mb-2">UNIFIED INBOX</p>
  <h3 className="lp-h3 mb-3">Three apps, one screen. Nothing slips.</h3>
  <p className="text-lp-muted">...</p>
</article>
```

### Stats with motion counter

```tsx
<div className="lp-stat-value text-4xl font-bold text-gradient">
  <CountUp end={5000} duration={1.5} suffix="+" />
</div>
<div className="text-sm text-lp-muted">BD shops</div>
```

---

## Accessibility checklist

- [ ] WCAG AA contrast on all text (4.5:1 body, 3:1 large)
- [ ] Keyboard nav on all interactive elements
- [ ] Focus rings always visible (`:focus-visible` global)
- [ ] Skip-to-content link on every page
- [ ] Reduced-motion respected
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] Form labels + error messages associated via `aria-describedby`
- [ ] Live regions for toasts + async state

---

**Boss — 3 palette options দিলাম। Pick করুন (A/B/C), তারপর আমি apply করব।**