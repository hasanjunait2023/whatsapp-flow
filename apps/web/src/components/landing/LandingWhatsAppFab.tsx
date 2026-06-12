import { MessageCircle } from "lucide-react";

import { WA_SUPPORT_URL } from "./config";

/**
 * Floating WhatsApp action — desktop only (mobile uses the sticky CTA bar, so we
 * keep ≤1 floating green element). Green is reserved for this success/WhatsApp
 * action per LANDING_DESIGN.md §1.3 / §3.13.
 */
export function LandingWhatsAppFab() {
  return (
    <a
      href={WA_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp support"
      className="group fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-lp-green-500 text-[#04130a] shadow-[var(--lp-glow-green)] transition-transform [transition-duration:var(--lp-dur)] hover:scale-105 md:flex"
    >
      <MessageCircle className="h-7 w-7" fill="currentColor" />
      <span
        className="absolute -z-10 h-full w-full animate-ping rounded-full bg-lp-green-500 opacity-25"
        aria-hidden="true"
      />
    </a>
  );
}
