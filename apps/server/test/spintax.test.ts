import { describe, it, expect } from "vitest";
import { renderSpintax, personalize, renderMessage, hasVariation } from "../src/lib/spintax.js";

describe("renderSpintax", () => {
  it("picks one option from a spin group", () => {
    // rand=0 → first option
    const out = renderSpintax("{Hi|Hello|Hey} there", () => 0);
    expect(out).toBe("Hi there");
  });

  it("picks the last option when rand approaches 1", () => {
    const out = renderSpintax("{Hi|Hello|Hey} there", () => 0.99);
    expect(out).toBe("Hey there");
  });

  it("leaves non-spin braces (merge fields) intact", () => {
    const out = renderSpintax("{Hi|Hello} {first_name}", () => 0);
    expect(out).toBe("Hi {first_name}");
  });

  it("produces different variants across calls", () => {
    const seqs = [0, 0.99].map((r) => renderSpintax("{a|b}", () => r));
    expect(seqs[0]).not.toBe(seqs[1]);
  });
});

describe("personalize", () => {
  it("fills first_name from the first token of the name", () => {
    expect(personalize("Hi {first_name}", { name: "Rahim Uddin" })).toBe("Hi Rahim");
  });

  it("falls back to 'there' when name is missing", () => {
    expect(personalize("Hi {first_name}", { name: null })).toBe("Hi there");
  });

  it("fills {name} and {phone}", () => {
    expect(personalize("{name} {phone}", { name: "A B", phone_number: "8801" })).toBe("A B 8801");
  });
});

describe("renderMessage", () => {
  it("applies spintax then merge fields", () => {
    const out = renderMessage("{Hi|Hello} {first_name}!", { name: "Karim" }, () => 0);
    expect(out).toBe("Hi Karim!");
  });
});

describe("hasVariation", () => {
  it("is true for spin groups and merge fields", () => {
    expect(hasVariation("{a|b}")).toBe(true);
    expect(hasVariation("Hi {first_name}")).toBe(true);
  });
  it("is false for static text", () => {
    expect(hasVariation("Hello everyone")).toBe(false);
  });
});
