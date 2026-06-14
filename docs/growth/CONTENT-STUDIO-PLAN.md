# Content Studio — Bengali-first content + in-house video engine — PLAN

> Focus sprint (founder directive): content creation, organic growth, content
> strategy, social posting. Bengali-first. In-house video (no dependence on paid
> video tools): UGC + avatar + motion graphics + kinetic Bangla text + b-roll.
> Autonomous daily generation. Auto-upload to social. All gated before publish.

## Vision (founder's words, structured)
- **Bengali-first** — connect the BD audience early; posters + videos + all formats in Bangla.
- **In-house video** so we don't depend on external video tools:
  - **Remotion** (React programmatic video) — motion graphics, kinetic Bangla typography, b-roll/b-frame composition, branding overlays, edit/assemble. Full control, zero per-video tool cost, repeatable templates.
  - **Gemini/Veo via a browser agent** driving the founder's Chrome profile "ami junait" → generate AI video clips (avatar + scenes) per Gemini's prompting policy → download → feed into Remotion or post directly.
  - **Avatar videos** — founder's avatar + others, composited with motion graphics + Bangla captions.
- **Auto-upload to social** (Postiz, already built) with everything tuned for reach + engagement.
- **Autonomous daily generation** — fresh Bengali posts + video scripts every day from strategy.

## Components & tooling (build order)
1. **Bengali content strategy + hooks bank** (deepen STRATEGY/VOICE) — pillars, series, per-platform cadence, a large Bangla hooks bank, engagement/distribution playbook (organic Core Four). [skill + doc]
2. **`ugc-video-bengali` skill** — the UGC production playbook: hook in 2s, BD-authentic UGC style, avatar talking-head patterns, kinetic-caption rules, formats per platform (Reels/TikTok/Shorts/FB), pacing, CTA, retention tactics, Bangla caption styling. The "how to make a video that performs."
3. **`remotion-video` skill + Remotion project scaffold** (in repo) — programmatic video: Bangla kinetic-text templates, motion-graphic intro/outro, caption burner, b-roll compositor, brand overlays. Renders MP4. This is the in-house engine (no tool dependency). [skill + code]
4. **Autonomous Bengali content engine** (backend) — upgrade the M2 draft tick from "replay fixed calendar" to LLM-generate fresh Bengali posts + video scripts daily from the strategy + hooks bank + seasonal/trending angles. Each draft → approval → Postiz. [backend]
5. **Creative/poster generation** — on-brand Bangla post graphics (templates + AI images) per SOCIAL-TEMPLATES, attached to drafts.
6. **Gemini Video browser agent** (`gemini-video-agent` skill) — drives the founder's main
   "ami junait" Chrome profile → **gemini.google.com/app → Video tool** (9:16 social ratio,
   @amijunait avatar). Each gen ≈ **10s**, so **2 clips per content piece** → **download both**
   → **stitch** (Remotion/ffmpeg) → **Telegram approval ✅** → **Postiz publish/schedule**.
   Runs LOCALLY on the founder's Windows machine. Risk accepted by founder (main profile).
7. **Auto-upload** — stitched video/poster → approval gate → Postiz video post (publish OR
   schedule); engagement-tuned Bangla caption/hashtags/timing.

## Locked decisions (2026-06-14)
- Bengali-first; autonomous daily generation, forever.
- Video source = Gemini app Video tool (NOT Veo API), main "ami junait" profile, @amijunait avatar.
- 10s/clip → 2 clips/content → stitch → Telegram approval → Postiz publish/schedule.
- Avatar already exists (@amijunait, invoked in-chat). Start non-avatar Remotion videos in parallel.
- Skills authored: `ugc-video-bengali`, `remotion-video`, `gemini-video-agent`.

## ⚠️ Risk flag — the Chrome/Gemini browser agent
Automating a **logged-in Google account** via the browser violates Google's automation ToS and can get the account **flagged, rate-limited, or banned**. Doing it on your **personal "ami junait" identity** risks your real Google account. This is ironic against our own "ban-proof" brand promise — so I will NOT wire it to your main account without explicit sign-off.
- **Also**: driving your actual Chrome profile requires running browser automation on YOUR Windows machine (your Chrome, your session) — it can't run from this cloud session against your personal browser. It's a local, supervised capability.
- **Veo/Gemini video** also has access tiers + content policy; outputs must follow Gemini's prompting policy (no disallowed content, watermark/SynthID present).
- **Recommended safer pattern**: a **dedicated Chrome profile + a secondary Google account** for automation (isolates risk from your main identity), or use **official API video generation** (Veo via Google API / fal.ai etc.) instead of browser-driving — no account-ban risk, scriptable, but has API cost.

## What's safe to build NOW (zero account risk, high value)
1, 2, 3, 4, 5 above — Bengali strategy + UGC skill + Remotion engine + autonomous Bengali generation + posters. This gives a real, in-house, Bangla video+content capability immediately. The Gemini-browser agent (6) is gated on your risk decision and needs your local machine.

## Gating
All content (posts, posters, videos) → draft → founder ✅ on Telegram → Postiz publish. Nothing posts autonomously without approval (your standing rule). Video gen via Gemini follows Gemini content policy.

## Dependencies / founder actions
- Decision on the Chrome/Gemini browser-automation approach + account (see risk).
- Avatar source assets (a short clip + photos of you) for avatar videos.
- Postiz deploy + channel connect (from M1) to actually publish.
- Optional: official video-gen API key (Veo/fal) if we avoid browser automation.
