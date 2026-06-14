# M1 Foundation — Deploy Runbook (approval-gate backend)

> GATE 2 approved 2026-06-14. The growth backend code is committed at HEAD.
> Migration `apps/server/drizzle/0003_growth_approval_gate.sql` is **additive only**
> (3 CREATE TABLE + 3 CREATE INDEX, no DROP/ALTER/DELETE) — safe on the live DB.

## ⚠️ Pre-flight (do BEFORE restarting apps/server)
The hardening made `TELEGRAM_WEBHOOK_SECRET` a **hard boot requirement in
production**. If it is not set, `apps/server` will refuse to start. Set all env
below FIRST, then deploy.

### Required env (apps/server, prod)
```
# Approval authz — fail-closed. Set at least ONE; both recommended.
FOUNDER_TG_USER_ID=<your numeric Telegram user id>      # who may tap ✅
GROWTH_TELEGRAM_CHAT_ID=<chat id>                        # or reuse OPS_TELEGRAM_CHAT_ID
TELEGRAM_WEBHOOK_SECRET=<random 32+ char>               # now REQUIRED in prod
# Postiz publishing
POSTIZ_URL=https://<your-postiz-host>                    # e.g. https://postiz.yourvps
POSTIZ_API_KEY=<from Postiz Settings → Public API>
```
Find your Telegram user id: message @userinfobot. Confirm `TELEGRAM_BOT_TOKEN` +
the bot webhook (`/api/telegram/webhook`) already point at prod with the secret.

## Deploy steps
1. **Set env** above in the prod environment (VPS compose/.env).
2. **Apply migration** (additive, safe):
   `drizzle/0003_growth_approval_gate.sql` → adds `growth_approvals`, `social_posts`,
   `content_pieces` + status indexes. Apply via your normal migrate path (do NOT
   drop anything).
3. **Deploy apps/server** at HEAD. NOTE: HEAD also contains concurrent ban-safety
   work committed in `6921533` — confirm that stream is intended for this deploy, or
   cut a clean release of just the growth slice if you want them separate.
4. **Boot check**: server starts (it will hard-fail if `TELEGRAM_WEBHOOK_SECRET`
   unset — that's the safety guard working).

## Verify the gate end-to-end
1. In Postiz, connect at least one channel (FB/IG/YouTube/TikTok/LinkedIn).
2. As a platform admin, call: `POST /api/fn/growth-test-approval` (empty body).
   → returns `{ approval_id, social_post_id }` and sends an Approve/Reject card to
   your growth Telegram chat.
3. Tap **✅ Approve** → webhook → `decideApproval` → enqueues `publish_social_post`
   → scheduler's 5s queue tick runs it → card edits to confirmation; row goes
   `executing → executed` (or `failed` if Postiz endpoints need confirming).
4. Tap a second time → no-op (idempotent). Tap from a non-founder id/chat → rejected.

## Confirm before first REAL publish
The exact Postiz endpoint shapes (`/public/v1/integrations` vs `/channels`, post body)
are isolated in `apps/server/src/services/postiz/client.ts` with a comment. Re-confirm
against your running Postiz instance; if different, it's a one-file fix.

## Rollback
Code: redeploy prior image. DB: the 3 new tables are unused by existing features —
leaving them is harmless; drop only if you must (`DROP TABLE growth_approvals,
social_posts, content_pieces;`).
