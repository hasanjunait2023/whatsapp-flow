import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryBuilder } from "./query-builder";

/** Captures the JSON body posted to /api/query by awaiting a builder. */
function mockFetch() {
  const calls: Array<{ url: string; body: any }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
    return {
      json: async () => ({ data: [], error: null }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

describe("QueryBuilder serialization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes a select with eq, order and limit", async () => {
    const calls = mockFetch();
    await new QueryBuilder("contacts")
      .select("*")
      .eq("tenant_id", "t1")
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/query");
    const body = calls[0].body;
    expect(body.table).toBe("contacts");
    expect(body.op).toBe("select");
    expect(body.filters).toEqual([
      { column: "tenant_id", operator: "eq", value: "t1" },
      { column: "is_archived", operator: "eq", value: false },
    ]);
    expect(body.order).toEqual([
      { column: "last_message_at", ascending: false, nullsFirst: false },
    ]);
    expect(body.limit).toBe(50);
    expect(body.returning).toBe(true);
  });

  it("serializes an update with a filter and no implicit returning", async () => {
    const calls = mockFetch();
    await new QueryBuilder("contacts").update({ unread_count: 0 }).eq("id", "c1");

    const body = calls[0].body;
    expect(body.op).toBe("update");
    expect(body.values).toEqual({ unread_count: 0 });
    expect(body.filters).toEqual([{ column: "id", operator: "eq", value: "c1" }]);
    expect(body.returning).toBe(false);
  });

  it("marks returning when .select() follows a mutation", async () => {
    const calls = mockFetch();
    await new QueryBuilder("tenants")
      .insert({ name: "X", owner_id: "u" })
      .select()
      .single();

    const body = calls[0].body;
    expect(body.op).toBe("insert");
    expect(body.returning).toBe(true);
    expect(body.single).toBe(true);
  });

  it("serializes in, range, and maybeSingle", async () => {
    const calls = mockFetch();
    await new QueryBuilder("messages")
      .select("*")
      .in("contact_id", ["a", "b"])
      .range(0, 9)
      .maybeSingle();

    const body = calls[0].body;
    expect(body.filters).toEqual([
      { column: "contact_id", operator: "in", value: ["a", "b"] },
    ]);
    expect(body.rangeFrom).toBe(0);
    expect(body.rangeTo).toBe(9);
    expect(body.maybeSingle).toBe(true);
  });

  it("serializes not(col,is,null) with the negated operator", async () => {
    const calls = mockFetch();
    await new QueryBuilder("contacts").select("*").not("last_message_at", "is", null);

    const body = calls[0].body;
    expect(body.filters).toEqual([
      {
        column: "last_message_at",
        operator: "not",
        value: null,
        negatedOperator: "is",
      },
    ]);
  });
});
