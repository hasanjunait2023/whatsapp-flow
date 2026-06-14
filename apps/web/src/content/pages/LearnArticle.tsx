import { Layout } from "../components/Layout";
import { Seo } from "../components/Seo";
import { CtaBlock, FaqSection, PageHeader, Section } from "../components/sections";
import {
  breadcrumbList,
  faqPage,
  organization,
  softwareApplication,
  type JsonLd,
} from "../lib/jsonld";
import type { LearnPage } from "../data/types";

/**
 * Renders a single /learn article from its data object. One component drives
 * the pillar and every supporting page; the JSON-LD set is assembled from the
 * page's schema flags so each page emits exactly what SEO-GEO-PLAN §3 requires.
 */
export function LearnArticle({ page }: { page: LearnPage }) {
  const { meta } = page;

  const jsonLd: JsonLd[] = [];
  if (meta.schema.organization) jsonLd.push(organization());
  if (meta.schema.softwareApplication) jsonLd.push(softwareApplication());
  if (meta.schema.faq && page.faq.length) jsonLd.push(faqPage(page.faq));
  if (meta.schema.breadcrumb) jsonLd.push(breadcrumbList(meta.breadcrumbs));

  return (
    <Layout crumbs={meta.breadcrumbs}>
      <Seo
        title={meta.title}
        description={meta.description}
        path={meta.path}
        jsonLd={jsonLd}
      />

      <article>
        <PageHeader kicker={meta.kicker} title={meta.title} lead={page.lead} />

        {page.sections.map((section) => (
          <Section key={section.id} id={section.id} title={section.heading}>
            {section.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </Section>
        ))}

        {page.faq.length > 0 && <FaqSection items={page.faq} />}

        <CtaBlock headline={page.ctaHeadline} />
      </article>
    </Layout>
  );
}
