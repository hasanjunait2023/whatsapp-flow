import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { facebookPages } from "../../db/schema.js";

/**
 * Facebook page ingestion via the Graph API, using the tenant's connected page
 * token from facebook_pages. There is deliberately NO scraping fallback for
 * pages without a token (Meta ToS); the website crawl is the tokenless source.
 */

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION ?? "v18.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const POSTS_LIMIT = 50;
const MAX_CHARS = 100_000;

interface GraphPage {
  name?: string;
  about?: string;
  description?: string;
  category?: string;
  phone?: string;
  emails?: string[];
  website?: string;
  hours?: Record<string, string>;
  location?: { street?: string; city?: string; country?: string };
  error?: { message?: string };
}

interface GraphPosts {
  data?: Array<{ message?: string; created_time?: string }>;
  error?: { message?: string };
}

export interface FacebookIngestResult {
  text: string;
  pageName: string;
}

/** Finds a connected page for the tenant (specific page id or the default). */
export function findConnectedPage(
  tenantId: string,
  pageId?: string,
): { id: string; page_id: string; page_access_token: string; page_name: string } | undefined {
  const conds = pageId
    ? and(eq(facebookPages.tenant_id, tenantId), eq(facebookPages.page_id, pageId))
    : eq(facebookPages.tenant_id, tenantId);
  const rows = db
    .select({
      id: facebookPages.id,
      page_id: facebookPages.page_id,
      page_access_token: facebookPages.page_access_token,
      page_name: facebookPages.page_name,
      is_default: facebookPages.is_default,
    })
    .from(facebookPages)
    .where(conds)
    .all();
  return rows.find((r) => r.is_default) ?? rows[0];
}

export async function ingestFacebookPage(
  tenantId: string,
  pageId?: string,
): Promise<FacebookIngestResult> {
  const page = findConnectedPage(tenantId, pageId);
  if (!page) {
    throw new Error(
      "No connected Facebook page found. Connect a page first, or rely on website ingestion.",
    );
  }

  const fields = "name,about,description,category,phone,emails,website,hours,location";
  const infoRes = await fetch(
    `${GRAPH_BASE}/${encodeURIComponent(page.page_id)}?fields=${fields}&access_token=${encodeURIComponent(page.page_access_token)}`,
  );
  const info = (await infoRes.json()) as GraphPage;
  if (!infoRes.ok) {
    throw new Error(`Graph API page fetch failed: ${info.error?.message ?? infoRes.status}`);
  }

  const postsRes = await fetch(
    `${GRAPH_BASE}/${encodeURIComponent(page.page_id)}/posts?limit=${POSTS_LIMIT}&fields=message,created_time&access_token=${encodeURIComponent(page.page_access_token)}`,
  );
  const posts = (await postsRes.json()) as GraphPosts;

  const parts: string[] = ["# Facebook Page"];
  if (info.name) parts.push(`Name: ${info.name}`);
  if (info.category) parts.push(`Category: ${info.category}`);
  if (info.about) parts.push(`About: ${info.about}`);
  if (info.description) parts.push(`Description: ${info.description}`);
  if (info.phone) parts.push(`Phone: ${info.phone}`);
  if (info.emails?.length) parts.push(`Emails: ${info.emails.join(", ")}`);
  if (info.website) parts.push(`Website: ${info.website}`);
  if (info.hours) parts.push(`Hours: ${JSON.stringify(info.hours)}`);
  if (info.location) parts.push(`Location: ${JSON.stringify(info.location)}`);

  const postMessages = (posts.data ?? [])
    .map((p) => p.message?.trim())
    .filter((m): m is string => Boolean(m));
  if (postMessages.length) {
    parts.push("\n# Recent Posts");
    parts.push(...postMessages.map((m) => `- ${m}`));
  }

  return {
    text: parts.join("\n").slice(0, MAX_CHARS),
    pageName: info.name ?? page.page_name,
  };
}
