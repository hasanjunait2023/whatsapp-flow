/**
 * Flat list of content route paths — plain data, NO JSX imports, so it can be
 * imported from `vite.content.config.ts` (which is bundled without a React
 * runtime) to build the sitemap. Keep this in sync with the data maps; the
 * route table in routes.tsx is generated from the same slug sets.
 */

export const LEARN_SLUGS = ["whatsapp-crm-bangladesh"] as const;

export const COMPARE_SLUGS = ["best-whatsapp-crm-bangladesh-2026"] as const;

export const contentPaths: string[] = [
  ...LEARN_SLUGS.map((slug) => `/learn/${slug}`),
  ...COMPARE_SLUGS.map((slug) => `/compare/${slug}`),
];
