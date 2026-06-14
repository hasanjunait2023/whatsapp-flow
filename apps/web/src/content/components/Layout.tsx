import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BRAND_NAME, signupHref } from "../config";
import type { Crumb } from "../lib/jsonld";

interface LayoutProps {
  /** Visible breadcrumb trail (also drives BreadcrumbList JSON-LD in the page). */
  crumbs: readonly Crumb[];
  children: ReactNode;
}

/**
 * Shared chrome for every pre-rendered content page: World B (.lp) root,
 * a minimal marketing nav, a visible breadcrumb, the article body, and a
 * footer. Pure presentational — no app providers, no client-only APIs — so it
 * renders identically at build time and after hydration.
 */
export function Layout({ crumbs, children }: LayoutProps) {
  return (
    <div className="lp min-h-screen" data-theme="dark">
      <header className="border-b border-[var(--lp-border)]">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4 md:px-6"
        >
          <a href="/home" className="flex items-center gap-2 font-semibold text-lp-text">
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-[10px] text-sm font-bold"
              style={{ background: "var(--lp-accent)", color: "#fff" }}
            >
              W
            </span>
            {BRAND_NAME}
          </a>
          <a
            href={signupHref("pro")}
            className="rounded-[var(--lp-r-pill)] px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: "var(--lp-accent)", color: "#fff" }}
          >
            Start free
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 md:px-6">
        <Breadcrumb crumbs={crumbs} />
        {children}
      </main>

      <footer className="border-t border-[var(--lp-border)]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-5 py-8 text-sm text-lp-dim md:px-6">
          <p>
            {BRAND_NAME} — WhatsApp CRM for Bangladeshi sellers. One inbox for WhatsApp,
            Facebook &amp; Instagram, Bangla AI replies, bKash/Nagad and Pathao/RedX/Steadfast
            courier booking.
          </p>
          <p>
            <a href="/home" className="hover:text-lp-text">
              Home
            </a>{" "}
            ·{" "}
            <Link to="/learn/whatsapp-crm-bangladesh" className="hover:text-lp-text">
              WhatsApp CRM Bangladesh
            </Link>{" "}
            ·{" "}
            <Link to="/compare/best-whatsapp-crm-bangladesh-2026" className="hover:text-lp-text">
              Best WhatsApp CRM 2026
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Breadcrumb({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-lp-dim">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="text-lp-muted">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link to={crumb.path} className="hover:text-lp-text">
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
