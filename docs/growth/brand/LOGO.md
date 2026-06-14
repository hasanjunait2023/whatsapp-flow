# What A App — Logo & Wordmark (LOGO.md)

> Concept brief + spec for the **What A App** product mark, and how it relates to the existing
> **Ecomex** operator wordmark (`apps/web/src/assets/logo.png`). The app shell already renders the
> product mark as an orange rounded-square holding a glyph — see
> `apps/web/src/components/layout/shell/BrandMark.tsx`. This file formalizes the concept, lockups,
> spacing, and rules, and gives a generation prompt for producing a real asset.

---

## 1. Concept brief — what the mark must evoke

**Core idea:** *chat → growth → delivered, and it never stops.*

Three meanings fuse into one reduced glyph:

1. **Chat-to-door (the product):** a **chat bubble** whose tail resolves into an **upward swoosh /
   arrow** — the message rising into a delivered order. This is the whole product in one shape:
   first message → growth → delivery.
2. **Always-on / ban-proof (the promise):** the swoosh closes back on itself or stands on a solid base
   — a continuous, unbroken line reads as "doesn't stop, can't be switched off." No gaps, no fragility.
3. **It worked (the proof):** a small **delivery tick** in WhatsApp green `#25D366` resolves the mark —
   the same green-tick DNA already in the Ecomex logo. The tick is the "order delivered" payoff.

**Inheritance from the existing Ecomex mark:** the current logo already encodes *rising letterforms +
an upward motion + a green accent*. The product glyph is the **reduction** of that idea into a single
icon that survives at 16px (favicon, channel avatar, app icon) where the full wordmark can't.

**What it should feel like:** trustworthy and modern — a fintech/operator mark, not a cute chat app.
Confident geometry, one accent, BD-grounded (this is a tool a serious shop owner runs their livelihood
on). It should look at home both in the warm-orange app square and on the near-black violet landing.

**What it must avoid:** a generic speech-bubble icon; a literal WhatsApp clone; a swoosh-with-no-meaning;
gradients-as-crutch; clipart delivery trucks; an over-detailed crest. Reduction over decoration.

---

## 2. The glyph — construction

- Built on a **square grid** to sit cleanly inside the orange `rounded-control` (12px radius) container.
- A **chat bubble** silhouette whose lower tail extends into an **upward diagonal swoosh** (≈30–40°),
  terminating at top-right.
- The swoosh's end carries a short **checkmark / tick** rendered in green — the only place green appears
  in the mark.
- Optical balance: the bubble sits lower-left, the swoosh rises to upper-right, the tick caps it. Leave
  the geometric center slightly low-left so the upward motion reads.
- Stroke weight: medium-bold, single weight, rounded joins (matches the rounded UI language). No thin
  hairlines that vanish at small sizes.

---

## 3. Color treatments

| Context | Glyph fill | Container | Tick |
|---|---|---|---|
| **App (default)** | white glyph | orange `#F0552B` rounded-square | green `#25D366` |
| App on dark / night-shift | white glyph | orange `#FB7B57` square | green `#34d399` |
| Landing / social (dark) | white or `--lp-text` glyph | transparent or `#111119` square | green `#25D366` |
| Monochrome (1-color print, fax, stamp) | ink `#1A1A18` glyph, no green | none/transparent | ink (tick implied by shape) |
| Reversed (on photo/dark) | white glyph | none; add subtle plate if contrast <4.5:1 | green stays |

Rules:
- The container square is **orange in the app world, optional/neutral in the landing world**. Don't put
  an orange square on the violet landing — there the glyph stands alone or on a `#111119` surface.
- Green appears **only** as the tick. Never recolor the whole glyph green (that makes it a WhatsApp
  clone and breaks the "we're bigger than one channel" positioning).

---

## 4. Lockups

1. **Primary (horizontal):** `[orange square + glyph]  ·gap·  "What A App"` wordmark in
   `#1A1A18`, Inter 600. This is exactly what `BrandMark.tsx` renders (`gap-2.5`, `text-[15px]
   font-semibold`). Optional `suffix` (e.g. "Admin") in `--muted-foreground`.
2. **Icon-only:** the orange-square glyph alone — favicon, app icon, channel avatar, social profile
   picture, loading states.
3. **Stacked:** glyph centered above the wordmark — square social avatars, splash screens, print.
4. **Co-brand (rare):** "What A App" + "by Ecomex" — the Ecomex wordmark sits smaller, beneath or
   trailing, in muted ink. Use on legal/footer/about, not in primary UI.

Default everywhere is the **primary horizontal** lockup. Drop to **icon-only** below ~120px wide or when
space is tight (the wordmark already hides under `sm:` in `BrandMark.tsx`).

---

## 5. Clear-space & sizing

- **Clear-space:** keep empty space equal to the **height of the glyph square (`x`)** on all four
  sides of any lockup. Nothing (text, edges, other logos) intrudes into that margin.
- **Minimum sizes:**
  - Icon-only glyph: **20px** (app rail uses h-5/w-5 glyph in a 32px square — keep that ratio).
  - Primary horizontal lockup: **min 96px wide**; below that, switch to icon-only.
- **Container ratio:** glyph occupies ~62% of the square's width (the app uses a 20px glyph in a 32px
  square). Keep that breathing room — don't fill the square edge-to-edge.

---

## 6. Do / Don't

**Do**
- Use the orange square in-app, the bare glyph on dark landing/social.
- Keep the green tick as the single green moment.
- Maintain `x` clear-space and the 62% glyph-in-square ratio.
- Use Inter 600 for the wordmark; keep "What A App" as three capitalized words.
- Recolor to mono-ink for single-color print/stamp/embroidery.

**Don't**
- ❌ Don't recolor the whole glyph green or make it look like the WhatsApp logo.
- ❌ Don't put the orange square on the violet landing background.
- ❌ Don't add gradients, drop shadows, or bevels to the glyph itself (the square may carry app
  elevation, the glyph stays flat).
- ❌ Don't stretch, skew, rotate, or outline the wordmark.
- ❌ Don't set the wordmark in any face other than Inter; don't lowercase or run the words together.
- ❌ Don't place the mark on a busy photo without a solid plate (fails contrast + looks cheap).
- ❌ Don't pair the mark with a second accent color — orange OR violet per world, plus the green tick.

---

## 7. Asset generation prompt (use with an image/vector tool when available)

> A flat, geometric **vector app icon**: a rounded-square tile in warm orange `#F0552B`, 12px corner
> radius, containing a single white glyph that fuses a **chat bubble** with an **upward growth swoosh**
> rising to the top-right, capped by a small **checkmark tick in WhatsApp green `#25D366`**. Single
> stroke weight, rounded joins, no gradients, no bevels, no drop shadow on the glyph. Centered slightly
> low-left so the upward motion reads. Premium fintech feel, ownable, scalable to 16px. Also produce:
> (a) the bare white-glyph version on transparent for dark backgrounds, (b) a monochrome ink `#1A1A18`
> version, (c) the horizontal lockup with the wordmark "What A App" set in Inter Semibold, ink
> `#1A1A18`, with the green tick intact. Clean, minimal, no extra ornament.

Deliver as SVG (master), plus PNG @ 16/32/48/180/512px and a 1024px social avatar. Drop the master into
`apps/web/src/assets/` and update `BrandMark.tsx`'s `logoImage` import if the glyph changes.

---

## 8. Relationship to the existing asset

`apps/web/src/assets/logo.png` is the **Ecomex operator wordmark** (rising letterforms + green tick).
It stays as the company mark for footers, about/legal, and the orange-square's inner glyph today.
When the dedicated **What A App** glyph (§1–3) is produced, it replaces the inner image in
`BrandMark.tsx`; the Ecomex wordmark remains for the "by Ecomex" co-brand lockup. The two are
deliberately related (shared upward-motion + green-tick DNA), so the transition reads as evolution,
not a rebrand.
