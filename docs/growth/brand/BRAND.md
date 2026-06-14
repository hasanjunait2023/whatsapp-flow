# What A App — Brand Kit (BRAND.md)

> Single source of visual + verbal truth for **What A App** (built and operated by **Ecomex**).
> This kit *formalizes* the design direction already shipped in `apps/web`. It does not invent a
> new look — it documents, names, and makes reusable what the product UI and landing page already do.
>
> **Companion files in this folder:**
> - `VOICE.md` — bilingual voice & tone, before/after copy, AI-content rules
> - `TOKENS.md` — exact color/type/radius/shadow tokens pulled from the repo (for content + dev agents)
> - `LOGO.md` — logo concept brief, lockups, clear-space, do/don't, generation prompt
> - `SOCIAL-TEMPLATES.md` — post templates per content pillar for the content agent + Postiz
>
> **Grounded in (read these to verify):**
> `apps/web/src/index.css` · `apps/web/tailwind.config.ts` · `apps/web/src/styles/landing.css` ·
> `apps/web/src/config/branding.ts` · `apps/web/DESIGN.md` · `apps/web/DESIGN_SYSTEM.md` ·
> `apps/web/LANDING_DESIGN.md` · `docs/growth/STRATEGY.md`

---

## 0. Naming — get this right everywhere

| Field | Value | Notes |
|---|---|---|
| Product name | **What A App** | Always three words, each capitalized. Never "WhatAApp", "What-a-App", "Whatsapp App". |
| Operator / company | **Ecomex** | The company that builds + runs it. Legal: *What A App by Ecomex*. |
| Offer name (EN) | **The Ecomex Seller Stack** | "Everything between your chat and your customer's door." |
| Offer name (BD) | **দোকান চালু সিস্টেম** *(Dukan Chalu System)* | Use the Bangla first for BD-seller audiences; romanization in parentheses on first use. |
| Wedge | **Ban-proof · Bangla-first · Chat to delivery** | The three-word spine. Reuse verbatim. |
| Internal-only (never shown to sellers) | WAHA / Wasender / provider names | These stay inside the codebase. Public face is always "your own server". |

The existing `Ecomex` wordmark logo (the upward-rising letterforms with a green delivery tick, see
`apps/web/src/assets/logo.png`) is the operator mark. `LOGO.md` defines how the **What A App** product
mark relates to it.

---

## 1. Brand essence

### Mission
Make sure a Bangladeshi e-commerce seller **never loses a sale to a missed message or a Meta ban** —
by running the whole journey *from first message to delivered order* on a system the seller actually owns.

> One sentence (from STRATEGY.md, do not reword in marketing):
> *The only chat-to-delivery system built on the seller's own server — so Bangladeshi e-commerce stores
> never lose a sale to a missed message or a Meta ban.*

### Personality — 5 adjectives
1. **Trustworthy** — like a bank you can feel, not a startup you have to gamble on. (This is why the app world is *warm fintech*, not playful SaaS.)
2. **Resilient / ban-proof** — calm under threat. We're the seller who stays standing when Meta swings.
3. **Bangla-first** — we speak the seller's language, literally and culturally. COD, bKash, Pathao, 2am — our world, not a translated foreign one.
4. **Effortless** — "without touching your phone." The product does the work; the brand feels like relief, not another tool to learn.
5. **Practical / seller-to-seller** — no jargon, no corporate distance. A successful shop-owner showing another how it's done.

These five map directly to the design tokens: warm cream + ink (trust), disciplined single orange accent (resilient focus, not noisy), Hind Siliguri/Noto Serif Bengali (Bangla-first), soft shadows + rounded cards + zero-lag motion (effortless), plain big numbers over decoration (practical).

### The feeling a BD seller should have
- **Relief:** "I can sleep. My shop doesn't stop when I do."
- **Trust:** "My customers and my data are mine — nobody can switch me off."
- **Quiet pride:** "I run a real operation now, not a phone full of unread chats."

The emotional target in one Bangla line (from STRATEGY.md):
**"২৪ ঘণ্টা বিক্রি, একা চালাও, কেউ বন্ধ করতে পারবে না।"**
*(Sell 24 hours, run it alone, no one can shut you down.)*

---

## 2. Two visual worlds (already shipped — this kit names them)

The product deliberately runs **two coherent worlds**. This is intentional and on-brand; the brand kit
formalizes the boundary so neither agents nor designers blur them.

### World A — "Warm Light Fintech" (the APP)
Where: the logged-in product (`apps/web` app shell, `.dark`/`.scheme-*` aside).
Source: `apps/web/src/index.css` (`:root`), `DESIGN.md`, `DESIGN_SYSTEM.md`.

- **Canvas:** cream `#F5F2EC`, ink `#1A1A18`, soft white cards `#FCFAF6`.
- **Accent:** one warm orange `#F0552B` — exactly ONE highlight tile per view, never a rainbow.
- **Shape language:** 20px card radius, 12px control radius, warm diffuse shadows (never pure-black).
- **Feel:** a friendly, rounded, light fintech dashboard. Big tabular numbers. Generous whitespace. App-like, mobile-first, zero-lag.
- **Type:** Inter (Latin/numbers) + Hind Siliguri (dense Bangla UI).

> One-line look (DESIGN.md): *a friendly, rounded, light fintech dashboard with exactly ONE orange highlight tile, big tabular numbers, soft status pills, generous whitespace.*

### World B — "Near-Black Violet Luxury" (the LANDING / acquisition surface)
Where: the marketing landing page, scoped under `.lp`.
Source: `apps/web/src/styles/landing.css`, `LANDING_DESIGN.md`.

- **Canvas:** near-black `#08080c` with a faint violet undertone, surfaces `#111119`.
- **Accent:** violet `#8b5cf6` (primary), with **WhatsApp green `#25D366` used scarcely and meaningfully** (ticks, "it works" moments).
- **Feel:** premium, cinematic, dark luxury — earns trust before the ask. AA-contrast in both its own light/dark sub-themes.
- **Type:** Inter + **Noto Serif Bengali** (editorial Bangla headlines).

**Rule of thumb:** orange = *the product working for you* (warm, operational, daily). Violet = *the promise / the pitch* (premium, aspirational, first impression). Green = *WhatsApp / a thing that succeeded*. Never swap these meanings.

### Social / content creative — which world?
Social posts are an **acquisition surface**, so they default to **World B (dark violet luxury)** as the
primary look, BUT they borrow orange for "the app in action" screenshots and product proof. See
`SOCIAL-TEMPLATES.md` §1 for the exact split per pillar. This keeps feed presence premium and ownable
while product shots stay true to the warm app.

---

## 3. Logo & wordmark (summary — full spec in LOGO.md)

- **Mark concept:** an **upward growth swoosh fused with a chat bubble**, closed by a small **green
  delivery tick** — "chat → growth → delivered, and it never stops." This reads the existing Ecomex
  rising-letterform + green-tick DNA into a single reusable product glyph.
- **App mark today:** orange rounded-square (`rounded-control`, `bg-primary`) holding the glyph —
  exactly as `apps/web/src/components/layout/shell/BrandMark.tsx` already renders it.
- **Lockups:** (1) glyph-in-orange-square + "What A App" wordmark (default), (2) glyph alone (favicon /
  avatar / app icon), (3) stacked (social profile). Clear-space, sizing, do/don't in `LOGO.md`.

---

## 4. Color — summary

Full token table with hex + HSL + oklch + usage + contrast in **`TOKENS.md`**. Headline palette:

| Role | Hex | Where |
|---|---|---|
| App canvas (cream) | `#F5F2EC` | app background |
| Ink | `#1A1A18` | app text |
| **Brand orange** | `#F0552B` | the single app accent / primary CTA |
| Landing base (near-black) | `#08080c` | landing/social dark canvas |
| **Landing violet** | `#8b5cf6` | landing/social accent |
| WhatsApp green | `#25D366` | channel + "it worked" moments |
| Facebook blue | `#1877F2` | channel chip |
| Instagram pink | `#E1306C`-family (`329 70% 52%`) | channel chip |
| Success / Warning / Info / Danger | see TOKENS.md | status pills, both worlds |

**Accessibility note:** both worlds are built to **WCAG AA (4.5:1)** for body text (documented in
`landing.css` header and `DESIGN_SYSTEM.md`). Any new surface must keep AA. Orange `#F0552B` on cream is
for *fills with white text* and large elements — do **not** use orange as small body text on cream
(insufficient contrast); use ink for text, orange for emphasis fills/borders/icons.

**Bangla legibility note:** Bangla script has tall matras and dense conjuncts. On busy gradients or
glassy surfaces it loses legibility fast. Rules: Bangla body always on a solid surface (cream card or
`#111119`), never over a gradient or image without a solid plate; minimum Bangla body size is **16px**
(one step larger than you'd set Latin); line-height **1.6+** for Bangla vs 1.5 for Latin.

---

## 5. Typography — summary

Full scale, weights, and pairing logic in **`TOKENS.md`**. The repo already loads exactly these via
`apps/web/index.html`:

| Surface | Latin | Bangla | Rationale |
|---|---|---|---|
| **App UI** | Inter 400–700 | **Hind Siliguri** 400–600 | Hind Siliguri is compact + high-legibility at UI sizes and dense data — right for inbox/tables/numbers. |
| **Landing / social headlines** | Inter | **Noto Serif Bengali** 400–700 | Noto Serif Bengali gives editorial gravity + premium feel for the dark luxury world; its serif matras photograph well in hero art. |

Pairing strategy: **one Latin family (Inter) across everything** for system coherence; **switch the
Bangla face by world** — UI sans (Hind Siliguri) for work, editorial serif (Noto Serif Bengali) for the
pitch. Numbers are **always tabular lining** (`tabular-nums lining-nums`, already wired in `index.css`)
because COD amounts, order counts, and prices must align.

---

## 6. Voice — summary

Full principles + 8 before/after examples (Bangla + English) + word lists + AI rules in **`VOICE.md`**.
The one-line voice: **warm, practical, seller-to-seller — never corporate, never foreign-translated.**
We talk *like a successful BD shop owner helping another*, in natural code-switched Bangla/English the
way sellers actually type.

---

## 7. How agents should use this kit

| Agent | Reads | Produces |
|---|---|---|
| Content agent | `VOICE.md`, `SOCIAL-TEMPLATES.md`, this file §2 | On-pillar, on-voice bilingual posts |
| SEO agent | `BRAND.md` §0 (naming), `VOICE.md` word lists | Correct product/offer naming + keywords |
| Postiz publisher | `SOCIAL-TEMPLATES.md` (formats, safe areas) | Per-platform exports that respect safe zones |
| Frontend engineer | `TOKENS.md`, `LOGO.md` | UI that matches the shipped token system (do not hardcode hex — use the CSS vars named in TOKENS.md) |

**Hard rule for every agent:** never hardcode a hex value found here into product code. The product is
token-driven (`hsl(var(--...))`). These docs are the *human/agent-readable* truth; the *machine* truth
is the CSS variables in `apps/web/src/index.css` and `landing.css`. If a token needs to change, change
it there and update `TOKENS.md` to match.

---

## 8. Anti-template guardrails — summary

Full rules in `SOCIAL-TEMPLATES.md` §6. Headline: our creative must look like **a confident BD seller's
brand**, not a generic AI/SaaS template. Banned: stock "happy diverse team" photos, generic gradient
blobs, centered-headline + emoji-soup posts, fake countdowns, foreign-office imagery, rainbow accent
spam, Google-Translate Bangla. Required: real BD context (COD slips, Pathao, bKash, a real phone with a
real chat), the single-accent discipline, Bangla that a Dhaka seller would actually send.
