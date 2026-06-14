import { Head } from "vite-react-ssg";

import { SITE_ORIGIN, TITLE_SUFFIX } from "../config";
import type { JsonLd } from "../lib/jsonld";

interface SeoProps {
  /** Page-specific title head (the suffix is appended automatically). */
  title: string;
  /** The AEO answer, < 155 chars (SEO-GEO-PLAN §4). */
  description: string;
  /** Route path beginning with "/" — used for canonical + hreflang. */
  path: string;
  /** Structured-data objects serialized into <script type="application/ld+json">. */
  jsonLd: readonly JsonLd[];
}

/**
 * Emits the per-page <head> into the PRE-RENDERED HTML (title, meta description,
 * canonical, hreflang en/bn/x-default) plus the JSON-LD blocks. vite-react-ssg's
 * <Head> runs through react-helmet on the server so the head tags land in the
 * static HTML response. react-helmet does NOT serialize <script> children, so
 * the JSON-LD is rendered directly into the document instead (valid anywhere in
 * the page, and crawlers read it from the body) — see <JsonLdScripts/>.
 */
export function Seo({ title, description, path, jsonLd }: SeoProps) {
  const canonical = `${SITE_ORIGIN}${path}`;
  const bnHref = `${SITE_ORIGIN}/bn${path}`;

  return (
    <>
      <Head>
        <title>{`${title} | ${TITLE_SUFFIX}`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        {/* hreflang en (default), bn, and x-default (SEO-GEO-PLAN §4). */}
        <link rel="alternate" hrefLang="en" href={canonical} />
        <link rel="alternate" hrefLang="bn" href={bnHref} />
        <link rel="alternate" hrefLang="x-default" href={canonical} />

        {/* Open Graph / Twitter — minimal, content-page specific. */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <JsonLdScripts jsonLd={jsonLd} />
    </>
  );
}

/** Renders the JSON-LD blocks as <script> tags into the pre-rendered HTML. */
function JsonLdScripts({ jsonLd }: { jsonLd: readonly JsonLd[] }) {
  return (
    <>
      {jsonLd.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // The objects are built from trusted, static content (config + page
          // data) — never user input — so serializing them here is safe.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}
