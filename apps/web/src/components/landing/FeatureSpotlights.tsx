import { Check, ArrowRight, Inbox, Bot, ShoppingBag, Megaphone, BarChart3, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";
import { ImageSlot } from "./ui/ImageSlot";

interface Feature {
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  body: string;
  checks: string[];
  slot: { name: string; hint: string; aspect: string; frame: "browser" | "phone" };
  accessory?: string;
}

const FEATURES: Feature[] = [
  {
    eyebrow: "UNIFIED INBOX",
    icon: Inbox,
    title: "Three apps, one screen. Nothing slips.",
    body: "Every WhatsApp, Messenger and Instagram message lands in a single inbox. Assign chats to your team, tag them, and reply with saved templates.",
    checks: ["WhatsApp + Messenger + Instagram", "Assign chats to your team", "Quick replies & tags"],
    slot: {
      name: "SHOT_INBOX",
      hint: "Inbox list + open conversation, assignment & tags",
      aspect: "aspect-[16/10]",
      frame: "browser",
    },
    accessory: "● Online",
  },
  {
    eyebrow: "AI THAT SOUNDS LIKE YOU",
    icon: Bot,
    title: "An assistant that answers in seconds — in Bangla.",
    body: "The AI learns your products and prices, replies day and night in Bangla and English, and hands off to a human the moment it matters.",
    checks: ["Learns your products & prices", "Replies 24/7, hands off to humans", "You stay in control"],
    slot: {
      name: "SHOT_AI",
      hint: "Chat thread with a Bangla AI reply + green ticks + handoff toggle",
      aspect: "aspect-[4/5]",
      frame: "phone",
    },
    accessory: "AI replied in 2s",
  },
  {
    eyebrow: "CHAT → ORDER → DOORSTEP",
    icon: ShoppingBag,
    title: "From 'koto?' to delivered — without leaving the chat.",
    body: "Build an order with live stock and totals, send a bKash or Nagad payment link, book Pathao, RedX or Steadfast, and share tracking automatically.",
    checks: ["Build orders with live stock", "bKash / Nagad payment links", "Book courier & track delivery"],
    slot: {
      name: "SHOT_ORDER",
      hint: "Order builder + courier/tracking panel, bKash link + Pathao status",
      aspect: "aspect-[16/10]",
      frame: "browser",
    },
  },
  {
    eyebrow: "BROADCAST & FUNNELS",
    icon: Megaphone,
    title: "Bring customers back, automatically.",
    body: "Send broadcasts to the right segment and run follow-up funnels that re-engage past buyers — all within WhatsApp's safe sending limits.",
    checks: ["Targeted broadcasts by segment", "Automated follow-up funnels", "Anti-ban safe sending"],
    slot: {
      name: "SHOT_BROADCAST",
      hint: "Broadcast composer + funnel builder with segments",
      aspect: "aspect-[16/10]",
      frame: "browser",
    },
  },
  {
    eyebrow: "ANALYTICS",
    icon: BarChart3,
    title: "See what's working at a glance.",
    body: "Track revenue, response time, top products and agent performance — so you know where sales come from and where chats get stuck.",
    checks: ["Revenue & order trends", "Response-time tracking", "Top products & agent stats"],
    slot: {
      name: "SHOT_ANALYTICS",
      hint: "Analytics dashboard — revenue, response time, top products",
      aspect: "aspect-[16/10]",
      frame: "browser",
    },
  },
];

function SpotlightMedia({ feature, reversed }: { feature: Feature; reversed: boolean }) {
  return (
    <div className={cn("relative", reversed ? "lg:order-1" : "lg:order-2")}>
      <div
        className="pointer-events-none absolute inset-4 -z-10 rounded-[var(--lp-r-xl)]"
        style={{ boxShadow: "var(--lp-glow-violet)" }}
        aria-hidden="true"
      />
      {/* SCREENSHOT: see slot name for what the real asset should contain. */}
      <ImageSlot
        name={feature.slot.name}
        hint={feature.slot.hint}
        aspect={feature.slot.aspect}
        frame={feature.slot.frame}
      />
      {feature.accessory && (
        <span className="absolute -top-3 right-4 inline-flex items-center gap-1.5 rounded-[var(--lp-r-pill)] border border-[var(--lp-border)] bg-[var(--lp-surface-glass)] px-3 py-1.5 text-xs font-medium text-lp-text shadow-[var(--lp-shadow-card)] backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-lp-green-400" />
          {feature.accessory}
        </span>
      )}
    </div>
  );
}

export function FeatureSpotlights() {
  return (
    <SectionShell id="features" labelledBy="features-heading">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow>WHY ECOMEX</Eyebrow>
          <h2 id="features-heading" className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text">
            Everything you need to sell over chat
          </h2>
        </Reveal>
      </div>

      <div className="mt-12 flex flex-col gap-4 md:gap-6">
        {FEATURES.map((feature, i) => {
          const reversed = i % 2 === 1;
          const Icon = feature.icon;
          return (
            <Reveal key={feature.slot.name}>
              <article className="grid items-center gap-8 rounded-[var(--lp-r-xl)] border border-[var(--lp-border)] bg-lp-bg-1 p-6 shadow-[var(--lp-shadow-card)] lg:grid-cols-2 lg:gap-12 lg:p-10">
                {/* Copy column */}
                <div className={cn(reversed ? "lg:order-2" : "lg:order-1")}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] bg-lp-violet-500/10 text-lp-violet-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <Eyebrow className="mb-0">{feature.eyebrow}</Eyebrow>
                  </div>
                  <h3 className="mt-4 text-[var(--lp-text-h2)] font-bold leading-tight tracking-tight text-lp-text">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[var(--lp-text-body)] leading-relaxed text-lp-muted">{feature.body}</p>
                  <ul className="mt-5 space-y-2.5">
                    {feature.checks.map((c) => (
                      <li key={c} className="flex items-center gap-3 text-sm text-lp-text">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lp-green-tint text-lp-green-400">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#pricing"
                    className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-lp-violet-400 transition-colors hover:text-lp-violet-300"
                  >
                    See how it works
                    <ArrowRight className="h-4 w-4 transition-transform [transition-duration:var(--lp-dur)] group-hover:translate-x-0.5" />
                  </a>
                </div>

                <SpotlightMedia feature={feature} reversed={reversed} />
              </article>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
