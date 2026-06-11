import { describe, it, expect, vi } from "vitest";
import { WahaClient, sessionNameForInstance } from "../src/waha/client.js";

/**
 * WAHA client tests: session-name mapping (single-session pilot mode) and the
 * request shapes for createSession / sendText against a mocked fetch.
 */

describe("sessionNameForInstance", () => {
  it("maps every instance id to 'default' in single-session mode (pilot)", () => {
    // WAHA_SINGLE_SESSION defaults to true in tests (no env override).
    expect(sessionNameForInstance("abc-123")).toBe("default");
    expect(sessionNameForInstance("xyz-789")).toBe("default");
  });
});

describe("WahaClient", () => {
  function mockFetch(status: number, body: unknown) {
    return vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  it("sends the X-Api-Key header and JSON body on sendText", async () => {
    const fetchImpl = mockFetch(200, { id: "true_555_ABC" });
    const client = new WahaClient({ baseUrl: "http://waha:3000", apiKey: "secret", fetchImpl });

    const result = await client.sendText({ session: "default", chatId: "555@c.us", text: "hi" });

    expect(result.id).toBe("true_555_ABC");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://waha:3000/api/sendText");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["X-Api-Key"]).toBe("secret");
    expect(JSON.parse(init?.body as string)).toMatchObject({ chatId: "555@c.us", text: "hi" });
  });

  it("uses PUT for the default session on createSession (Core upsert)", async () => {
    const fetchImpl = mockFetch(200, { name: "default", status: "STOPPED" });
    const client = new WahaClient({ baseUrl: "http://waha:3000", apiKey: "k", fetchImpl });

    await client.createSession("default", "http://app/api/waha/webhook/i1", ["message"]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://waha:3000/api/sessions/default");
    expect(init?.method).toBe("PUT");
    const sent = JSON.parse(init?.body as string);
    expect(sent.config.webhooks[0].url).toBe("http://app/api/waha/webhook/i1");
    expect(sent.config.webhooks[0].events).toEqual(["message"]);
  });

  it("POSTs a new session in Plus mode (named session)", async () => {
    const fetchImpl = mockFetch(201, { name: "i1", status: "STARTING" });
    const client = new WahaClient({ baseUrl: "http://waha:3000", apiKey: "k", fetchImpl });

    await client.createSession("i1", "http://app/api/waha/webhook/i1", ["message"]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://waha:3000/api/sessions");
    expect(init?.method).toBe("POST");
  });

  it("throws WahaError on a non-2xx response", async () => {
    const fetchImpl = mockFetch(422, { error: "Session status is not as expected" });
    const client = new WahaClient({ baseUrl: "http://waha:3000", apiKey: "k", fetchImpl });

    await expect(
      client.sendText({ session: "default", chatId: "1@c.us", text: "x" }),
    ).rejects.toMatchObject({ name: "WahaError", status: 422 });
  });
});
