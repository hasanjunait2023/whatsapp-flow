import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

/**
 * Public contact address surfaced across all legal/compliance pages.
 * Single source of truth — change here to update Privacy, Terms and Data Deletion.
 */
export const LEGAL_CONTACT_EMAIL = 'support@ecomex.cloud';

interface LegalLayoutProps {
  title: string;
  /** Hardcoded display string, e.g. "14 June 2026". Do not derive from new Date(). */
  lastUpdated?: string;
  children: ReactNode;
}

/**
 * Shared chrome for the public (no-auth) legal pages: Privacy, Terms, Data
 * Deletion. Renders fully logged-out — it depends on no auth/tenant context.
 */
export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0" aria-label="Ecomex home">
            <AppLogo size="md" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="space-y-2 mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>

          <div className="space-y-8 text-[15px] leading-relaxed text-foreground/90">
            {children}
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ecomex. All rights reserved.
          </p>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/data-deletion" className="hover:text-foreground transition-colors">
              Data Deletion
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Section heading used inside legal documents. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}
