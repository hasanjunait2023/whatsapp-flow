import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.FB_APP_ID = "123456";
process.env.FB_APP_SECRET = "fb-app-secret-test";
process.env.FB_OAUTH_REDIRECT_URL = "http://localhost:3000/api/fb/oauth/callback";
process.env.MASTER_KEY = "a".repeat(64);
delete process.env.FB_LOGIN_CONFIG_ID;

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants } = await import("../src/db/schema.js");
const {
  signState,
  verifyState,
  buildAuthUrl,
  upsertConnectedPages,
  getPageToken,
  encryptPageToken,
  FB_OAUTH_SCOPES,
} = await import("../src/services/facebook/oauth.js");
const { fbOauthCallbackRoute, listConnectedPages } = await import("../src/routes/fb-oauth.js");
const { FB_HANDLERS } = await import("../src/routes/fb-fns.js");
import { Hono } from "hono";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const USER_A = "user-a";

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values({ id: TENANT_A, name: "A", owner_id: USER_A }).run();
});

describe("signed OAuth state", () => {
  it("round-trips tenant and user through sign/verify", () => {
    const state = signState(TENANT_A, USER_A);
    expect(verifyState(state)).toEqual({ tenantId: TENANT_A, userId: USER_A });
  });

  it("rejects a tampered payload", () => {
    const state = signState(TENANT_A, USER_A);
    const [payload, sig] = [state.slice(0, state.lastIndexOf(".")), state.slice(state.lastIndexOf(".") + 1)];
    const forged = Buffer.from(
      JSON.stringify({ t: "other-tenant", u: USER_A, e: Date.now() + 60_000, n: "00" }),
      "utf8",
    ).toString("base64url");
    expect(verifyState(`${forged}.${sig}`)).toBeNull();
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyState(`${payload}.${flipped}`)).toBeNull();
  });

  it("rejects an expired state even with a valid signature", () => {
    const payload = Buffer.from(
      JSON.stringify({ t: TENANT_A, u: USER_A, e: Date.now() - 1000, n: "00" }),
      "utf8",
    ).toString("base64url");
    const sig = createHmac("sha256", process.env.FB_APP_SECRET!).update(payload).digest("base64url");
    expect(verifyState(`${payload}.${sig}`)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifyState("")).toBeNull();
    expect(verifyState("not-a-state")).toBeNull();
    expect(verifyState("a.b")).toBeNull();
  });
});

describe("auth dialog URL", () => {
  it("requests post + comment + messaging page permissions", () => {
    const url = new URL(buildAuthUrl(signState(TENANT_A, USER_A)));
    const scope = url.searchParams.get("scope") ?? "";
    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("client_id")).toBe("123456");
    for (const perm of [
      "pages_manage_posts",
      "pages_manage_engagement",
      "pages_read_engagement",
      "pages_messaging",
      "pages_show_list",
      "pages_manage_metadata",
    ]) {
      expect(scope).toContain(perm);
    }
    expect(FB_OAUTH_SCOPES).toContain("pages_manage_posts");
  });

  it("uses config_id instead of scope when FB_LOGIN_CONFIG_ID is set", () => {
    process.env.FB_LOGIN_CONFIG_ID = "cfg-1";
    const url = new URL(buildAuthUrl("state"));
    expect(url.searchParams.get("config_id")).toBe("cfg-1");
    expect(url.searchParams.get("scope")).toBeNull();
    delete process.env.FB_LOGIN_CONFIG_ID;
  });
});

describe("page token storage", () => {
  it("encrypts new tokens and decrypts them via getPageToken", () => {
    const stored = encryptPageToken("EAAB-page-token");
    expect(stored).not.toBe("EAAB-page-token");
    expect(getPageToken(stored)).toBe("EAAB-page-token");
  });

  it("passes legacy plaintext tokens through unchanged", () => {
    expect(getPageToken("EAAB-legacy-plaintext")).toBe("EAAB-legacy-plaintext");
    expect(getPageToken(null)).toBeNull();
  });
});

describe("upsertConnectedPages", () => {
  it("inserts pages (first = default, active, encrypted token) and updates on reconnect", () => {
    const connected = upsertConnectedPages(TENANT_A, [
      { id: "FBP-1", name: "Shop One", access_token: "tok-1" },
      { id: "FBP-2", name: "Shop Two", access_token: "tok-2" },
    ]);
    expect(connected).toHaveLength(2);

    const rows = sqlite
      .prepare("SELECT page_id, page_name, page_access_token, status, is_default FROM facebook_pages WHERE tenant_id = ? ORDER BY page_id")
      .all(TENANT_A) as Array<{ page_id: string; page_name: string; page_access_token: string; status: string; is_default: number }>;
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe("active");
    expect(rows[0].is_default).toBe(1);
    expect(rows[1].is_default).toBe(0);
    expect(rows[0].page_access_token).not.toBe("tok-1");
    expect(getPageToken(rows[0].page_access_token)).toBe("tok-1");

    // Reconnect with a refreshed token + renamed page: updates, no duplicate row.
    upsertConnectedPages(TENANT_A, [{ id: "FBP-1", name: "Shop One Renamed", access_token: "tok-1b" }]);
    const after = sqlite
      .prepare("SELECT page_name, page_access_token FROM facebook_pages WHERE tenant_id = ? AND page_id = 'FBP-1'")
      .all(TENANT_A) as Array<{ page_name: string; page_access_token: string }>;
    expect(after).toHaveLength(1);
    expect(after[0].page_name).toBe("Shop One Renamed");
    expect(getPageToken(after[0].page_access_token)).toBe("tok-1b");
  });

  it("lists pages without exposing tokens", () => {
    const pages = listConnectedPages(TENANT_A);
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      expect(p).not.toHaveProperty("page_access_token");
      expect(p.has_token).toBe(true);
    }
  });
});

describe("OAuth callback route", () => {
  const app = new Hono();
  app.route("/api/fb/oauth/callback", fbOauthCallbackRoute);

  it("redirects with fb_error on an invalid state", async () => {
    const res = await app.request("/api/fb/oauth/callback?state=forged&code=x");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("fb_error=invalid_state");
  });

  it("redirects with fb_error when the user denied the dialog", async () => {
    const res = await app.request("/api/fb/oauth/callback?error=access_denied");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("fb_error=access_denied");
  });

  it("redirects with fb_error when code is missing", async () => {
    const state = signState(TENANT_A, USER_A);
    const res = await app.request(`/api/fb/oauth/callback?state=${encodeURIComponent(state)}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("fb_error=missing_code");
  });
});

describe("fb-page-disconnect handler", () => {
  it("clears the token and refuses cross-tenant access", async () => {
    const row = sqlite
      .prepare("SELECT id FROM facebook_pages WHERE tenant_id = ? AND page_id = 'FBP-2'")
      .get(TENANT_A) as { id: string };

    const denied = await FB_HANDLERS["fb-page-disconnect"](
      { page_id: row.id },
      { userId: "intruder", tenantId: "other-tenant", isAdmin: false },
    );
    expect((denied.data as { error?: string }).error).toBe("Access denied");

    const okRes = await FB_HANDLERS["fb-page-disconnect"](
      { page_id: row.id },
      { userId: USER_A, tenantId: TENANT_A, isAdmin: false },
    );
    expect((okRes.data as { success?: boolean }).success).toBe(true);
    const after = sqlite
      .prepare("SELECT status, page_access_token FROM facebook_pages WHERE id = ?")
      .get(row.id) as { status: string; page_access_token: string };
    expect(after.status).toBe("disconnected");
    expect(after.page_access_token).toBe("");
  });
});
