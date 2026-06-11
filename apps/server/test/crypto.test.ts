import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "../src/lib/crypto.js";

describe("lib/crypto", () => {
  beforeAll(() => {
    process.env.MASTER_KEY = randomBytes(32).toString("hex");
  });

  it("round-trips a secret", () => {
    const secret = "sk-test-1234567890abcdef";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    const secret = "same-secret";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("secret");
    const [iv, tag, data] = encrypted.split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] = flipped[0] ^ 0xff;
    const tampered = `${iv}.${tag}.${flipped.toString("base64")}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decryptSecret("not-an-encrypted-value")).toThrow(
      "Invalid encrypted secret format",
    );
  });

  it("throws a clear error when MASTER_KEY is missing", () => {
    const saved = process.env.MASTER_KEY;
    delete process.env.MASTER_KEY;
    try {
      expect(() => encryptSecret("x")).toThrow("MASTER_KEY is not configured");
    } finally {
      process.env.MASTER_KEY = saved;
    }
  });
});
