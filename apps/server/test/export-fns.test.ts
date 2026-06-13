import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, contacts, orders, contactLabels } = await import("../src/db/schema.js");
const { labels } = await import("../src/db/schema-modules.js");
const { EXPORT_HANDLERS } = await import("../src/routes/export-fns.js");
const { escapeCsvCell, toCsv } = await import("../src/services/export/csv.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null): FnContext {
  return { userId: "u", tenantId, isAdmin: false };
}

/** Parses a CSV produced by toCsv (CRLF rows) into a rows-of-cells array. */
function parseCsv(csv: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" && csv[i + 1] === "\n") {
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
      i += 1;
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  out.push(row);
  return out;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await db.delete(contactLabels);
  await db.delete(labels);
  await db.delete(contacts);
  await db.delete(orders);
  await db.delete(tenants);
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "ua" },
    { id: TENANT_B, name: "B", owner_id: "ub" },
  ]);
});

describe("CSV escaping", () => {
  it("quotes cells containing commas, quotes, and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("round-trips a header + rows with embedded delimiters", () => {
    const csv = toCsv(["name", "note"], [["Doe, John", 'has "quotes"\nand newline']]);
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual(["name", "note"]);
    expect(parsed[1]).toEqual(["Doe, John", 'has "quotes"\nand newline']);
  });
});

describe("export-contacts", () => {
  it("returns only the caller's contacts with labels, never another tenant's", async () => {
    await db.insert(contacts).values([
      {
        id: "c-a1",
        tenant_id: TENANT_A,
        name: "Alice",
        phone_number: "8801711000001",
        wa_id: "8801711000001@s.whatsapp.net",
      },
      {
        id: "c-b1",
        tenant_id: TENANT_B,
        name: "Bob (other tenant)",
        phone_number: "8801711000099",
        wa_id: "8801711000099@s.whatsapp.net",
      },
    ]);
    await db.insert(labels).values({ id: "l-a1", tenant_id: TENANT_A, name: "VIP" });
    await db.insert(contactLabels).values({ contact_id: "c-a1", label_id: "l-a1" });

    const res = await EXPORT_HANDLERS["export-contacts"]({}, ctx(TENANT_A));
    expect(res.error).toBeNull();
    const data = res.data as { filename: string; csv: string; count: number };
    expect(data.count).toBe(1);
    expect(data.filename).toMatch(/^contacts-\d{4}-\d{2}-\d{2}\.csv$/);

    const rows = parseCsv(data.csv);
    expect(rows[0]).toContain("phone_number");
    // exactly one data row (header + 1)
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe("Alice");
    expect(data.csv).not.toContain("Bob (other tenant)");
    // labels column populated from the tenant's label
    const labelsIdx = rows[0].indexOf("labels");
    expect(rows[1][labelsIdx]).toBe("VIP");
  });

  it("escapes a contact name containing a comma in the CSV output", async () => {
    await db.insert(contacts).values({
      id: "c-a2",
      tenant_id: TENANT_A,
      name: "Doe, John",
      phone_number: "8801711000002",
      wa_id: "8801711000002@s.whatsapp.net",
    });

    const res = await EXPORT_HANDLERS["export-contacts"]({}, ctx(TENANT_A));
    const data = res.data as { csv: string };
    expect(data.csv).toContain('"Doe, John"');
    const rows = parseCsv(data.csv);
    expect(rows[1][0]).toBe("Doe, John");
  });

  it("fails cleanly without an active tenant", async () => {
    const res = await EXPORT_HANDLERS["export-contacts"]({}, ctx(null));
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe("No active tenant");
  });
});

describe("export-orders", () => {
  it("returns only the caller's orders, excluding cross-tenant rows", async () => {
    await db.insert(orders).values([
      {
        id: "o-a1",
        tenant_id: TENANT_A,
        order_number: "A-1001",
        customer_name: "Alice",
        status: "confirmed",
        payment_status: "paid",
        subtotal: 500,
        total: 520,
      },
      {
        id: "o-b1",
        tenant_id: TENANT_B,
        order_number: "B-2001",
        customer_name: "Bob",
        status: "pending",
        payment_status: "unpaid",
        subtotal: 100,
        total: 100,
      },
    ]);

    const res = await EXPORT_HANDLERS["export-orders"]({}, ctx(TENANT_A));
    expect(res.error).toBeNull();
    const data = res.data as { csv: string; count: number };
    expect(data.count).toBe(1);

    const rows = parseCsv(data.csv);
    expect(rows[0]).toContain("order_number");
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe("A-1001");
    expect(data.csv).not.toContain("B-2001");
    expect(data.csv).not.toContain("Bob");
  });

  it("fails cleanly without an active tenant", async () => {
    const res = await EXPORT_HANDLERS["export-orders"]({}, ctx(null));
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe("No active tenant");
  });
});
