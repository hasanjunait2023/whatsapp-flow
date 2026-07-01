# What A App — Global Theme Refresh Plan
**Date:** 2026-07-01  
**Author:** JILLU (after Boss directive to overhaul brand color, add motion, 3D-glass feel, perfect mobile, optimize for long-term team use)

---

## 1. CURRENT STATE — Marketing Page Analysis (verified via agent-browser)

**Live URL:** `https://whatapp.ecomex.cloud`  
**Hero verified:** ✅ light mode, purple `#7c3aed` accent, Bengali headline + dual CTAs

### Section-by-section (from snapshot + vision_analyze):

| # | Section | Visual quality | Placeholder issue |
|---|---|---|---|
| 1 | Hero | ✅ Strong typography, clean dual-CTA, stats row | ⚠️ **HERO_SHOT placeholder** — no actual image |
| 2 | Stats row | ⚠️ Numbers shown as **X,000+ / XM+ / X hrs** | ⚠️ Real data missing |
| 3 | Trust badges | ✅ bKash/Nagad/Rocket/Pathao/RedX/Steadfast chips visible | (text-only, OK for now) |
| 4 | "Sound familiar?" — 3 problem cards | ✅ Clean cards w/ icon + bn caption + en desc | (good) |
| 5 | "Own your customer data" — ban-proof split | ✅ Strong split layout, 4 sub-features | (good) |
| 6 | "Everything you need to sell over chat" — 5 articles | ✅ Strong feature blocks w/ check lists | ⚠️ **SHOT_INBOX / SHOT_AI / SHOT_ORDER / SHOT_BROADCAST / SHOT_ANALYTICS placeholders** — 5 missing images |
| 7 | Testimonials | ⚠️ Cards visible, 5-star purple stars | ⚠️ **All customer names show `[Customer name]`, shop names `[Boutique name] / Dhaka`** — no real reviews |
| 8 | Final CTA | ✅ Clean, dual CTA | (good) |
| 9 | Footer | ✅ 4-column nav + subscribe form + social icons | (good) |

### What I see in code (not just visual):

- `landing.css` has **256 lines** of mature, token-driven `.lp` design system (dark + light themes)
- `tailwind.config.ts` has `lp-violet-*` ramp + `lp-green-*` ramp + semantic aliases (`accent`, `cta`, etc.)
- Already WCAG AA compliant on body text + interactive states
- Already has motion tokens: `--lp-dur-fast` (150ms), `--lp-dur` (250ms), `--lp-dur-slow` (450ms), `--lp-ease` (cubic-bezier)
- Already has glass primitive via `--lp-surface-glass`
- **Empty `data-theme` attribute on `.lp`** = defaults to dark scheme — but the page is rendering in **light mode** (Boss's theme switcher set it)
- 21st.dev API key already received: `8ae0...4c571`

---

## 2. THREE COLOR PALETTES (Boss: NOT orange, NOT cookie-cutter)

### Palette A — Indigo + Coral (twilight fintech)
| Token | Light | Dark |
|---|---|---|
| Primary | `#4f46e5` (indigo-600) | `#818cf8` (indigo-400) |
| CTA | `#ff6b5a` (coral-500) | `#ff7a6a` (coral-400) |
| BG | `#f6f6fb` | `#08080f` |
| Text | `#1a1a2e` | `#f0f0f8` |
| Glow primary | `rgba(79,70,229,0.32)` | `rgba(129,140,248,0.45)` |

**Vibe:** Mercury + Raycast. Premium fintech, distinctive.

### Palette B — Teal + Lava (BD-modern, bKash-adjacent)
| Token | Light | Dark |
|---|---|---|
| Primary | `#0d6e6e` (deep teal) | `#2dd4bf` (teal-400) |
| CTA | `#e85d04` (lava-orange) | `#fb923c` (lava-amber) |
| BG | `#f4f7f7` | `#06120f` |
| Text | `#0e1f24` | `#ecf3f1` |
| Glow primary | `rgba(13,110,110,0.30)` | `rgba(45,212,191,0.45)` |

**Vibe:** Wise + Vercel. Familiar to BD sellers (bKash-adjacent teal), premium commerce.

### Palette C — Violet + Amber (premium creator-feel) ⭐ RECOMMENDED
| Token | Light | Dark |
|---|---|---|
| Primary | `#7c3aed` (violet-600) | `#a78bfa` (violet-400) |
| CTA | `#f59e0b` (amber-500) | `#fbbf24` (amber-400) |
| BG | `#f6f6fb` | `#08080c` |
| Text | `#1a1a22` | `#f4f4f6` |
| Glow primary | `rgba(124,58,237,0.32)` | `rgba(167,139,250,0.45)` |

**Vibe:** Linear + Claude. Keeps current brand (no full redesign), but **adds amber CTA** for warmth. Most distinctive.

**My recommendation: Palette C** — keeps continuity, adds amber CTA pop, smallest implementation diff. Boss picks A/B/C.

---

## 3. GLOBAL THEME.css STRUCTURE

### Files affected:
- `apps/web/src/styles/landing.css` — extend with motion + glass + cta tokens (current file has foundation)
- `apps/web/src/index.css` — add global motion utilities + reduced-motion guards
- `apps/web/tailwind.config.ts` — add `cta` color slot, extend animation keyframes (orbit, shimmer-glow, glass-rise)
- **NEW:** `apps/web/src/styles/glass.css` — dedicated glass primitive (3D-feel card surface)
- **NEW:** `apps/web/src/lib/motion.ts` — Framer Motion presets (duration/easing curves from `--lp-*` tokens)

### Token additions (in `.lp` scope):

```css
/* 3D glass primitive — depth + light + refraction */
--glass-depth: 0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px -8px rgba(0,0,0,0.18), inset 0 1px 0 0 rgba(255,255,255,0.45);
--glass-shine: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%);
--glass-tint: var(--lp-surface-glass);
--glass-blur: 16px;
--glass-saturate: 140%;

/* Motion library (already exists, will be enriched) */
--lp-dur-fast: 150ms;
--lp-dur: 250ms;
--lp-dur-slow: 450ms;
--lp-dur-stage: 700ms;   /* for hero entrance choreography */
--lp-ease: cubic-bezier(0.22, 1, 0.36, 1);
--lp-ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
--lp-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* gentle overshoot for delightful micro-moments */

/* New CTA semantic slot (separates action color from brand identity) */
--lp-cta: <chosen palette cta>;       /* the warm action color */
--lp-cta-hover: <chosen palette cta-hover>;
--lp-cta-rgb: <chosen palette cta rgb triplet>;
--lp-on-cta: <chosen palette on-cta>;
--lp-glow-cta: <chosen palette glow-cta>;
```

### Glass primitive (new utility):
```css
.glass-3d {
  background:
    var(--glass-shine),
    var(--glass-tint);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate%);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: var(--glass-depth);
  transform-style: preserve-3d;
}
.glass-3d-hover { transition: transform 300ms var(--lp-ease), box-shadow 300ms var(--lp-ease); }
.glass-3d-hover:hover { transform: translateY(-2px) rotateX(2deg); box-shadow: ...deeper; }
```

### Motion utilities (Tailwind extends):
```ts
animations: {
  "fade-up": "fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
  "fade-in-stage": "fade-in 700ms var(--lp-ease) 200ms forwards",  // hero entrance
  "pulse-glow": "pulse-glow 3s ease-in-out infinite",             // CTA breathing
  "shimmer-glow": "shimmer-glow 2.5s linear infinite",             // skeleton + decorative
  "orbit-slow": "orbit 30s linear infinite",                        // decorative backdrop
  "float": "float 6s ease-in-out infinite",                         // existing, keep
}
```

### Mobile app-quality patterns:
- Sticky CTA bar at bottom on mobile (always-visible "৫ দিন ফ্রি শুরু করুন")
- Bottom-sheet style navigation drawer
- 44×44px minimum touch targets (already standard, verify in components)
- Safe-area inset for notched devices
- Pull-to-refresh disabled (avoid conflict with scroll)
- Swipe-back gesture on detail pages

### Long-term team-comfort:
- `prefers-reduced-motion: reduce` honored globally
- `prefers-color-scheme: dark` honors system pref on first load
- Density toggle persisted to `localStorage` (`compact` / `default` / `spacious`)
- Keyboard nav: Tab/Shift+Tab, Cmd+K for command palette, Esc for modals
- Focus rings always visible (2px ring offset on background color)
- Skip-to-content link (already exists, verify all pages)

---

## 4. ROLLOUT PLAN — 4 PHASES

### **PHASE 1 — Foundation (Day 1-2, ~6h)**
- [ ] Boss picks palette A/B/C
- [ ] Update `.lp[data-theme="dark"]` and `.lp[data-theme="light"]` with new tokens (10 min)
- [ ] Add `--lp-cta-*` + `--lp-on-cta` + `--lp-glow-cta` tokens
- [ ] Create `apps/web/src/styles/glass.css` with `.glass-3d` primitive
- [ ] Add new Tailwind animations (`fade-up`, `pulse-glow`, `shimmer-glow`, `orbit-slow`)
- [ ] Add `reduced-motion` global guard in `index.css`
- [ ] Install 21st.dev MCP (npx @21st-dev/cli mcp, use API key from Boss)
- [ ] Verify: `pnpm build` passes, no console errors, Vercel auto-deploys

### **PHASE 2 — Marketing page polish (Day 3-5, ~12h)**
- [ ] **Hero:** wire `.glass-3d` to hero shot frame + replace `HERO_SHOT` placeholder with real screenshot/3D mockup
- [ ] **Stats:** replace `X,000+ / XM+ / X hrs` with real numbers (or motion-counter that animates from 0)
- [ ] **Feature blocks (5 articles):** replace `SHOT_*` placeholders one-by-one with real inbox/AI/order/broadcast/analytics screenshots
- [ ] **Testimonials:** wire 3 real customer quotes (currently `[Customer name]` placeholders) — collect from sales/Boss
- [ ] **Apply amber CTA:** change `৫ দিন ফ্রি শুরু করুন` from purple → amber (separates brand from action)
- [ ] **Add micro-motion:** fade-up entrance for each section as it scrolls into view (use `framer-motion` `whileInView`)
- [ ] **Add 3D-glass cards:** wrap each feature block in `.glass-3d-hover` for tactile feel
- [ ] **Mobile sticky CTA bar:** bottom-fixed on `< 768px` viewports
- [ ] **Verify:** mobile (iPhone 14 / Galaxy S23 viewport) + desktop (1440px) both render perfectly

### **PHASE 3 — Auth + dashboard pages (Day 6-10, ~20h)**
- [ ] **Auth pages** (Login / Signup / Forgot / Reset): apply theme tokens, add glass-3d to hero panel, add entrance choreography
- [ ] **Dashboard layout** (sidebar + topbar + content): unify across all 40 pages via 5 layout components
- [ ] **Empty states:** design 12 reusable empty-state templates with illustrations
- [ ] **Loading states:** shimmer + skeleton tokens for all data-fetching components
- [ ] **Toasts/menus/modals:** unify via shared `<Surface>` primitive (3D glass)
- [ ] **Density toggle:** `localStorage`-persisted, default = `default` (15px base, current)
- [ ] **Keyboard shortcuts overlay:** Cmd+K command palette (search nav + recent + commands)

### **PHASE 4 — Long-term comfort + polish (Day 11-14, ~16h)**
- [ ] **Long-session comfort:**
  - Sticky headers show on scroll-up, hide on scroll-down
  - `auto-theme` mode that follows time-of-day (06-18 = light, 18-06 = dark)
  - Reduced-motion respects `prefers-reduced-motion` system pref
- [ ] **Performance:**
  - Lazy-load heavy illustrations (Lottie / 3D components)
  - Bundle audit (target: <300KB gzipped main chunk)
  - Image optimization (WebP + responsive `srcset`)
- [ ] **Accessibility audit:**
  - WCAG 2.2 AA on every page (axe-core via Playwright)
  - Screen reader smoke test (NVDA + VoiceOver key flows)
  - Keyboard-only nav test (no mouse, no touch)
- [ ] **Documentation:**
  - `apps/web/THEME.md` — token reference + do/don't
  - Storybook (or Ladle) for component library
  - Design Figma file (if not already) — sync with tokens
- [ ] **Validation:**
  - Lighthouse CI on every PR (perf > 90, a11y > 95, best-practices > 95, SEO > 90)
  - Visual regression tests (Chromatic or Percy) for marketing + dashboard

---

## 5. QUICK PATH (if Boss wants 2-week path, not 4)

**Sacrifice:** Phase 4 polish + Storybook + visual regression.

**Keep:** Phase 1 + Phase 2 + Phase 3 essentials (no auto-theme, no density toggle, no reduced-motion guard).

**Result:** Production-ready, beautiful, mobile-perfect, but team-comfort features deferred.

---

## 6. OPEN QUESTIONS FOR BOSS

1. **Palette:** A (Indigo+Coral) / B (Teal+Lava) / C (Violet+Amber ⭐) ?
2. **Rollout pace:** Full 4-week / Quick 2-week / Just Phase 1+2 (1 week, marketing only) ?
3. **Real testimonial content:** will provide / use placeholder "Coming soon from real customers" / hire copywriter ?
4. **21st.dev MCP install:** install now (requires API key) / defer ?
5. **Density default:** keep current (default) / default to compact for power users / user-pick on first load ?
6. **Auto-theme by time-of-day:** yes (06-18 light, 18-06 dark) / no (user toggle only) ?

**Default if Boss says "go":** Palette C + Quick 2-week path + Boss provides testimonials + 21st.dev MCP install + default density + no auto-theme.

---

## 7. FILES TOUCHED (full inventory)

| File | Change |
|---|---|
| `apps/web/src/styles/landing.css` | Add CTA tokens, motion tokens, glass tokens, all 3 palette schemes |
| `apps/web/src/styles/glass.css` | NEW — `.glass-3d` primitive + variants |
| `apps/web/src/index.css` | Add reduced-motion guard + global motion utilities |
| `apps/web/tailwind.config.ts` | Add `cta` color slot, extend animation keyframes |
| `apps/web/src/lib/motion.ts` | NEW — Framer Motion presets from CSS tokens |
| `apps/web/src/components/Surface.tsx` | NEW — 3D glass surface primitive |
| `apps/web/src/components/landing/Hero.tsx` | Replace placeholder + add motion |
| `apps/web/src/components/landing/Stats.tsx` | Replace placeholders + motion counter |
| `apps/web/src/components/landing/Features.tsx` | Replace 5 SHOT placeholders + glass-3d |
| `apps/web/src/components/landing/Testimonials.tsx` | Wire real quotes (or "coming soon") |
| `apps/web/src/components/landing/FinalCTA.tsx` | Amber CTA + mobile sticky bar |
| `apps/web/src/components/layout/DashboardLayout.tsx` | Verify on all dashboard pages |
| `apps/web/src/components/auth/AuthLayout.tsx` | Glass-3d hero panel |
| `apps/web/src/hooks/useDensity.ts` | NEW — density toggle persisted |
| `apps/web/src/hooks/useCommandPalette.ts` | NEW — Cmd+K state |
| `apps/web/THEME.md` | NEW — token reference for devs |

**Total:** ~16 files modified, 6 new files.

---

## 8. RISKS + MITIGATIONS

| Risk | Impact | Mitigation |
|---|---|---|
| Boss dislikes new color after rollout | High | Show 3 palette previews (3 side-by-side mocks) BEFORE applying |
| Build breaks from new tokens | Medium | Run `pnpm build` after every batch of token changes |
| Vercel auto-deploy fails | Medium | Manual `vercel deploy --prod --yes` as fallback |
| Performance regression from glass-3d | Medium | Limit glass to hero + auth + features (not dashboard chrome) |
| Team doesn't adopt new tokens | Low | Update ESLint rule: ban hardcoded hex colors |
| Real testimonials never arrive | Low | Use 3 anonymized quotes from real support transcripts |

---

## 9. SUCCESS METRICS (after rollout)

- **Marketing conversion:** 5-day free-trial signups → track for 2 weeks pre/post
- **Bounce rate:** aim for <50% on marketing page (current unknown)
- **Mobile bounce:** <60% (typical for BD, but optimize)
- **Lighthouse:** perf > 90, a11y > 95, best-practices > 95
- **Bundle size:** <300KB gzipped main chunk
- **Time-to-interactive:** <2.5s on slow 3G (BD context)
- **Team NPS:** ask 3 team members after 2 weeks of usage

---

**Boss — decisions দিন, আমি execute শুরু করি।**