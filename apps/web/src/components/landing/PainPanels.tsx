import { Clock, Shuffle, ShieldAlert, type LucideIcon } from "lucide-react";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow, LpCard } from "./ui/primitives";

interface Pain {
  icon: LucideIcon;
  en: string;
  bn: string;
  body: string;
}

const PAINS: Pain[] = [
  {
    icon: Clock,
    en: "Late reply, lost sale",
    bn: "দেরিতে উত্তর, হারানো অর্ডার",
    body: "A customer messages at night, gets no reply, and orders from the next seller by morning. Slow responses quietly bleed revenue.",
  },
  {
    icon: Shuffle,
    en: "Orders scattered everywhere",
    bn: "অর্ডার ছড়িয়ে-ছিটিয়ে",
    body: "WhatsApp, Messenger, Instagram, comments — orders pile up across apps. Things get missed, double-sold, or forgotten.",
  },
  {
    icon: ShieldAlert,
    en: "COD fraud & returns",
    bn: "ক্যাশ-অন-ডেলিভারি প্রতারণা",
    body: "Fake orders and serial returners burn courier fees and stock. You find out only after the parcel comes back.",
  },
];

export function PainPanels() {
  return (
    <SectionShell id="problem" labelledBy="problem-heading">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow className="text-lp-violet-400">SOUND FAMILIAR?</Eyebrow>
          <h2 id="problem-heading" className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text">
            Selling over chat is hard when everything is everywhere
          </h2>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
        {PAINS.map((pain, i) => {
          const Icon = pain.icon;
          return (
            <Reveal key={pain.en} delay={i * 0.06}>
              <LpCard className="h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] bg-[linear-gradient(135deg,var(--lp-danger-tint-from),var(--lp-danger-tint-to))]">
                  <Icon className="h-5 w-5 text-[color:var(--lp-danger)]" />
                </div>
                <h3 className="mt-5 text-[var(--lp-text-h3)] font-semibold text-lp-text">{pain.en}</h3>
                <p lang="bn" className="bn mt-1 text-sm text-lp-violet-300">
                  {pain.bn}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-lp-muted">{pain.body}</p>
              </LpCard>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
