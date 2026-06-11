import * as cheerio from "cheerio";
import robotsParser from "robots-parser";

/**
 * Same-origin website crawl for soul ingestion. Bounded: max pages, max depth,
 * per-page size cap, robots.txt respected. Pages whose path hints at business
 * info (/about, /faq, /pricing, ...) are visited first.
 */

const MAX_PAGES = 20;
const MAX_DEPTH = 2;
const MAX_TOTAL_CHARS = 100_000;
const MAX_PAGE_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "WhatsAppFlowSoulBot/1.0";

const PRIORITY_PATHS = [
  "about",
  "faq",
  "help",
  "pricing",
  "contact",
  "products",
  "services",
  "shipping",
  "returns",
  "policy",
  "policies",
  "terms",
];

function pathPriority(url: URL): number {
  const path = url.pathname.toLowerCase();
  const idx = PRIORITY_PATHS.findIndex((p) => path.includes(p));
  return idx === -1 ? PRIORITY_PATHS.length : idx;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, nav, footer, iframe").remove();
  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const body = $("body").text().replace(/\s+/g, " ").trim();
  return [title, metaDesc, body].filter(Boolean).join("\n").slice(0, MAX_PAGE_CHARS);
}

function extractLinks($: cheerio.CheerioAPI, base: URL): URL[] {
  const links: URL[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, base);
      url.hash = "";
      if (url.origin === base.origin) links.push(url);
    } catch {
      // skip unparseable hrefs
    }
  });
  return links;
}

export interface CrawlResult {
  text: string;
  pagesVisited: number;
}

export async function crawlWebsite(startUrl: string): Promise<CrawlResult> {
  const start = new URL(startUrl);
  if (start.protocol !== "http:" && start.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }

  let isAllowed: (url: string) => boolean = () => true;
  try {
    const robotsUrl = `${start.origin}/robots.txt`;
    const res = await fetchWithTimeout(robotsUrl);
    if (res.ok) {
      const robots = robotsParser(robotsUrl, await res.text());
      isAllowed = (url) => robots.isAllowed(url, USER_AGENT) !== false;
    }
  } catch {
    // unreachable robots.txt -> assume allowed
  }

  const visited = new Set<string>();
  const queue: Array<{ url: URL; depth: number }> = [{ url: start, depth: 0 }];
  const chunks: string[] = [];
  let totalChars = 0;

  while (queue.length > 0 && visited.size < MAX_PAGES && totalChars < MAX_TOTAL_CHARS) {
    queue.sort((a, b) => pathPriority(a.url) - pathPriority(b.url) || a.depth - b.depth);
    const { url, depth } = queue.shift()!;
    const key = url.href;
    if (visited.has(key) || !isAllowed(key)) continue;
    visited.add(key);

    let html: string;
    try {
      const res = await fetchWithTimeout(key);
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/html")) continue;
      html = await res.text();
    } catch {
      continue;
    }

    const $ = cheerio.load(html);
    const text = extractText($);
    if (text) {
      chunks.push(`## ${url.pathname}\n${text}`);
      totalChars += text.length;
    }

    if (depth < MAX_DEPTH) {
      for (const link of extractLinks($, url)) {
        if (!visited.has(link.href)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return {
    text: chunks.join("\n\n").slice(0, MAX_TOTAL_CHARS),
    pagesVisited: visited.size,
  };
}
