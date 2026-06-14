import type { RouteRecord } from "vite-react-ssg";

import { CompareArticle } from "./pages/CompareArticle";
import { LearnArticle } from "./pages/LearnArticle";
import { comparePages } from "./data/compare";
import { learnPages } from "./data/learn";

/**
 * Route table for the isolated content SSG build. Every /learn and /compare
 * slug in the data maps becomes a pre-rendered static route. Adding a page is
 * data-only: append an entry to data/learn.tsx or data/compare.tsx and it
 * shows up here automatically.
 *
 * `entry` is set so vite-react-ssg knows which module to render per route.
 */
const learnRoutes: RouteRecord[] = Object.entries(learnPages).map(([slug, page]) => ({
  path: `/learn/${slug}`,
  element: <LearnArticle page={page} />,
  entry: "src/content/pages/LearnArticle.tsx",
}));

const compareRoutes: RouteRecord[] = Object.entries(comparePages).map(([slug, page]) => ({
  path: `/compare/${slug}`,
  element: <CompareArticle page={page} />,
  entry: "src/content/pages/CompareArticle.tsx",
}));

export const routes: RouteRecord[] = [...learnRoutes, ...compareRoutes];
