import { useEffect, useRef } from "react";

import { trackPageView } from "@/lib/tracking";

import {
  Nav,
  Hero,
  TrustStrip,
  PainPanels,
  DataOwnership,
  HowItWorks,
  FeatureSpotlights,
  SocialProof,
  Integrations,
  Pricing,
  Faq,
  FinalCta,
  Footer,
  StickyMobileCta,
  LandingWhatsAppFab,
  PixelScripts,
} from "@/components/landing";

import "@/styles/landing.css";

/**
 * Public marketing landing page (`/` for logged-out visitors). Self-contained dark
 * surface scoped under `.lp` — independent of the app's theme / color schemes.
 * See apps/web/LANDING_DESIGN.md.
 */
export default function Landing() {
  const heroCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackPageView();
    // Smooth in-page anchor scrolling for nav links, scoped to this page lifecycle.
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className="lp min-h-screen">
      <PixelScripts />

      {/* Skip link — first in DOM, visible on focus */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-[var(--lp-r-md)] focus:bg-lp-violet-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main" className="pb-20 md:pb-0">
        <Hero ctaRef={heroCtaRef} />
        <TrustStrip />
        <PainPanels />
        <DataOwnership />
        <HowItWorks />
        <FeatureSpotlights />
        <SocialProof />
        <Integrations />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>

      <Footer />

      <StickyMobileCta triggerRef={heroCtaRef} />
      <LandingWhatsAppFab />
    </div>
  );
}
