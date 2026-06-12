import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { signupHref, WA_SUPPORT_URL } from "./config";
import { trackPlanCtaClick } from "./tracking-events";
import { usePassedElement } from "./useLandingScroll";

interface StickyMobileCtaProps {
  /** Reveal the bar only once this element (the hero CTA row) has scrolled past. */
  triggerRef: React.RefObject<HTMLElement>;
}

/**
 * Persistent bottom CTA bar on mobile (<md). Violet primary + a single green
 * WhatsApp action — the only green button on screen at a time. Hidden on desktop
 * (the FAB covers that). Appears after the hero CTAs scroll out of view.
 */
export function StickyMobileCta({ triggerRef }: StickyMobileCtaProps) {
  const visible = usePassedElement(triggerRef);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--lp-border)] bg-[var(--lp-surface-glass)] p-3 backdrop-blur-xl transition-all [transition-duration:var(--lp-dur)] md:hidden",
        "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <a
          href={signupHref("pro")}
          onClick={() => trackPlanCtaClick("pro")}
          className="flex h-12 flex-1 items-center justify-center rounded-[var(--lp-r-md)] bg-lp-violet-500 font-semibold text-white transition-colors hover:bg-lp-violet-600"
        >
          <span lang="bn" className="bn">
            ৫ দিন ফ্রি শুরু করুন
          </span>
        </a>
        <a
          href={WA_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp support"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--lp-r-md)] bg-lp-green-500 text-[#04130a] shadow-[var(--lp-glow-green)] transition-colors hover:bg-lp-green-600"
        >
          <MessageCircle className="h-6 w-6" fill="currentColor" />
        </a>
      </div>
    </div>
  );
}
