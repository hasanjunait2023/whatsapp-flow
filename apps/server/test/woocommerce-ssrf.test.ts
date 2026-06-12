import { describe, it, expect, vi, afterEach } from "vitest";

// Default: resolve to a private address so DNS-based hosts are rejected.
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "10.0.0.5", family: 4 }],
}));

const { verifyCreds } = await import("../src/services/woocommerce/client.js");

const creds = (storeUrl: string) => ({ storeUrl, consumerKey: "ck", consumerSecret: "cs" });

afterEach(() => vi.unstubAllGlobals());

describe("WooCommerce SSRF guard", () => {
  it("rejects a literal loopback host before any fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(verifyCreds(creds("http://127.0.0.1/wp-json"))).rejects.toThrow(/private address/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private (RFC1918) address", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(verifyCreds(creds("https://intranet.attacker.test"))).rejects.toThrow(/private address/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects localhost by name", async () => {
    await expect(verifyCreds(creds("http://localhost:9000"))).rejects.toThrow(/not allowed/i);
  });

  it("rejects a non-http(s) scheme", async () => {
    await expect(verifyCreds(creds("file:///etc/passwd"))).rejects.toThrow(/http/i);
  });

  it("rejects CR/LF injection in credentials", async () => {
    // Public host so the SSRF check passes; the auth header build must reject CRLF.
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      verifyCreds({ storeUrl: "http://127.0.0.1", consumerKey: "ck\r\nX-Evil: 1", consumerSecret: "cs" }),
    ).rejects.toThrow();
  });
});
