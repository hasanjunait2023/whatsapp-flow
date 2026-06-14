/**
 * JSON-LD builders for the content pages. Each returns a plain object that the
 * page serializes into a <script type="application/ld+json"> inside <Head>, so
 * the structured data lands in the pre-rendered HTML (not React-injected post
 * hydration) — the requirement from SEO-GEO-PLAN §3.
 */
import { SITE_ORIGIN, BRAND_NAME, BRAND_LEGAL, PLANS, SAME_AS } from "../config";

export type JsonLd = Record<string, unknown>;

const abs = (path: string): string => `${SITE_ORIGIN}${path}`;

/** Site-wide Organization (areaServed Bangladesh, sameAs socials). */
export function organization(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: BRAND_NAME,
    legalName: BRAND_LEGAL,
    url: SITE_ORIGIN,
    logo: abs("/favicon.png"),
    areaServed: { "@type": "Country", name: "Bangladesh" },
    sameAs: SAME_AS,
  };
}

/** SoftwareApplication with BDT Offers (Starter/Pro/Business). */
export function softwareApplication(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description:
      "WhatsApp CRM for Bangladeshi sellers — one inbox for WhatsApp, Facebook and Instagram, Bangla AI auto-reply, bKash/Nagad order capture and Pathao/RedX/Steadfast courier booking.",
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: `${plan.name} plan`,
      price: String(plan.price),
      priceCurrency: "BDT",
      category: "monthly subscription",
    })),
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPage(items: readonly FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: readonly Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: abs(crumb.path),
    })),
  };
}
