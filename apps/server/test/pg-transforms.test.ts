import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import {
  isNullish,
  toText,
  toIsoText,
  toBoolInt,
  toJsonText,
  toArrayJsonText,
  toNumericText,
  toReal,
  toInt,
  transformRow,
  type ColumnKind,
} from "../scripts/pg-transforms.js";
import {
  isStorageUrl,
  planMediaUrl,
  rewriteMediaUrl,
  LOCAL_MEDIA_PREFIX,
} from "../scripts/pg-media.js";
import {
  mapGoTrueUser,
  type GoTrueUser,
  type GoTrueIdentity,
} from "../scripts/pg-auth-map.js";
import { kindsForTable, columnKind, backfillTenantId } from "../scripts/pg-tables.js";
import { verifyPassword } from "../src/auth/password.js";

// ---------------------------------------------------------------------------
// Scalar transforms
// ---------------------------------------------------------------------------
describe("isNullish", () => {
  it("treats null and undefined as nullish, everything else as present", () => {
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish("")).toBe(false);
    expect(isNullish(0)).toBe(false);
    expect(isNullish(false)).toBe(false);
  });
});

describe("toText (uuid / text / timestamptz passthrough)", () => {
  it("passes a uuid string through verbatim", () => {
    const uuid = "0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9";
    expect(toText(uuid)).toBe(uuid);
  });

  it("emits a Date as ISO-8601 identical to toISOString()", () => {
    const d = new Date("2026-06-12T08:30:00.123Z");
    expect(toText(d)).toBe(d.toISOString());
  });

  it("returns null for null/undefined and for an invalid Date", () => {
    expect(toText(null)).toBeNull();
    expect(toText(undefined)).toBeNull();
    expect(toText(new Date("nonsense"))).toBeNull();
  });
});

describe("toIsoText (timestamptz -> ISO-8601)", () => {
  it("converts a Date exactly like toISOString()", () => {
    const d = new Date("2025-01-02T03:04:05.678Z");
    expect(toIsoText(d)).toBe(d.toISOString());
    expect(toIsoText(d)).toBe("2025-01-02T03:04:05.678Z");
  });

  it("normalises an ISO string and a numeric epoch to ISO", () => {
    expect(toIsoText("2025-01-02T03:04:05.678Z")).toBe("2025-01-02T03:04:05.678Z");
    const epoch = Date.UTC(2025, 0, 2, 3, 4, 5, 678);
    expect(toIsoText(epoch)).toBe("2025-01-02T03:04:05.678Z");
  });

  it("returns null for nullish and unparseable input", () => {
    expect(toIsoText(null)).toBeNull();
    expect(toIsoText("not-a-date")).toBeNull();
    expect(toIsoText({} as unknown)).toBeNull();
  });
});

describe("toBoolInt (boolean -> 0/1)", () => {
  it("maps native booleans", () => {
    expect(toBoolInt(true)).toBe(1);
    expect(toBoolInt(false)).toBe(0);
  });

  it("maps Postgres string spellings", () => {
    expect(toBoolInt("t")).toBe(1);
    expect(toBoolInt("true")).toBe(1);
    expect(toBoolInt("f")).toBe(0);
    expect(toBoolInt("false")).toBe(0);
  });

  it("maps numeric truthiness and returns null for nullish/unknown", () => {
    expect(toBoolInt(1)).toBe(1);
    expect(toBoolInt(0)).toBe(0);
    expect(toBoolInt(null)).toBeNull();
    expect(toBoolInt("maybe")).toBeNull();
  });
});

describe("toJsonText (jsonb -> JSON text)", () => {
  it("serialises objects and arrays", () => {
    expect(toJsonText({ a: 1, b: [2, 3] })).toBe('{"a":1,"b":[2,3]}');
    expect(toJsonText([1, "x"])).toBe('[1,"x"]');
  });

  it("passes an already-serialised string through unchanged (no double-encode)", () => {
    expect(toJsonText('{"a":1}')).toBe('{"a":1}');
  });

  it("returns null for nullish", () => {
    expect(toJsonText(null)).toBeNull();
    expect(toJsonText(undefined)).toBeNull();
  });
});

describe("toArrayJsonText (pg array -> JSON text)", () => {
  it("serialises a JS array (node-postgres returns text[] as an array)", () => {
    expect(toArrayJsonText(["a", "b"])).toBe('["a","b"]');
    expect(toArrayJsonText([])).toBe("[]");
  });

  it("passes a JSON-array string through and wraps a bare scalar", () => {
    expect(toArrayJsonText('["a","b"]')).toBe('["a","b"]');
    expect(toArrayJsonText("solo")).toBe('["solo"]');
  });

  it("returns null for nullish", () => {
    expect(toArrayJsonText(null)).toBeNull();
  });
});

describe("toNumericText (numeric/money -> string, lossless)", () => {
  it("keeps a high-precision numeric string verbatim", () => {
    expect(toNumericText("12345678901234567890.123456")).toBe("12345678901234567890.123456");
  });

  it("stringifies numbers and returns null for nullish", () => {
    expect(toNumericText(10.5)).toBe("10.5");
    expect(toNumericText(null)).toBeNull();
  });
});

describe("toReal (numeric/money -> real)", () => {
  it("parses strings and passes numbers", () => {
    expect(toReal("10.50")).toBe(10.5);
    expect(toReal(3)).toBe(3);
  });

  it("returns null for nullish and throws on non-numeric", () => {
    expect(toReal(null)).toBeNull();
    expect(() => toReal("abc")).toThrow();
  });
});

describe("toInt (integer)", () => {
  it("truncates floats, passes integers, nulls nullish", () => {
    expect(toInt(5)).toBe(5);
    expect(toInt("7")).toBe(7);
    expect(toInt(7.9)).toBe(7);
    expect(toInt(null)).toBeNull();
  });

  it("throws on a non-numeric value", () => {
    expect(() => toInt("x")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// transformRow (column-kind driven)
// ---------------------------------------------------------------------------
describe("transformRow", () => {
  const kinds: Record<string, ColumnKind> = {
    id: "text",
    created_at: "text",
    is_active: "bool",
    settings: "json",
    tags: "json",
    price: "real",
    qty: "int",
    tenant_id: "text",
  };

  it("transforms each column by its kind and preserves tenant_id verbatim", () => {
    const row = {
      id: "abc",
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      is_active: true,
      settings: { theme: "dark" },
      tags: ["vip", "new"],
      price: "19.99",
      qty: 3.7,
      tenant_id: "tenant-xyz",
    };
    const out = transformRow(row, kinds);
    expect(out).toEqual({
      id: "abc",
      created_at: "2026-01-01T00:00:00.000Z",
      is_active: 1,
      settings: '{"theme":"dark"}',
      tags: '["vip","new"]',
      price: 19.99,
      qty: 3,
      tenant_id: "tenant-xyz",
    });
  });

  it("drops source columns not in the schema and skips absent columns", () => {
    const out = transformRow({ id: "x", legacy_col: "drop-me" }, kinds);
    expect(out).toEqual({ id: "x" });
    expect("legacy_col" in out).toBe(false);
    expect("created_at" in out).toBe(false);
  });

  it("does not mutate the input row", () => {
    const row = { id: "x", is_active: true };
    const snapshot = { ...row };
    transformRow(row, kinds);
    expect(row).toEqual(snapshot);
  });

  it("emits explicit null for a present-but-null tenant-scoped value", () => {
    const out = transformRow({ id: "x", settings: null }, kinds);
    expect(out.settings).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Schema-derived column kinds
// ---------------------------------------------------------------------------
describe("kindsForTable / columnKind", () => {
  it("derives the right kinds from the live tenants schema", () => {
    const kinds = kindsForTable("tenants");
    expect(kinds.id).toBe("text");
    expect(kinds.is_activated).toBe("bool");
    expect(kinds.onboarding_status).toBe("json");
    expect(kinds.created_at).toBe("text");
    expect(kinds.tenant_id).toBeUndefined(); // tenants has no tenant_id column
  });

  it("maps real/int columns from the plans schema", () => {
    const kinds = kindsForTable("plans");
    expect(kinds.price_monthly).toBe("real");
    expect(kinds.max_agents).toBe("int");
    expect(kinds.features).toBe("json");
  });

  it("every tenant-scoped table keeps a tenant_id text kind", () => {
    for (const table of ["contacts", "messages", "orders", "payments"] as const) {
      expect(kindsForTable(table).tenant_id).toBe("text");
    }
  });
});

// ---------------------------------------------------------------------------
// Media URL rewrite
// ---------------------------------------------------------------------------
describe("media URL rewrite", () => {
  const TENANT = "11111111-2222-3333-4444-555555555555";
  const publicUrl =
    `https://abcxyz.supabase.co/storage/v1/object/public/media/${TENANT}/chats/photo.jpg`;
  const signedUrl =
    `https://abcxyz.supabase.co/storage/v1/object/sign/media/${TENANT}/chats/doc.pdf?token=eyJhbGciOi`;

  it("recognises public and signed storage URLs, rejects others", () => {
    expect(isStorageUrl(publicUrl)).toBe(true);
    expect(isStorageUrl(signedUrl)).toBe(true);
    expect(isStorageUrl("/media/x/y.jpg")).toBe(false);
    expect(isStorageUrl("https://cdn.example.com/a.png")).toBe(false);
  });

  it("plans a tenant-namespaced local path and strips the signing token", () => {
    const plan = planMediaUrl(signedUrl, TENANT)!;
    expect(plan.bucket).toBe("media");
    expect(plan.objectPath).toBe(`${TENANT}/chats/doc.pdf`);
    expect(plan.localRelativePath).toBe(`${TENANT}/media/${TENANT}/chats/doc.pdf`);
    expect(plan.rewrittenUrl).toBe(`${LOCAL_MEDIA_PREFIX}/${TENANT}/media/${TENANT}/chats/doc.pdf`);
    expect(plan.rewrittenUrl).not.toContain("token");
  });

  it("rewrites a storage value and leaves non-storage values untouched", () => {
    expect(rewriteMediaUrl(publicUrl, TENANT)).toBe(
      `${LOCAL_MEDIA_PREFIX}/${TENANT}/media/${TENANT}/chats/photo.jpg`,
    );
    expect(rewriteMediaUrl("https://cdn.example.com/a.png", TENANT)).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(rewriteMediaUrl(null, TENANT)).toBeNull();
    expect(rewriteMediaUrl("", TENANT)).toBe("");
  });

  it("is idempotent: re-running over an already-local path is a no-op", () => {
    const once = rewriteMediaUrl(publicUrl, TENANT)!;
    const twice = rewriteMediaUrl(once, TENANT);
    expect(twice).toBe(once);
  });

  it("never lets one tenant's media collide with another's", () => {
    const a = rewriteMediaUrl(publicUrl, "tenant-a")!;
    const b = rewriteMediaUrl(publicUrl, "tenant-b")!;
    expect(a).not.toBe(b);
    expect(a.startsWith(`${LOCAL_MEDIA_PREFIX}/tenant-a/`)).toBe(true);
    expect(b.startsWith(`${LOCAL_MEDIA_PREFIX}/tenant-b/`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auth row mapping (GoTrue -> better-auth)
// ---------------------------------------------------------------------------
describe("mapGoTrueUser", () => {
  let counter = 0;
  const genId = () => `gen-${++counter}`;

  function baseUser(overrides: Partial<GoTrueUser> = {}): GoTrueUser {
    return {
      id: "user-1",
      email: "owner@demo.test",
      encrypted_password: "$2a$10$" + "a".repeat(53),
      email_confirmed_at: new Date("2025-01-01T00:00:00.000Z"),
      raw_user_meta_data: { full_name: "Demo Owner", avatar_url: "https://img/x.png" },
      created_at: new Date("2024-12-01T00:00:00.000Z"),
      updated_at: new Date("2024-12-15T00:00:00.000Z"),
      ...overrides,
    };
  }

  it("maps a bcrypt user to a verified user + verbatim-hash credential account", () => {
    const u = baseUser();
    const mapped = mapGoTrueUser(u, [], genId);

    expect(mapped.user.id).toBe("user-1");
    expect(mapped.user.email).toBe("owner@demo.test");
    expect(mapped.user.name).toBe("Demo Owner");
    expect(mapped.user.emailVerified).toBe(true);
    expect(mapped.user.image).toBe("https://img/x.png");
    expect(mapped.user.createdAt).toBeInstanceOf(Date);

    expect(mapped.credentialAccount).not.toBeNull();
    expect(mapped.credentialAccount!.providerId).toBe("credential");
    expect(mapped.credentialAccount!.accountId).toBe("user-1");
    expect(mapped.credentialAccount!.userId).toBe("user-1");
    // Hash carried verbatim so password.ts can verify + rehash on first login.
    expect(mapped.credentialAccount!.password).toBe(u.encrypted_password);
    expect(mapped.needsPasswordReset).toBe(false);
  });

  it("flags a user with an empty/missing hash for forced reset (no credential)", () => {
    const empty = mapGoTrueUser(baseUser({ encrypted_password: "" }), [], genId);
    expect(empty.credentialAccount).toBeNull();
    expect(empty.needsPasswordReset).toBe(true);

    const missing = mapGoTrueUser(baseUser({ encrypted_password: null }), [], genId);
    expect(missing.credentialAccount).toBeNull();
    expect(missing.needsPasswordReset).toBe(true);
  });

  it("flags a non-bcrypt hash for reset rather than storing an unverifiable secret", () => {
    const scrypt = mapGoTrueUser(
      baseUser({ encrypted_password: "scrypt:not-a-bcrypt-hash" }),
      [],
      genId,
    );
    expect(scrypt.credentialAccount).toBeNull();
    expect(scrypt.needsPasswordReset).toBe(true);
  });

  it("maps OAuth identities to google account rows for re-link", () => {
    const identities: GoTrueIdentity[] = [
      {
        id: "id-1",
        user_id: "user-1",
        provider: "google",
        provider_id: "google-sub-123",
        created_at: new Date("2025-02-01T00:00:00.000Z"),
        updated_at: new Date("2025-02-02T00:00:00.000Z"),
      },
    ];
    const mapped = mapGoTrueUser(baseUser(), identities, genId);
    expect(mapped.oauthAccounts).toHaveLength(1);
    expect(mapped.oauthAccounts[0].providerId).toBe("google");
    expect(mapped.oauthAccounts[0].accountId).toBe("google-sub-123");
    expect(mapped.oauthAccounts[0].password).toBeNull();
  });

  it("an OAuth-only user with no password is NOT flagged for reset", () => {
    const identities: GoTrueIdentity[] = [
      {
        id: "id-1",
        user_id: "user-1",
        provider: "google",
        provider_id: "g-1",
        created_at: null,
        updated_at: null,
      },
    ];
    const mapped = mapGoTrueUser(
      baseUser({ encrypted_password: null }),
      identities,
      genId,
    );
    expect(mapped.credentialAccount).toBeNull();
    expect(mapped.oauthAccounts).toHaveLength(1);
    expect(mapped.needsPasswordReset).toBe(false);
  });

  it("falls back to the email local-part when metadata has no name", () => {
    const mapped = mapGoTrueUser(
      baseUser({ raw_user_meta_data: null }),
      [],
      genId,
    );
    expect(mapped.user.name).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// bcrypt sample-verify through the real password.ts path
// ---------------------------------------------------------------------------
describe("bcrypt sample verify (password.ts)", () => {
  it("verifies a known plaintext against a migrated bcrypt hash and signals rehash", async () => {
    const plaintext = "demo-password-123";
    const hash = bcrypt.hashSync(plaintext, 10); // synthetic GoTrue-style hash

    // The carried-verbatim hash is exactly what the credential account stores.
    const mapped = mapGoTrueUser(
      {
        id: "u",
        email: "u@test",
        encrypted_password: hash,
        email_confirmed_at: null,
        raw_user_meta_data: null,
        created_at: null,
        updated_at: null,
      },
      [],
      () => "acct-1",
    );
    expect(mapped.credentialAccount!.password).toBe(hash);

    const nativeVerify = async () => false; // not used for a bcrypt hash
    const ok = await verifyPassword(plaintext, mapped.credentialAccount!.password!, nativeVerify);
    expect(ok.valid).toBe(true);
    expect(ok.needsRehash).toBe(true);

    const wrong = await verifyPassword("wrong-pass", hash, nativeVerify);
    expect(wrong.valid).toBe(false);
  });
});

describe("backfillTenantId (synthetic tenant_id from parent)", () => {
  const cfg = { parent: "orders" as const, fkColumn: "order_id" };

  it("keeps an existing non-empty tenant_id untouched", () => {
    const res = backfillTenantId({ id: "oi1", order_id: "o1", tenant_id: "t-existing" }, cfg, () => "t-parent");
    expect("dropped" in res).toBe(false);
    if (!("dropped" in res)) expect(res.row.tenant_id).toBe("t-existing");
  });

  it("stamps tenant_id from the parent when the child lacks it", () => {
    const res = backfillTenantId({ id: "oi1", order_id: "o1" }, cfg, (id) => (id === "o1" ? "t-parent" : undefined));
    expect("dropped" in res).toBe(false);
    if (!("dropped" in res)) expect(res.row.tenant_id).toBe("t-parent");
  });

  it("stamps when tenant_id is present but empty", () => {
    const res = backfillTenantId({ id: "oi1", order_id: "o1", tenant_id: "" }, cfg, () => "t-parent");
    if (!("dropped" in res)) expect(res.row.tenant_id).toBe("t-parent");
  });

  it("drops the row when the parent cannot be resolved", () => {
    const res = backfillTenantId({ id: "oi1", order_id: "missing" }, cfg, () => undefined);
    expect("dropped" in res).toBe(true);
  });

  it("drops the row when the fk column is missing", () => {
    const res = backfillTenantId({ id: "oi1" }, cfg, () => "t-parent");
    expect("dropped" in res).toBe(true);
  });

  it("does not mutate the input row", () => {
    const input = { id: "oi1", order_id: "o1" };
    backfillTenantId(input, cfg, () => "t-parent");
    expect(input).not.toHaveProperty("tenant_id");
  });
});
