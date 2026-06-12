import {
  ShieldCheck,
  Database,
  Download,
  RefreshCw,
  Ban,
  Lock,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { GlowBackdrop } from "./ui/GlowBackdrop";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";

interface Pillar {
  icon: LucideIcon;
  en: string;
  bn: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Database,
    en: "Stored on your side",
    bn: "আপনার কাছে সংরক্ষিত",
    body: "Every contact, chat and order is saved securely in your Ecomex account — not locked inside Meta.",
  },
  {
    icon: ShieldCheck,
    en: "Survives a ban",
    bn: "ব্যান হলেও টিকে থাকে",
    body: "If a page or number gets banned, your customer list and history are still right here, untouched.",
  },
  {
    icon: Download,
    en: "Export & reuse",
    bn: "এক্সপোর্ট ও পুনর্ব্যবহার",
    body: "Download your contacts any time and re-import to a new number or channel in minutes.",
  },
  {
    icon: RefreshCw,
    en: "Re-engage with funnels",
    bn: "ফলো-আপ ফানেল",
    body: "Win customers back with broadcast and follow-up funnels — your audience is yours to reach.",
  },
];

/** Steps in the ban-proof diagram. */
const FLOW = [
  { icon: Users, label: "Meta channels", sub: "WA · FB · IG", tone: "neutral" as const },
  { icon: Lock, label: "Your secure vault", sub: "contacts · chats · orders", tone: "violet" as const },
  { icon: ShieldCheck, label: "Ban-proof", sub: "data stays yours", tone: "green" as const },
];

export function DataOwnership() {
  return (
    <section
      id="data-ownership"
      aria-labelledby="data-ownership-heading"
      className="relative overflow-hidden border-y border-[var(--lp-border-violet)] bg-lp-bg-1 px-5 py-[var(--lp-space-section)] md:px-6"
    >
      <GlowBackdrop grid={false} />
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(139,92,246,0.04) 45%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[760px] text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-[var(--lp-r-pill)] border border-[var(--lp-border-violet)] bg-[var(--lp-surface-glass)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lp-violet-300 backdrop-blur-xl">
              <ShieldCheck className="h-3.5 w-3.5" />
              The Ecomex difference
            </span>
            <h2
              id="data-ownership-heading"
              className="mt-5 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text"
            >
              Own your customer data. Ban-proof your business.
            </h2>
            <p lang="bn" className="bn mt-3 text-[var(--lp-text-lead)] text-lp-violet-300">
              নিজের কাস্টমার ডেটা নিজের কাছে রাখুন
            </p>
            <p className="mx-auto mt-4 max-w-[640px] text-[var(--lp-text-body)] leading-relaxed text-lp-muted">
              On WhatsApp, Facebook and Instagram you don&apos;t own your audience — Meta does. One page or
              number ban and your customers and their history can vanish overnight. Ecomex keeps a secure copy
              on your side, so a ban can&apos;t erase the business you built.
            </p>
          </Reveal>
        </div>

        {/* Ban-proof diagram */}
        <Reveal delay={0.05}>
          <div className="mt-12 rounded-[var(--lp-r-xl)] border border-[var(--lp-border)] bg-[var(--lp-surface-glass)] p-6 backdrop-blur-xl md:p-10">
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-center md:gap-2">
              {FLOW.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
                    <div
                      className={cn(
                        "flex w-full min-w-[180px] flex-col items-center gap-2 rounded-[var(--lp-r-lg)] border p-5 text-center md:w-auto",
                        step.tone === "violet" &&
                          "border-[var(--lp-border-violet)] bg-lp-elevated shadow-[var(--lp-glow-violet)]",
                        step.tone === "green" && "border-[rgba(52,211,153,0.4)] bg-lp-surface",
                        step.tone === "neutral" && "border-[var(--lp-border)] bg-lp-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-[var(--lp-r-md)]",
                          step.tone === "violet" && "bg-lp-violet-500/15 text-lp-violet-300",
                          step.tone === "green" && "bg-lp-green-500/15 text-lp-green-400",
                          step.tone === "neutral" && "bg-white/5 text-lp-muted",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="text-sm font-semibold text-lp-text">{step.label}</span>
                      <span className="text-xs text-lp-dim">{step.sub}</span>
                    </div>
                    {i < FLOW.length - 1 && (
                      <span aria-hidden="true" className="text-lp-violet-400">
                        <span className="hidden md:inline">&rarr;</span>
                        <span className="md:hidden">&darr;</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ban marker overlaid on the flow */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-lp-dim">
              <Ban className="h-4 w-4 text-[#f87171]" />
              <span>A page or number ban hits the left side — your vault on the right keeps everything.</span>
            </div>
          </div>
        </Reveal>

        {/* Pillars */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.en} delay={i * 0.06}>
                <div className="h-full rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface p-6 shadow-[var(--lp-shadow-card)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border-violet)] bg-lp-violet-500/10 text-lp-violet-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-lp-text">{p.en}</h3>
                  <p lang="bn" className="bn mt-1 text-xs text-lp-violet-300">
                    {p.bn}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-lp-muted">{p.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Anti-ban safety callout */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-col items-start gap-4 rounded-[var(--lp-r-lg)] border border-[rgba(52,211,153,0.35)] bg-lp-green-500/[0.06] p-6 sm:flex-row sm:items-center md:p-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--lp-r-md)] bg-lp-green-500/15 text-lp-green-400">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-[var(--lp-text-h3)] font-semibold text-lp-text">
                Anti-ban WhatsApp safety, built in
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-lp-muted">
                Smart sending limits, warm-up pacing and human-like delays help keep your number healthy — so
                you reach customers without tripping WhatsApp&apos;s spam filters.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
