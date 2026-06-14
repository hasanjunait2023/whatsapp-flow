import type { ReactNode } from "react";

import { signupHref, WA_SUPPORT_URL } from "../config";
import type { FaqItem } from "../lib/jsonld";

/**
 * Reusable, presentational building blocks shared by every content page.
 * Keeping the page surface as data + these primitives is what lets the
 * remaining ~16 pages (SEO-GEO-PLAN §1–2) be added as plain data entries.
 */

/** Page H1 + answer-first lead paragraph (the AEO answer crawlers quote). */
export function PageHeader({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: ReactNode;
  lead: ReactNode;
}) {
  return (
    <header className="mb-10">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-lp-violet-400">
        {kicker}
      </p>
      <h1 className="lp-display max-w-[20ch] text-balance text-3xl font-bold leading-tight text-lp-text md:text-[var(--lp-text-h2)]">
        {title}
      </h1>
      <div
        className="prose-bd mt-5 rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-5 text-[var(--lp-text-lead)] leading-relaxed text-lp-text md:p-6"
        // Answer-first: the first thing on the page, on a solid plate so Bangla
        // never sits on a gradient (Bangla legibility rule 3).
      >
        {lead}
      </div>
    </header>
  );
}

/** A titled long-form section with a stable id for in-page anchors. */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="text-2xl font-semibold text-lp-text md:text-[1.75rem]">
        {title}
      </h2>
      <div className="prose-bd mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** FAQ list — semantic, also the source for FAQPage JSON-LD on the page. */
export function FaqSection({ items }: { items: readonly FaqItem[] }) {
  return (
    <section aria-labelledby="faq" className="mt-12">
      <h2 id="faq" className="text-2xl font-semibold text-lp-text md:text-[1.75rem]">
        Frequently asked questions
      </h2>
      <dl className="mt-4 divide-y divide-[var(--lp-border)] rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-[var(--lp-surface)]">
        {items.map((item) => (
          <div key={item.question} className="p-5 md:p-6">
            <dt className="font-semibold text-lp-text">{item.question}</dt>
            <dd className="prose-bd mt-2 text-lp-muted">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Closing CTA — signup + WhatsApp, World B violet/green. */
export function CtaBlock({ headline }: { headline: ReactNode }) {
  return (
    <section className="mt-16 rounded-[var(--lp-r-xl)] border border-[var(--lp-border)] bg-[var(--lp-surface-2)] p-8 text-center md:p-10">
      <h2 className="text-2xl font-bold text-lp-text md:text-[1.75rem]">{headline}</h2>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={signupHref("pro")}
          className="rounded-[var(--lp-r-pill)] px-6 py-3 font-semibold transition-colors"
          style={{ background: "var(--lp-accent)", color: "#fff" }}
        >
          Start 5-day free trial
        </a>
        <a
          href={WA_SUPPORT_URL}
          className="rounded-[var(--lp-r-pill)] px-6 py-3 font-semibold transition-colors"
          style={{ background: "var(--lp-green-500)", color: "var(--lp-on-green)" }}
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
