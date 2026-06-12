import { ArrowRight } from "lucide-react";

import { signupHref, WA_SUPPORT_URL } from "./config";
import { trackPlanCtaClick } from "./tracking-events";
import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { LpButton } from "./ui/LpButton";

export function FinalCta() {
  return (
    <SectionShell labelledBy="final-cta-heading">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-[var(--lp-r-xl)] border border-[var(--lp-border-violet)] px-6 py-12 text-center shadow-[var(--lp-glow-violet)] md:py-16"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(139,92,246,0.06) 60%, transparent 100%)",
          }}
        >
          <div className="relative mx-auto max-w-[720px]">
            <h2
              id="final-cta-heading"
              className="text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text"
            >
              Stop losing orders to slow replies.
            </h2>
            <p lang="bn" className="bn mt-3 text-[var(--lp-text-lead)] text-lp-violet-200">
              আজই ফ্রি শুরু করুন — কয়েক মিনিটেই WhatsApp কানেক্ট করুন
            </p>
            <p className="mx-auto mt-3 max-w-[560px] text-[var(--lp-text-body)] text-lp-muted">
              Connect your channels, let Ecomex handle the replies and orders, and keep your customer data on
              your side.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LpButton asChild size="lg" className="group" onClick={() => trackPlanCtaClick("pro")}>
                <a href={signupHref("pro")}>
                  <span lang="bn" className="bn">
                    ৫ দিন ফ্রি শুরু করুন
                  </span>
                  <ArrowRight className="h-5 w-5 transition-transform [transition-duration:var(--lp-dur)] group-hover:translate-x-0.5" />
                </a>
              </LpButton>
              <LpButton asChild variant="ghost" size="lg">
                <a href={WA_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                  Talk to us
                </a>
              </LpButton>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
