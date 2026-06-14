# What A App — Social / Content Creative Templates (SOCIAL-TEMPLATES.md)

> Post-template specs per content pillar, format safe areas, and anti-template guardrails. Built so the
> **content agent + Postiz publisher** can produce on-brand creative without a designer in the loop.
> Colors/type reference `TOKENS.md`; voice references `VOICE.md`; worlds reference `BRAND.md` §2.
> Pillars come from `docs/growth/STRATEGY.md` §4: **Survival Guide · Order Operations · Behind the Store · AI in Bangla**.

---

## 1. Default look per pillar

Social is an acquisition surface → **default to World B (near-black violet luxury)** for graphic posts,
borrow **World A (warm orange)** for in-app/product screenshots and proof.

| Pillar | Base world | Accent | When orange appears | Bangla face |
|---|---|---|---|---|
| **BD Seller Survival Guide** | World B dark | violet `#8b5cf6` | only inside a product screenshot | Noto Serif Bengali (headline), Hind Siliguri (UI shots) |
| **Order Operations** | World B dark, OR clean cream (World A) for "the app doing it" | violet OR orange | when showing the app booking/auto-reply | Noto Serif Bengali / Hind Siliguri |
| **Behind the Store** (seller stories) | photo-led + dark plate | green `#25D366` for "it worked" | rarely | Noto Serif Bengali |
| **AI in Bangla** (education) | World B dark | violet | screenshot of AI reply | Noto Serif Bengali (headline), Hind Siliguri (chat bubble) |

Green is always scarce + meaningful (a delivered tick, a "saved ৳X", an "order confirmed"). Never two
accents fighting in one post.

---

## 2. Universal layout grid (all formats)

Every post is built on a 3-zone vertical grid:

```
┌─────────────────────────────┐
│  TOP STRIP  ── logo + pillar tag        │  ← brand anchor zone
│                                          │
│  HEADLINE / HOOK            (1 idea)     │  ← the one message
│  optional sub / number                   │
│                                          │
│  PROOF / VISUAL  (screenshot, photo,     │  ← evidence zone
│                   stat tile, chat bubble)│
│                                          │
│  BOTTOM STRIP ── CTA + handle            │  ← action zone
└─────────────────────────────┘
```

- **Logo:** top-left, **icon-only glyph** (white on dark / orange-square on light), `x` clear-space per `LOGO.md` §5. Never centered, never huge.
- **Pillar tag:** small pill, top-right, in `--lp-text-dim` text on a faint surface — e.g. `Survival Guide` / `সারভাইভাল গাইড`.
- **Headline:** one idea only. Noto Serif Bengali for BN, Inter 700 for EN. Left-aligned, not centered.
- **Number/stat:** if used, tabular-lining, large, violet or orange.
- **CTA:** bottom strip, short (`VOICE.md` style) + `@handle` + soft "link in comments" per STRATEGY.md distribution rule (value in post, link in comments).
- **Accent rule:** one accent color per post + optional green tick. No gradient blobs.

---

## 3. Per-pillar templates

### 3.1 BD Seller Survival Guide — "teach, don't pitch"
- **Goal:** existential-fear trust (FB ban, COD leakage). No product pitch in the post body.
- **Layout:** dark World B. Headline = the threat or the fix, in BN Serif. Body = a 3-step checklist or
  a single "do this" tip. Visual = a clean checklist card or a simple diagram (not a screenshot).
- **Accent:** violet for emphasis, danger red `--lp-danger #f87171` for the "what kills your sales" moment.
- **Copy:** see `VOICE.md` #3/#4 (ban angle). CTA soft: "Full survival checklist 👉 link in comments."
- **Example hook (BN):** **"পেজ ব্যান হলে আপনার কাস্টমার লিস্ট কোথায় যায়? কোথাও না — যদি ডেটা আপনার সার্ভারে থাকে।"**

### 3.2 Order Operations — "watch the machine work"
- **Goal:** show the chat→order→delivery flow concretely.
- **Layout:** can flip to **World A cream** to show the app actually booking Pathao / building an order /
  sending bKash link. Headline EN/BN, then a real (anonymized) app screenshot inside a phone or card frame
  (`rounded-card 20px`, `--elevation-2`).
- **Accent:** orange (it's the app working). One green "Order confirmed ✓" tick.
- **Stat tile:** reuse the app's **single orange highlight tile** pattern — big tabular number
  ("৳1,499 saved / mo") on `--card`, orange label.
- **Example hook (EN):** **"Customer says 'nibo' → order built → Pathao booked → you did nothing."**

### 3.3 Behind the Store — "real seller, real words"
- **Goal:** social proof, human warmth, BD-authentic.
- **Layout:** **photo-led** — a real BD seller / shop / packing table / COD slips, with a dark gradient
  plate at the bottom for the quote. Quote in BN Serif, seller's own phrasing. Small green "verified
  seller" or "delivered" cue.
- **Accent:** green for the success cue; otherwise let the photo carry it. Minimal chrome.
- **Copy:** the seller's actual line, lightly cleaned. Never put corporate words in a seller's mouth.
- **Example:** photo of a packing table + quote: **"আগে রাতে ঘুমাতে পারতাম না, অর্ডার মিস হবে ভয়ে। এখন ঘুমাই।"**

### 3.4 AI in Bangla — "it replies like a real shopkeeper"
- **Goal:** educate + prove the AI speaks natural Bangla.
- **Layout:** dark World B. Visual = a **chat-bubble mock**: customer message (left, muted bubble) +
  AI reply (right, violet or WhatsApp-green bubble) — Bangla in Hind Siliguri inside bubbles (UI face),
  headline above in Noto Serif Bengali.
- **Accent:** violet for the AI bubble; green only if showing a real WhatsApp tick.
- **Copy:** show the *quality* of the Bangla reply (natural, code-switched) — that IS the proof.
- **Example hook (BN):** **"কাস্টমার লিখল 'দাম কত?' — AI বাংলায় উত্তর দিল, একদম দোকানদারের মতো।"**

---

## 4. Format specs & safe areas (for Postiz exports)

Postiz publishes to FB / IG / YouTube / TikTok. Build the **master at the largest needed size**, keep
all critical content (logo, headline, CTA, faces) inside the **safe zone**, then export crops.

| Format | Canvas px | Aspect | Critical-safe zone | Notes |
|---|---|---|---|---|
| IG / FB feed (square) | 1080×1080 | 1:1 | keep content within central 1000×1000 | default master for static posts |
| IG / FB portrait | 1080×1350 | 4:5 | top/bottom 120px = chrome-risk; keep text out | best feed reach |
| Story / Reel / TikTok | 1080×1920 | 9:16 | **top 250px** (profile/caption) + **bottom 420px** (UI/CTA buttons) reserved — keep headline & logo in the central 1080×1250 band | TikTok/IG/Reels UI eats edges |
| YouTube thumbnail | 1280×720 | 16:9 | keep text in left 60% (timestamp + duration cover bottom-right) | bold short headline, one face/object |
| FB link/share image | 1200×630 | 1.91:1 | center 1080×566 | OG image |

**Universal safe-area rules**
- Logo glyph: top-left, never closer than 64px (on 1080 canvas) to any edge.
- Never put the headline or CTA in the bottom 420px of a 9:16 (TikTok/IG buttons cover it).
- Min text size on any export: **EN 40px / BN 48px** at 1080 width (Bangla needs the extra size, per `TOKENS.md`).
- Bangla always on a solid plate, never on the raw photo/gradient.

---

## 5. Content-agent build recipe (per post)

1. Pick pillar → pull base world + accent from §1.
2. Write hook + CTA via `VOICE.md` (run the §6 self-check). One concrete BD detail required.
3. Place on the §2 grid; choose the §3 pillar layout.
4. Apply `TOKENS.md` colors/type for that world; one accent + optional green tick only.
5. Export the §4 sizes Postiz needs; verify nothing critical sits in a reserved safe zone.
6. Caption: value in the post, **link in the first comment** (STRATEGY.md distribution).

---

## 6. Anti-template guardrails — keep it intentional + BD-authentic

### What makes our creative look generic / AI-slop (banned)
- ❌ Stock "happy diverse team in a bright office" photos. We are BD sellers, packing tables, COD slips, real phones.
- ❌ Centered headline + gradient blob + 3 floating emojis. (The default "AI SaaS post" — instant trust-killer here.)
- ❌ Rainbow of accent colors. One accent per post, period.
- ❌ Fake countdowns / "🔥 LIMITED 🔥" / "GUARANTEED 10X". Honest scarcity only (`VOICE.md` §3).
- ❌ Google-Translate Bangla, or stiff textbook Bangla no seller speaks.
- ❌ Generic 3D/glassy blobs with no meaning, lens-flare, "futuristic AI brain" imagery.
- ❌ Western CRM screenshots / dashboards-by-numbers that aren't our actual app.
- ❌ Logo centered and oversized, or floating with no clear-space.
- ❌ Walls of feature bullets. One idea per post.

### What keeps it intentional + ours (required — hit ≥4 per post)
1. **One idea, one accent** — disciplined like the app's single-orange-tile rule.
2. **Real BD context** — taka amounts, ২টা রাত, Pathao/RedX/bKash/Nagad, COD, a real chat.
3. **Native Bangla** that a Dhaka seller would actually send (`VOICE.md` §6).
4. **Relief/feeling first** in the hook, mechanism second.
5. **Hierarchy via scale** — one big headline number/word, everything else quiet.
6. **The brand glyph + green tick** used correctly (`LOGO.md`), never as decoration.
7. **Editorial left-alignment** + generous negative space (World B luxury rhythm), not crammed.
8. **Proof over claim** — a real screenshot/photo beats an adjective.

### One-line gut check before publishing
> "Would this stop a BD seller mid-scroll and feel like it came from someone who *runs a shop* — not a
> foreign software company?" If no, it's slop. Rebuild.
