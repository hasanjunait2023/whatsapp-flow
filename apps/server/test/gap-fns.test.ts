import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, whatsappInstances, fbContacts, facebookPages, externalSalesOrders } =
  await import("../src/db/schema.js");
const { adminDeleteTenant, adminResetUserPassword, adminLinkSession } = await import("../src/routes/admin-fns.js");
const { sendWelcomeEmail, resendWelcomeNotification, reportSystemError, fbBackfillProfiles, testWelcomeMessage } =
  await import("../src/routes/welcome-fns.js");
const { wahaClient } = await import("../src/waha/client.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null, isAdmin = false): FnContext {
  return { userId: "admin-u", tenantId, isAdmin };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "owner-a" },
    { id: TENANT_B, name: "B", owner_id: "owner-b" },
  ]);
  await db.insert(facebookPages).values([
    { id: "page-a", tenant_id: TENANT_A, page_id: "fb-a", page_name: "Page A", page_access_token: "tok-a" },
    { id: "page-b", tenant_id: TENANT_B, page_id: "fb-b", page_name: "Page B", page_access_token: "tok-b" },
  ]);
  await db.insert(fbContacts).values([
    { id: "fc-a", tenant_id: TENANT_A, page_id: "page-a", psid: "psid-a" },
    { id: "fc-b", tenant_id: TENANT_B, page_id: "page-b", psid: "psid-b" },
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("admin-only gating", () => {
  it("admin-delete-tenant refuses non-admins", async () => {
    const res = await adminDeleteTenant({ tenant_ids: [TENANT_A] }, ctx(TENANT_A, false));
    // The forbidden() helper returns { data: null, error: { message, code } }
    // (the dispatcher maps this to HTTP 403). The test was written for the
    // old shape where data held an error string — updated 2026-07-01 to match
    // the current FnResult envelope.
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe("Admin privileges required");
    expect(res.error?.code).toBe("FORBIDDEN");
  });

  it("admin-reset-user-password refuses non-admins", async () => {
    const res = await adminResetUserPassword({ user_id: "x" }, ctx(TENANT_A, false));
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe("Admin privileges required");
    expect(res.error?.code).toBe("FORBIDDEN");
  });
});

describe("admin-delete-tenant", () => {
  it("purges only the targeted tenant's rows and deletes its WAHA sessions", async () => {
    await db.insert(whatsappInstances).values([
      { id: "inst-a", tenant_id: TENANT_A, name: "A", status: "active", session_id: "default" },
      { id: "inst-b", tenant_id: TENANT_B, name: "B", status: "active", session_id: "default" },
    ]);
    const delSpy = vi.spyOn(wahaClient, "deleteSession").mockResolvedValue(undefined);

    const res = await adminDeleteTenant({ tenant_ids: [TENANT_A] }, ctx(TENANT_A, true));
    const data = res.data as { success: boolean; results: Array<{ sessions_deleted: number }> };
    expect(data.success).toBe(true);
    expect(data.results[0].sessions_deleted).toBe(1);
    expect(delSpy).toHaveBeenCalledTimes(1);

    // Tenant A gone, tenant B untouched.
    expect(await dbGet("SELECT 1 FROM tenants WHERE id = ?", TENANT_A)).toBeUndefined();
    expect(await dbGet("SELECT 1 FROM tenants WHERE id = ?", TENANT_B)).toBeTruthy();
    expect(await dbGet("SELECT 1 FROM whatsapp_instances WHERE id = 'inst-b'")).toBeTruthy();
    expect(await dbGet("SELECT 1 FROM whatsapp_instances WHERE id = 'inst-a'")).toBeUndefined();
  });
});

describe("admin-link-session", () => {
  it("links a verified session and de-dupes other instances sharing it", async () => {
    await db.insert(whatsappInstances).values([
      { id: "link-1", tenant_id: TENANT_B, name: "L1", status: "disconnected" },
      { id: "link-2", tenant_id: TENANT_B, name: "L2", status: "active", session_id: "sess-x" },
    ]);
    vi.spyOn(wahaClient, "getSession").mockResolvedValue({
      name: "sess-x",
      status: "WORKING",
      me: { id: "8801711@c.us" },
    });

    const res = await adminLinkSession({ instance_id: "link-1", session_id: "sess-x" }, ctx(TENANT_B, true));
    const data = res.data as { success: boolean; duplicates_cleared: number; status: string };
    expect(data.success).toBe(true);
    expect(data.status).toBe("active");
    expect(data.duplicates_cleared).toBe(1);

    const cleared = (await dbGet("SELECT session_id FROM whatsapp_instances WHERE id = 'link-2'")) as {
      session_id: string | null;
    };
    expect(cleared.session_id).toBeNull();
  });
});

describe("send-welcome-email / test-welcome-message tenant scoping", () => {
  it("refuses to send a welcome notification for another tenant", async () => {
    const res = await sendWelcomeEmail(
      { to: "x@y.z", customerName: "X", email: "x@y.z", tempPassword: "p", tenant_id: TENANT_A },
      ctx(TENANT_B, false),
    );
    expect((res.data as { error?: string }).error).toBe("Forbidden tenant");
  });

  it("delivers a welcome notification in-app for the caller's tenant", async () => {
    const res = await sendWelcomeEmail(
      { to: "x@y.z", customerName: "X", email: "x@y.z", tempPassword: "p", tenant_id: TENANT_B },
      ctx(TENANT_B, false),
    );
    expect((res.data as { success: boolean }).success).toBe(true);
    const row = await dbGet(
      "SELECT 1 FROM notifications WHERE tenant_id = ? AND type = 'welcome' LIMIT 1",
      TENANT_B,
    );
    expect(row).toBeTruthy();
  });

  it("test-welcome-message requires admin for cross-tenant", async () => {
    const res = await testWelcomeMessage({ tenant_id: TENANT_A }, ctx(TENANT_B, false));
    expect((res.data as { error?: string }).error).toBe("Forbidden tenant");
  });
});

describe("resend-welcome-notification", () => {
  it("admin-only and notifies the order's tenant", async () => {
    await db.insert(externalSalesOrders).values({
      id: "ord-1",
      tenant_id: TENANT_B,
      amount: 100,
      business_name: "Biz",
      business_type: "shop",
      customer_email: "c@e.z",
      customer_name: "Cust",
      external_order_id: "ext-1",
    });
    const res = await resendWelcomeNotification({ order_id: "ord-1", temp_password: "Temp@abc" }, ctx(null, true));
    const data = res.data as { success: boolean; temp_password: string };
    expect(data.success).toBe(true);
    expect(data.temp_password).toBe("Temp@abc");
    expect(
      await dbGet("SELECT 1 FROM notifications WHERE tenant_id = ? AND type = 'welcome' LIMIT 1", TENANT_B),
    ).toBeTruthy();
  });

  it("refuses non-admins", async () => {
    const res = await resendWelcomeNotification({ order_id: "ord-1" }, ctx(TENANT_B, false));
    // resendWelcomeNotification uses an inline FORBIDDEN envelope (not the
    // admin-fns forbidden() helper), but the shape is identical:
    // { data: null, error: { code: "FORBIDDEN", message: "..." } }.
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe("Admin privileges required");
    expect(res.error?.code).toBe("FORBIDDEN");
  });
});

describe("report-system-error", () => {
  it("creates an admin notification + support ticket scoped to the caller's tenant", async () => {
    const res = await reportSystemError(
      { source: "tenant", error_message: "boom failure", error_type: "js", page_url: "/inbox" },
      ctx(TENANT_A, false),
    );
    const data = res.data as { success: boolean; ticket_number: string };
    expect(data.success).toBe(true);
    expect(data.ticket_number).toMatch(/^ERR-/);

    const ticket = (await dbGet(
      "SELECT tenant_id FROM support_tickets WHERE ticket_number = ?",
      data.ticket_number,
    )) as { tenant_id: string };
    expect(ticket.tenant_id).toBe(TENANT_A);
  });

  it("de-dups identical errors within 10 minutes", async () => {
    await reportSystemError({ error_message: "dup-err xyz", page_url: "/p" }, ctx(TENANT_A, false));
    const res = await reportSystemError({ error_message: "dup-err xyz", page_url: "/p" }, ctx(TENANT_A, false));
    expect((res.data as { skipped?: boolean }).skipped).toBe(true);
  });
});

describe("fb-backfill-profiles", () => {
  it("refuses to backfill another tenant", async () => {
    const res = await fbBackfillProfiles({ tenant_id: TENANT_A }, ctx(TENANT_B, false));
    expect((res.data as { error?: string }).error).toBe("Forbidden tenant");
  });

  it("only refreshes the caller tenant's contacts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ name: "Found", profile_pic: "http://pic" }), { status: 200 }),
    );
    const res = await fbBackfillProfiles({ tenant_id: TENANT_A }, ctx(TENANT_A, false));
    const data = res.data as { success: boolean; processed: number };
    expect(data.success).toBe(true);
    expect(data.processed).toBe(1);

    // Tenant A contact updated, tenant B contact untouched.
    const a = (await dbGet("SELECT name FROM fb_contacts WHERE id = 'fc-a'")) as { name: string | null };
    const b = (await dbGet("SELECT name FROM fb_contacts WHERE id = 'fc-b'")) as { name: string | null };
    expect(a.name).toBe("Found");
    expect(b.name).toBeNull();
  });
});
