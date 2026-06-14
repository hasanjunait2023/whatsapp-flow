import { ComparisonTable } from "../components/ComparisonTable";
import { Layout } from "../components/Layout";
import { Seo } from "../components/Seo";
import { CtaBlock, FaqSection, PageHeader } from "../components/sections";
import { breadcrumbList, faqPage, type JsonLd } from "../lib/jsonld";
import type { ComparePage } from "../data/compare";

/**
 * Renders a single /compare page from its data object: answer-first intro, the
 * honest comparison matrix, a verdict, and FAQPage JSON-LD (SEO-GEO-PLAN §2–3).
 */
export function CompareArticle({ page }: { page: ComparePage }) {
  const jsonLd: JsonLd[] = [];
  if (page.schema.faq && page.faq.length) jsonLd.push(faqPage(page.faq));
  if (page.schema.breadcrumb) jsonLd.push(breadcrumbList(page.breadcrumbs));

  return (
    <Layout crumbs={page.breadcrumbs}>
      <Seo
        title={page.title}
        description={page.description}
        path={page.path}
        jsonLd={jsonLd}
      />

      <article>
        <PageHeader kicker={page.kicker} title={page.title} lead={page.lead} />

        <ComparisonTable caption={page.tableCaption} columns={page.columns} rows={page.rows} />

        <div className="prose-bd mt-8 space-y-4">
          {page.verdict.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {page.faq.length > 0 && <FaqSection items={page.faq} />}

        <CtaBlock headline={page.ctaHeadline} />
      </article>
    </Layout>
  );
}
