import { sqlite } from "../../db/index.js";
import { resolveLlm } from "../../llm/registry.js";
import { checkBudget, recordUsage } from "../../llm/usage.js";
import { getApprovedSystemPrompt } from "../soul/index.js";
import { gatherSnapshot } from "./report.js";

/**
 * Marketing-idea generation. v1 grounds ideas in INTERNAL data only (own stats,
 * top products, soul profile, seasonal context). Competitor web research sits
 * behind CEO_RESEARCH_ENABLED + a search API key — competitor FB scraping is
 * deliberately excluded (Meta ToS).
 */

const RESEARCH_ENABLED = (process.env.CEO_RESEARCH_ENABLED ?? "false").toLowerCase() === "true";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
const TOP_PRODUCTS = 10;
const RESEARCH_RESULTS = 5;

interface TopProduct {
  name: string;
  price: number;
  units_sold: number;
}

function topProducts(tenantId: string): TopProduct[] {
  return sqlite
    .prepare(
      `SELECT p.name, p.price, COALESCE(SUM(oi.quantity), 0) AS units_sold
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.tenant_id = p.tenant_id
       WHERE p.tenant_id = ? AND p.is_active = 1
       GROUP BY p.id ORDER BY units_sold DESC LIMIT ${TOP_PRODUCTS}`,
    )
    .all(tenantId) as TopProduct[];
}

async function webResearch(query: string): Promise<string> {
  if (!RESEARCH_ENABLED || !TAVILY_API_KEY) return "";
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: RESEARCH_RESULTS,
        search_depth: "basic",
      }),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      results?: Array<{ title?: string; content?: string }>;
    };
    return (data.results ?? [])
      .map((r) => `- ${r.title}: ${r.content?.slice(0, 300)}`)
      .join("\n");
  } catch {
    return ""; // research is best-effort garnish, never a failure cause
  }
}

const MARKETING_SYSTEM_PROMPT = `You are the tenant's CEO agent generating marketing ideas the owner can execute THIS WEEK on WhatsApp and Facebook. Ground every idea in the business's actual products, customers, and numbers — no generic advice. Each idea: a name, why it fits THIS business, and concrete first steps. 3-5 ideas, Markdown, phone-readable. Match the business's language.`;

export async function generateMarketingIdeas(tenantId: string): Promise<string> {
  checkBudget(tenantId);
  const soulPrompt = getApprovedSystemPrompt(tenantId);
  const snapshot = gatherSnapshot(tenantId, 30);
  const products = topProducts(tenantId);
  const resolved = resolveLlm(tenantId);

  const category =
    soulPrompt?.match(/a (.+?) business/)?.[1] ?? "small";
  const research = await webResearch(`${category} business marketing trends ideas`);

  const system = soulPrompt
    ? `${MARKETING_SYSTEM_PROMPT}\n\n--- Business profile (soul) ---\n${soulPrompt}`
    : MARKETING_SYSTEM_PROMPT;

  const contextBlocks = [
    `30-day business snapshot:\n${JSON.stringify(snapshot, null, 2)}`,
    `Top products by units sold:\n${JSON.stringify(products, null, 2)}`,
    `Current month: ${new Date().toISOString().slice(0, 7)}`,
  ];
  if (research) contextBlocks.push(`Market research notes (external):\n${research}`);

  const result = await resolved.provider.chat(
    {
      model: resolved.model,
      temperature: resolved.temperature ?? 0.8,
      maxTokens: 2000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Generate marketing ideas from:\n\n${contextBlocks.join("\n\n")}` },
      ],
    },
    resolved.apiKey,
  );
  recordUsage(tenantId, "ceo", resolved.provider.name, resolved.model, result.usage);

  const content = result.text?.trim();
  if (!content) throw new Error("Marketing idea generation returned no content");
  return content;
}
