# Deep Audit + Logo Motion — 2026-07-01

## Deep Audit — Issues Found & Fixed

### Issue 1: 301 redirect loop on `/api/auth/*` paths ✅ FIXED

**Symptom:** `curl https://whatapp.ecomex.cloud/api/auth/get-session` returned 301 to itself, infinite loop.

**Root cause (3-layer bug):**
1. **Vercel rewrite** in `apps/web/vercel.json` sends `/api/*` → `https://whatapp.junno.qzz.io/api/$1`
2. **Contabo nginx** had a vhost `whatapp.junno.qzz.io.redirect` that returns `301 https://whatapp.ecomex.cloud$request_uri` for ALL paths (including /api/*)
3. CF Proxied + Vercel reverse-proxy = the 301 from step 2 redirected back to step 1

**Fix:**
- Created new vhost `/etc/nginx/sites-available/whatapp.junno.qzz.io` that **proxies** `/api/*` and `/*` to backend (port 3500) — no more 301
- Removed the redirect symlink `whatapp.junno.qzz.io.redirect`
- Updated nginx to send `Host: 127.0.0.1` to backend (so better-auth's Host check passes against baseURL)
- Updated `.env.production`: `AUTH_TRUSTED_ORIGINS` now includes both `https://whatapp.ecomex.cloud` AND `https://whatapp.junno.qzz.io`

**Verified:**
- `GET https://whatapp.ecomex.cloud/api/auth/get-session` → HTTP 200, body `null` (no session, expected)
- `POST https://whatapp.ecomex.cloud/api/auth/sign-up/email` → HTTP 200 with `Set-Cookie: __Secure-wf.session_token=*** Domain=.ecomex.cloud; Path=/; HttpOnly; Secure; SameSite=Lax`
- Browser signup test → redirected to `/onboarding` with "Welcome to What A App!"

### Issue 2: Cloudflare Bulk Redirect analysis ✅ INVESTIGATED

**Token works** for `/zones` + `/dns_records` + `/rulesets`, but **NOT** for `/zones/:id/bulk_redirects` or `/zones/:id/rules`. Token has `dns:edit` scope only (per Boss's initial message).

**Discovery:** Earlier session's claim of "CF Bulk Redirect deleted" was based on a token that has since expired/rotated. The CURRENT Bulk Redirect rule list is unreachable via API with this token.

**No active redirect rule found in `/rulesets`** — the 301 was not from CF, it was from my Contabo nginx (Issue 1).

### Issue 3: Vercel auto-deploy broken ⚠️ BLOCKED

**Symptom:** Git push to `main` triggered commit `efb1248 → 5ab923a`, but Vercel CDN still serves bundle from `last-modified: 01:42:13` (before my changes at 03:42).

**Root cause:** Either (a) Vercel auto-deploy is disabled in project settings, or (b) the project's GitHub integration is broken. Project ID is `prj_UrSwBHKDFdupa3H3Y2nGD5b6MJLs` (from `/apps/web/.vercel/project.json`).

**Workaround:** No valid Vercel CLI token available in `/root/.bashrc`, env, `~/.hermes`, `~/brain/secrets`. Brain confirms `CLOUDFLARE_API_TOKEN` is 9-char placeholder, and `VERCEL_TOKEN` doesn't appear in vault.

**Boss needed:** Either click "Deploy" in Vercel dashboard OR send a fresh Vercel CLI token.

## Logo Motion Work — Code Complete, Awaiting Deploy

### Files added/modified

**New: `apps/web/src/components/BrandedLogo.tsx`** (4KB)
- Two variants: `theme="dark"` (PNG as-is + violet pulse glow) and `theme="light"` (PNG inside a circular white badge with violet gradient orbit ring + diagonal shine sweep)
- 3 motion layers: `logo-pulse-glow` (3.2s), `logo-orbit-ring` (9s), `logo-orbit-shine` (5.5s)
- All motion killed under `prefers-reduced-motion: reduce`
- Static `static` prop for print/export contexts

**Modified: `apps/web/src/index.css`** (+119 lines)
- 3 new `@keyframes`: `logo-pulse-glow`, `logo-orbit-ring`, `logo-orbit-shine`
- 4 helper classes: `.branded-logo`, `.branded-logo__ring`, `.branded-logo__badge`, `.branded-logo--dark`
- Diagonal shine via `::before` pseudo on the badge
- All animations gated on `prefers-reduced-motion: reduce`

**Modified: `apps/web/src/components/auth/AuthLayout.tsx`**
- Left panel (dark): `<BrandedLogo theme="dark" size="xl" />` (replaces raw AppLogo + brightness/invert filter)
- Top-bar (light, mobile): `<BrandedLogo theme="light" size="md" />` (replaces raw AppLogo)

**Modified: `apps/web/src/components/AppLogo.tsx`**
- Added doc comment clarifying BrandedLogo is the preferred motion version

### Why "dark" vs "light"

- The Ecomex logo PNG has a **dark/black BG with white "ECOMEX AUTOMATION" text**. So:
  - On dark/violet panels → keep PNG as-is (acts like a "white wordmark with its own background")
  - On white/light surfaces → wrap PNG in a circular violet-bordered badge so the brand stays visible
- No fake "white logo" — we use the actual PNG (white text on dark BG) as the effective white-on-dark logo, with motion on both variants

### Verification status

- ✅ Local build succeeds (`pnpm build` → 0 errors, 246KB JS / 80KB gzip)
- ✅ Browser end-to-end signup/login flow now works (curl + browser both confirmed)
- ⚠️ BrandedLogo component bundled into local `dist/assets/AuthLayout-***` and `dist/assets/index-***.css`, but **NOT YET deployed to Vercel CDN**
- ⚠️ Served bundle is from earlier deploy (`AuthLayout-BHijHiPi.js`, last-modified 01:42:13)

### Commits on main branch (in order)

```
5ab923a trigger: force Vercel redeploy
efb1248 feat(brand): add BrandedLogo with motion + dark/light variants
4f27dad fix(vercel): revert rewrite + cookie domain .ecomex.cloud
d5d19e6 trigger: re-deploy with new rootDirectory setting
9f7c9cd refactor(domain): migrate all references
a753fd6 feat(theme): FULL violet migration
52a588e feat(theme): add theme v2 — palette C
```

### Boss action items

1. **Vercel Deploy** → dashboard for project `prj_UrSwBHKDFdupa3H3Y2nGD5b6MJLs` (or wait — if auto-deploy kicks in, we're done)
2. Or send a fresh **Vercel CLI token** so I can deploy via `npx vercel deploy --prod --yes --token ***`
3. Confirm the **BrandedLogo motion** on auth page satisfies the "osoadharon" feel — if it needs tuning, I'll iterate
