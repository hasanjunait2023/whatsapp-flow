# Meta App Review — Submission Package (EcomeX Client / What A App)

Goal: move the Meta app from **Dev mode** to **Live** with **Advanced Access** on the
Page-messaging permissions, so that **any tenant** (not just admin/test users) can
connect their own Facebook Page through one shared app — no per-client developer setup.

This is the ONLY remaining gate. Code + integration are done and proven end-to-end
(demo tenant connected page `Fx Junait Saheb` 967382099783298 on 2026-06-14).

---

## 0. Prerequisites built for this submission (deployed)

| Requirement | URL | Status |
|---|---|---|
| Privacy Policy (public, mentions Meta data) | https://whatapp.ecomex.cloud/privacy | built |
| Terms of Service (public) | https://whatapp.ecomex.cloud/terms | built |
| Data Deletion Request **Callback** (signed POST) | https://whatapp.ecomex.cloud/api/fb/data-deletion | built |
| Data Deletion **Instructions / status** page | https://whatapp.ecomex.cloud/data-deletion | built |
| Webhook (verify handshake + HMAC) | https://whatapp.ecomex.cloud/api/webhooks/fb | live |
| Valid OAuth redirect URI | https://whatapp.ecomex.cloud/api/fb/oauth/callback | whitelisted |

The data-deletion callback verifies Meta's `signed_request` (HMAC-SHA256 with the app
secret), records the request (`fb_data_deletion_requests`), and returns the exact
`{ url, confirmation_code }` Meta requires. Coexists with Post Master on the same app.

---

## ⚠️ BLOCKER (found 2026-06-14): the admin FB account is restricted

The account **"Jafrul Hasan Junait"** has a standing **advertising restriction since
May 18, 2023** (ad-standards violation, technology-detected). Its terms include
**"Can't manage advertising assets or people for businesses."** That blocks the
**Connect app → business** button (greyed/restricted) and likely business management.
There is **no appeal button** (window closed) — automation cannot bypass an
account-level restriction.

**Unblock = do all Meta business/app admin from a CLEAN (non-restricted) FB account:**
1. Log into a different personal FB account you control with no restrictions.
2. Create a NEW Business Portfolio named **"Safi Trading"** with the exact legal
   details from the trade license (reusing the name is fine — verification matches the
   document, not the portfolio).
3. Connect the **EcomeX Client** app (`1276249251010908`) to it (button won't be
   restricted on a clean account).
4. Verify that business with the trade license, then submit App Review.

The restricted account can remain a **Page admin** (page messaging / FB inbox is NOT
ad-related and works fine). WhatsApp is unaffected.

Existing Safi Trading business_id (the restricted-account one) = **143446948506551**.

---

## 1. Business Verification (do this FIRST — it gates everything)

App Dashboard → **Settings → Business verification** (or Meta Business Suite →
Security Center). Submit:
- Legal business name + address (Ecomex)
- Business registration document / trade license (Bangladesh)
- A verifiable phone/email + domain (whatapp.ecomex.cloud)

Takes a few business days. Advanced Access permissions cannot go Live without it.

---

## 2. Permissions to request — REQUEST ONLY WHAT THE INBOX DEMONSTRATES

Every Advanced-Access permission needs its own justification + a screencast step that
SHOWS it being used. Requesting permissions you can't demo on screen = rejection.

**Core set to submit (the CRM inbox use case):**

| Permission | Why we need it (justification text to paste) |
|---|---|
| `pages_show_list` | After the user logs in with Facebook, we display the list of Pages they manage so they can choose which Page to connect to their CRM inbox. |
| `pages_messaging` | The core feature: the user receives messages sent to their Page and replies to their customers from within our shared inbox. Without it the product does nothing. |
| `pages_manage_metadata` | We subscribe the connected Page to our webhook so inbound messages are delivered to the inbox in real time. Used only to install/remove the webhook subscription. |
| `pages_read_engagement` | We read basic Page profile data (name, picture) to label the connected inbox and identify the Page the conversation belongs to. |

**Instagram (only if you will demo IG DMs in the screencast):**

| Permission | Justification |
|---|---|
| `instagram_basic` | Read the IG Business account linked to the connected Page to label the IG inbox. |
| `instagram_manage_messages` | Receive and reply to Instagram Direct messages for the connected IG Business account inside the same inbox. |

**DO NOT submit for review (unless you build + demo those exact features):**
`pages_manage_posts`, `pages_manage_engagement`, `instagram_content_publish`,
`instagram_manage_comments`. These are publishing/comment-moderation scopes. Our app's
scope list (`apps/server/src/services/facebook/oauth.ts`) currently includes some of
them — **trim the requested set to the table above before submitting**, or each one
Meta sees triggers its own justification + demo requirement and slows/blocks approval.
Post Master is the publisher; this app is the inbox.

> Action: edit `FB_OAUTH_SCOPES` / `IG_OAUTH_SCOPES` to the core set above before the
> screencast, so the consent dialog the reviewer sees matches exactly what you justify.

---

## 3. App settings to fill before submitting

App Dashboard → **App settings → Basic**:
- App icon 1024×1024 (the What A App logo)
- Category: Business / Messaging
- Privacy Policy URL → `/privacy`
- Terms of Service URL → `/terms`
- User Data Deletion → choose **Data Deletion Request URL** → `/api/fb/data-deletion`
  (or "Data Deletion Instructions URL" → `/data-deletion` if you prefer the manual flow)
- App Domains: `whatapp.ecomex.cloud`

**Facebook Login for Business / Facebook Login → Settings:**
- Valid OAuth Redirect URIs includes `https://whatapp.ecomex.cloud/api/fb/oauth/callback`
  (already set; Post Master's URI preserved)
- Client OAuth Login: ON, Web OAuth Login: ON

**Webhooks (Messenger + Instagram product):**
- Callback URL `https://whatapp.ecomex.cloud/api/webhooks/fb`, verify token = our
  `FB_WEBHOOK_VERIFY_TOKEN`
- Subscribe fields: `messages`, `messaging_postbacks` (Messenger);
  `messages` (Instagram, if doing IG)

---

## 4. Screencast script (record one clean 2–3 min video per the reviewer's view)

Meta reviewers are logged-out and outside your org. The video must show a NON-developer
user completing the real flow. Record at 1280×720+, English, no cuts mid-flow.

1. Open `https://whatapp.ecomex.cloud`, sign up / log in as a normal business user.
2. Go to the **Facebook Inbox / Connect** screen. Click **Connect Facebook**.
3. The Facebook login dialog appears → log in as a test business user → the **Page
   list** appears (**demonstrates `pages_show_list`**) → select a Page → grant.
4. Land back in the app showing the Page connected (**`pages_read_engagement`** = the
   Page name/picture now labels the inbox; **`pages_manage_metadata`** = "connected /
   receiving messages" state from the webhook subscription).
5. From a SECOND phone/account, send a Facebook message to that Page. Show it **arrive
   in the inbox in real time**, then **type a reply and send it** — show it delivered
   on the customer phone (**demonstrates `pages_messaging`**).
6. (IG only) Repeat 5 for an Instagram DM (`instagram_manage_messages`).
7. Show **revocation**: open Facebook → Settings → Business Integrations → remove the
   app, to demonstrate the user controls access (ties to the data-deletion flow).

Upload the video in each permission's "How will you use this permission?" section and
reference the exact timestamp where that permission is exercised.

---

## 5. Submit

App Dashboard → **App Review → Permissions and Features** → request Advanced Access on
each permission in §2 → fill the justification (copy from the table) → attach the
screencast + timestamps → submit. Then **App Review → switch app to Live** once approved
and Business Verification is green.

Typical turnaround: a few days to ~2 weeks. Expect one round of "please clarify X" —
respond fast.

---

## 6. After approval

- Any tenant can connect their own Page; nothing changes in our code (the shared-app
  OAuth flow already works for non-admin users once the app is Live + Advanced Access).
- Keep the demo connection (`Fx Junait Saheb`) as the live proof.
- Re-enable `FB_LOGIN_CONFIG_ID` only if you later need the Business-Login asset flow;
  the scope flow (current) avoids the ad-account asset step and is sufficient for the
  inbox use case.
