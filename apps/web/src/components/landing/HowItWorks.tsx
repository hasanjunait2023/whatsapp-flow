import { Plug, Bot, TrendingUp, type LucideIcon } from "lucide-react";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";

interface Step {
  n: string;
  icon: LucideIcon;
  en: string;
  bn: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: "01",
    icon: Plug,
    en: "Connect",
    bn: "কানেক্ট করুন",
    body: "Link your WhatsApp, Facebook and Instagram in minutes. No new number, no app for your customers.",
  },
  {
    n: "02",
    icon: Bot,
    en: "Automate",
    bn: "অটোমেট করুন",
    body: "Let AI answer FAQs, prices and availability in Bangla 24/7, and build orders straight from the chat.",
  },
  {
    n: "03",
    icon: TrendingUp,
    en: "Grow",
    bn: "গ্রো করুন",
    body: "Book couriers, take bKash/Nagad, run follow-up funnels, and watch sales and response times improve.",
  },
];

export function HowItWorks() {
  return (
    <SectionShell id="how" labelledBy="how-heading" alt>
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <h2 id="how-heading" className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text">
            Up and running in three steps
          </h2>
        </Reveal>
      </div>

      <div className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="relative h-full rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface p-6 shadow-[var(--lp-shadow-card)] md:p-8">
                <span className="lp-tnum absolute right-6 top-6 text-sm font-bold text-lp-violet-500/40">
                  {step.n}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(139,92,246,0.06))] text-lp-violet-400">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-[var(--lp-text-h3)] font-semibold text-lp-text">{step.en}</h3>
                <p lang="bn" className="bn mt-1 text-sm text-lp-violet-300">
                  {step.bn}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-lp-muted">{step.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
