# What A App — Gap-Only Refinement Plan
**Date:** 2026-07-01
**Boss directive:** Apply global theme across superadmin + tenant + auth + landing pages. **Marketing page CONTENT untouched** — no copy changes, no placeholder→real-image replacements, no testimonial rewrites. Only **gap-fill** what is missing/broken.

---

## 🎯 REAL GAPS FOUND (verified via live browser + code inspection)

### CRITICAL — Auth layer broken (root cause for many secondary gaps)

**GAP #1 — Login completely broken in production**
- `apps/web/src/hooks/useAuth.tsx` line 143 calls `supabase.auth.signInWithPassword(...)` 
- But backend uses **better-auth** (`/api/auth/sign-in/email`), NOT Supabase auth
- Result: form submission fails silently → user clicks Sign In → nothing happens → no toast → user stuck
- Verified: `POST /api/auth/sign-in/email` returns `{token, user}` directly, but `useAuth` doesn't call it

**GAP #2 — `useAuth` hook entirely Supabase-based**
- 8 instances of `supabase.auth.*` in `useAuth.tsx` (lines 37, 55, 87, 108, 125, 143, 154)
- All session management, sign-in, sign-up, sign-out — all wired to wrong auth system
- This cascades to: ProtectedRoute, RootRedirect, dashboard, admin — all redirect to login because `useAuth` says no user

**GAP #3 — Missing `/auth/forgot-password` route**
- Login page links "Forgot password?" → `navigate('/auth/forgot-password')` → 404 page
- `App.tsx` only has routes for `/auth/login`, `/auth/signup`, `/invite/:token` — no reset password

**GAP #4 — Missing `/login` route alias**
- Console error: `User attempted to access non-existent route: /login`
- Some component (footer? CTA?) links to `/login` — but only `/auth/login` exists
- Need redirect alias `/login` → `/auth/login`

**GAP #5 — Demo request fails silently with "Failed to fetch"**
- `Demo request error: TypeError: Failed to fetch` (verified via browser console)
- Demo form submission hits backend but CORS or API mismatch → user sees nothing

---

### HIGH — Mobile + dashboard layout gaps

**GAP #6 — Inconsistent auth/toast behavior on login failure**
- When login fails (e.g. wrong password), no toast appears (because supabase.auth fails before toast can render)
- Boss's first impression of the product is broken — `Try Demo` form does nothing

**GAP #7 — Theme switcher exists but theme isn't propagated to landing**
- Navbar has `Switch to dark theme` button but landing page is scoped under `.lp` (separate theme system via `data-theme`)
- Two parallel theme systems (app `.dark` + landing `.lp[data-theme]`) not synced

**GAP #8 — No reduced-motion guard at app shell level**
- `index.css` has the guard inside `@layer utilities` — only kicks in when utilities are present
- App shell components (sidebar, dashboard chrome) might have CSS animations without guard

**GAP #9 — No density toggle exists**
- Current `font-size: 15px` hardcoded in `index.css`
- Long-term team members can't switch to compact/spacious density

**GAP #10 — Command palette (Cmd+K) doesn't exist**
- 75 pages, no global search/jump-to-page
- Team members can't navigate efficiently

---

### MEDIUM — Polish gaps (not blocking, but visible)

**GAP #11 — Footer "Legal" links show placeholder text**
- `[Registered address, Dhaka, Bangladesh]` and `[Trade licence / BIN: ____]` — actual data missing (this IS content, but it's a single field, not a page redesign — Boss can fill)

**GAP #12 — bKash/Nagad logos in footer are text-only**
- Acceptable, but real logos would look more premium (NOT a content rewrite — small SVG addition)

**GAP #13 — Tenant dashboard sidebar (MobileBottomNav.tsx) — not verified for long-term team use**
- 160 lines, includes bottom-nav for mobile. Need to check:
  - 44px touch targets? ✓ likely yes
  - Safe-area inset for notched devices?
  - Active state visible in both light + dark?

**GAP #14 — Admin dashboard sidebar (AdminLayout.tsx) — not verified**
- 259 lines, includes sidebar. Need same checks as #13

---

### LOW — Nice-to-have (defer unless Boss asks)

**GAP #15 — Marketing page SHOT_* placeholders (HERO_SHOT, SHOT_INBOX, etc.)**
- These ARE content gaps — Boss said NOT to fix these

**GAP #16 — Marketing page stats show X,000+ / XM+ / X hrs**
- Same — content gap, defer

**GAP #17 — Testimonials show [Customer name] placeholders**
- Same — content gap, defer

---

## 📋 PLAN — 4 PHASES, GAP-FILL ONLY

### **PHASE 1 — Fix auth (CRITICAL, BLOCKING) [4-6 hours]**

- [ ] **GAP #1 + #2:** Rewrite `useAuth.tsx` to use better-auth API endpoints
  - `signIn` → `POST /api/auth/sign-in/email`
  - `signUp` → `POST /api/auth/sign-up/email`
  - `signOut` → `POST /api/auth/sign-out`
  - `getSession` → `GET /api/auth/get-session`
  - Use `credentials: 'include'` for cookie-based auth
  - Verify: `agent-browser` can sign in with test user, redirect to /dashboard, see dashboard content
- [ ] **GAP #3:** Add `<Route path="/auth/forgot-password" element={<ForgotPassword />} />` to `App.tsx`
  - Create `apps/web/src/pages/auth/ForgotPassword.tsx` (basic form: email → submit → toast)
- [ ] **GAP #4:** Add redirect alias `<Route path="/login" element={<Navigate to="/auth/login" replace />} />`
- [ ] **GAP #5:** Fix demo request — likely needs CORS fix OR API URL fix in `try-demo` form
  - Verify endpoint: find where demo request hits, check env var `VITE_API_URL`
- [ ] **GAP #6:** Test full login flow end-to-end with agent-browser
  - Submit wrong password → see error toast
  - Submit correct password → redirect to /dashboard
  - Sign out → back to /auth/login

**Verification:** `agent-browser` login → see Dashboard.tsx render → navigate to Inbox/Contacts/Orders → all work

---

### **PHASE 2 — Apply theme globally (no content changes) [6-8 hours]**

- [ ] **Apply Palette C** (Violet + Amber) as default via `data-palette="C"` on `<html>` in `index.html`
- [ ] **Import theme.css** in `src/main.tsx` after Tailwind directives
- [ ] **Replace `tailwind.config.ts`** with `tailwind.config.theme-v2.ts` (already written)
- [ ] **Verify theme variables propagate** to dashboard layout shell (`DashboardLayout.tsx`)
- [ ] **Verify theme variables propagate** to admin layout shell (`AdminLayout.tsx`)
- [ ] **Verify theme variables propagate** to auth layout shell (`AuthLayout.tsx`)
- [ ] **Apply `.glass-3d`** to:
  - Dashboard sidebar (currently opaque — should be frosted)
  - Admin sidebar
  - Auth left panel (currently uses AuthLayout's existing styling)
- [ ] **Apply `.btn-cta`** to all primary CTAs (Dashboard "Create Order", Admin "Add Tenant", Auth "Sign In")
- [ ] **Add `prefers-reduced-motion` guard** at app shell level (already in theme.css, verify it cascades)

**Verification:** All 75 pages render with Palette C + glass-3d + amber CTAs. Take screenshots of 10 representative pages (Dashboard, Inbox, Contacts, Admin Dashboard, Admin Tenants, Login, Signup, Landing, etc.)

---

### **PHASE 3 — Mobile perfection + team comfort [6-8 hours]**

- [ ] **GAP #8:** Add reduced-motion guard at app shell level (not just utilities)
- [ ] **GAP #9:** Build density toggle
  - `apps/web/src/hooks/useDensity.ts` — reads `localStorage('density')`, applies `data-density` to `<html>`
  - Add UI: dropdown in DashboardLayout topbar (Compact / Default / Spacious)
- [ ] **GAP #10:** Build command palette (Cmd+K)
  - `apps/web/src/hooks/useCommandPalette.ts` — global keyboard listener
  - `apps/web/src/components/CommandPalette.tsx` — modal with fuzzy search across all 75 routes
  - Trigger: Cmd+K (Mac) / Ctrl+K (Win/Linux) — show recent pages + jump to any
- [ ] **Mobile sticky CTA bar:** Already designed in theme.css, add to landing page (mobile only)
- [ ] **Verify safe-area insets:** Walk through DashboardLayout, AdminLayout, AuthLayout — ensure `safe-top`/`safe-bottom` on sticky chrome
- [ ] **Verify 44px touch targets:** All buttons/links in MobileBottomNav + AdminLayout sidebar

**Verification:** 
- Mobile (iPhone 14 viewport via agent-browser) — all sticky chrome respects safe-area
- Cmd+K opens palette, type "inbox" → jump to Inbox page
- Density toggle persists across page navigations
- `prefers-reduced-motion` honored

---

### **PHASE 4 — Final polish + verification [4-6 hours]**

- [ ] **GAP #11:** Fill footer placeholders with real address (single text replacement, not redesign)
- [ ] **GAP #12:** Add bKash + Nagad logo SVGs to footer (drop in `/public/brands/`)
- [ ] **Visual regression:** Take screenshots of all 75 pages BEFORE any Phase 1-3 changes (baseline)
- [ ] **Visual regression:** Take screenshots AFTER — diff against baseline, verify no unintended changes
- [ ] **Build verification:** `pnpm build` passes
- [ ] **Deploy verification:** Vercel auto-deploys, all routes return 200
- [ ] **End-to-end verification:** agent-browser walks through 10 critical user journeys:
  1. Sign up → verify email → log in
  2. Dashboard → view stats
  3. Inbox → open conversation → send reply
  4. Contacts → add new contact
  5. Orders → create new order
  6. Admin login → view tenant list → impersonate tenant
  7. Settings → change theme → dark mode → light mode
  8. Logout → return to login
  9. Cmd+K → search "contacts" → jump
  10. Density toggle → compact → spacious → reset

---

## ⏱️ TIME ESTIMATE

| Phase | Hours | Risk |
|---|---|---|
| Phase 1 — Auth fix | 4-6h | High (touches core auth flow) |
| Phase 2 — Theme global | 6-8h | Medium (many touch points) |
| Phase 3 — Mobile + comfort | 6-8h | Low (additive) |
| Phase 4 — Polish + verify | 4-6h | Low |
| **TOTAL** | **20-28h** | |

---

## 🎯 SUCCESS METRICS

- [ ] Login works end-to-end (verified via agent-browser)
- [ ] All 75 pages render with Palette C
- [ ] Glass-3d on all major chrome (sidebar, topbar, auth hero, modals)
- [ ] Amber CTAs on all primary actions
- [ ] Cmd+K opens command palette
- [ ] Density toggle persists
- [ ] Mobile (375px viewport): all sticky chrome respects safe-area
- [ ] `prefers-reduced-motion`: honored globally
- [ ] Marketing page content: UNCHANGED (verified by visual diff)
- [ ] Build passes, Vercel deploys

---

## ❓ BOSS DECISIONS NEEDED

1. **Phase 1 priority:** Fix auth first (breaks everything else) OR skip Phase 1 and apply theme to visible pages only?
   - **My rec:** Phase 1 first — without login, can't verify tenant/admin dashboards look right
2. **Palette:** Confirmed C (Violet + Amber)?
3. **Density toggle default:** Default / Compact / Spacious?
4. **Command palette:** Cmd+K (Mac) / Ctrl+K (Win/Linux) — both correct mappings?
5. **Footer logo SVGs:** Drop in real bKash/Nagad logos OR keep text-only for now?

---

**Default if Boss says "go":** Phase 1 first → Phase 2 → Phase 3 → Phase 4. Palette C. Default density. Cmd+K (both). Real logos (small effort).

**Marketing page content: NOT touched. Verified by visual diff at end.**