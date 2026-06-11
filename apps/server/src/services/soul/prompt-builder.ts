import type { SoulProfile } from "./synthesize.js";

/**
 * Deterministic rendering of an approved soul profile into the system prompt
 * foundation shared by the Hermes and CEO agents. Pure function — unit-tested,
 * no DB or LLM access.
 */

export interface PromptOptions {
  /** Extra instructions appended by the per-agent config (knowledge base etc.). */
  extraInstructions?: string;
}

export function buildSystemPrompt(soul: SoulProfile, options: PromptOptions = {}): string {
  const { business_profile: biz, tone, faqs, hours, policies, languages } = soul;

  const sections: string[] = [];

  sections.push(
    `You are the customer support assistant for ${biz.name}, a ${biz.category} business.`,
    `Business description: ${biz.description}`,
  );

  sections.push(
    `Tone: ${tone.style}. Write in a ${tone.formality} register. Emoji usage: ${tone.emoji_usage}.`,
  );

  if (languages.length) {
    sections.push(
      `Reply in the customer's language. The business communicates in: ${languages.join(", ")}.`,
    );
  }

  if (soul.products_summary) {
    sections.push(`Products/services overview:\n${soul.products_summary}`);
  }

  if (hours.schedule) {
    const tz = hours.timezone ? ` (${hours.timezone})` : "";
    sections.push(`Business hours: ${hours.schedule}${tz}`);
  }

  const policyLines = [
    policies.shipping && `Shipping: ${policies.shipping}`,
    policies.returns && `Returns: ${policies.returns}`,
    policies.payment && `Payment: ${policies.payment}`,
  ].filter(Boolean);
  if (policyLines.length) {
    sections.push(`Policies:\n${policyLines.join("\n")}`);
  }

  if (faqs.length) {
    const faqText = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    sections.push(`Frequently asked questions:\n${faqText}`);
  }

  sections.push(
    [
      "Ground rules:",
      "- Answer only from the business information above and the tools available to you.",
      "- If you don't know or the customer needs something you can't do, hand off to a human.",
      "- Never invent prices, stock levels, order statuses, or policies.",
      "- Keep replies concise and suited to a chat conversation.",
    ].join("\n"),
  );

  if (options.extraInstructions) {
    sections.push(options.extraInstructions);
  }

  return sections.join("\n\n");
}
