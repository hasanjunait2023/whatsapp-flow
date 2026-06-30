export interface Crumb {
  path: string;
  name: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ArticleMeta {
  title: string;
  description: string;
  path: string;
  kicker: string;
  breadcrumbs: readonly Crumb[];
  schema: {
    organization?: boolean;
    softwareApplication?: boolean;
    faq?: boolean;
    breadcrumb?: boolean;
  };
}

export interface LearnPage {
  meta: ArticleMeta;
  lead: string;
  sections: Array<{
    id: string;
    heading: string;
    body: string[];
  }>;
  faq: FaqItem[];
  ctaHeadline: string;
}

export type Cell = "yes" | "no" | string;

export interface ComparisonColumn {
  name: string;
  highlight?: boolean;
}

export interface ComparisonRow {
  dimension: string;
  cells: readonly Cell[];
}

export interface ComparePage {
  title: string;
  description: string;
  path: string;
  kicker: string;
  breadcrumbs: readonly Crumb[];
  lead: string;
  tableCaption: string;
  columns: readonly ComparisonColumn[];
  rows: readonly ComparisonRow[];
  verdict: string[];
  faq: FaqItem[];
  ctaHeadline: string;
  schema: {
    faq?: boolean;
    breadcrumb?: boolean;
  };
}