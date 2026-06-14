import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync } from "node:fs";

import { SITE_ORIGIN } from "./src/content/config";
import { contentPaths } from "./src/content/slugs";

/**
 * Vite config for the ISOLATED content SSG build (/learn, /compare).
 *
 * Run via `vite-react-ssg build -c vite.content.config.ts` (see package.json
 * `build:content`). Completely separate from the SPA's `vite.config.ts`:
 *   - `htmlEntry: content.html` — its own template + entry, not index.html.
 *   - `emptyOutDir: false` so it overlays HTML into the SPA's dist/ without
 *     deleting the already-built SPA. The SPA build MUST run first.
 *   - No CRM manualChunks — content pages stay lean (CWV, SEO-GEO-PLAN §4).
 *   - `onFinished` emits sitemap.xml for the content routes.
 */

/** Pillar gets priority 1.0, comparison pages 0.9 (SEO-GEO-PLAN §4). */
function priorityFor(routePath: string): string {
  if (routePath === "/learn/whatsapp-crm-bangladesh") return "1.0";
  if (routePath.startsWith("/compare/")) return "0.9";
  return "0.8";
}

function buildSitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = contentPaths
    .map(
      (routePath) =>
        `  <url>\n` +
        `    <loc>${SITE_ORIGIN}${routePath}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>${priorityFor(routePath)}</priority>\n` +
        `  </url>`,
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}

export default defineConfig({
  plugins: [react()],
  build: {
    // Overlay onto the SPA dist rather than replacing it.
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  // Consumed by vite-react-ssg.
  ssgOptions: {
    script: "async",
    htmlEntry: "content.html",
    entry: "src/content/content-main.tsx",
    dirStyle: "nested",
    onFinished: (dir: string) => {
      writeFileSync(path.join(dir, "sitemap.xml"), buildSitemap(), "utf-8");
    },
  },
});
