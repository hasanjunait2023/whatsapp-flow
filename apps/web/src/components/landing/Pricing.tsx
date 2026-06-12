import { useEffect, useRef, useState } from "react";
import { Check, Minus } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { DemoRequestDialog } from "@/components/DemoRequestDialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { PLANS, signupHref, yearlyPerMonth, type Plan, type PlanId } from "./config";
import { trackPlanCtaClick, trackPricingView } from "./tracking-events";
import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";
import { LpButton } from "./ui/LpButton";

/** English digits → Bangla numerals, with grouping (1499 → ১,৪৯৯). */
function toBanglaNumber(n: number): string {
  const en = n.toLocaleString("en-US");
  const map: Record<string, string> = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
  };
  return en.replace(/[0-9]/g, (d) => map[d]);
}

function PriceBlock({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  if (plan.monthly === null) {
    return (
      <div className="flex min-h-[3.25rem] items-end">
        <span className="text-[var(--lp-text-h3)] font-bold text-lp-text">Let&apos;s talk</span>
      </div>
    );
  }
  const effective = yearly ? yearlyPerMonth(plan.monthly) : plan.monthly;
  return (
    <div className="min-h-[3.25rem]">
      <div className="flex items-end gap-1">
        <span className="lp-tnum text-[var(--lp-price)] font-extrabold leading-none text-lp-text">
          ৳<span lang="bn" className="bn">{toBanglaNumber(effective)}</span>
        </span>
        <span lang="bn" className="bn pb-1 text-sm text-lp-dim">
          /মাস
        </span>
      </div>
      {yearly && (
        <p className="lp-tnum mt-1 text-xs text-lp-dim">
          <span className="line-through">
            ৳<span lang="bn" className="bn">{toBanglaNumber(plan.monthly)}</span>
          </span>{" "}
          <span lang="bn" className="bn text-lp-green-400">
            ২ মাস ফ্রি
          </span>
        </p>
      )}
    </div>
  );
}

function PricingCard({
  plan,
  yearly,
  onEnterprise,
}: {
  plan: Plan;
  yearly: boolean;
  onEnterprise: () => void;
}) {
  const navigate = useNavigate();
  const isEnterprise = plan.id === "enterprise";

  const handleCta = () => {
    if (isEnterprise) {
      onEnterprise();
      return;
    }
    trackPlanCtaClick(plan.id as PlanId);
    navigate(signupHref(plan.id as PlanId));
  };

  return (
    <article
      aria-label={`${plan.name} plan`}
      className={cn(
        "relative flex flex-col rounded-[var(--lp-r-lg)] border p-6 md:p-8",
        plan.highlighted
          ? "border-[var(--lp-border-violet)] bg-lp-elevated shadow-[var(--lp-glow-violet)] xl:scale-[1.03] xl:z-10"
          : "border-[var(--lp-border)] bg-lp-surface shadow-[var(--lp-shadow-card)]",
        plan.highlighted && "mt-3 xl:mt-0",
      )}
    >
      {plan.highlighted && plan.badgeBn && (
        <span
          lang="bn"
          className="bn absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[var(--lp-r-pill)] bg-lp-violet-500 px-3 py-1 text-xs font-semibold text-white shadow-[var(--lp-glow-violet)]"
        >
          {plan.badgeBn}
        </span>
      )}

      <h3 className="text-[var(--lp-text-h3)] font-semibold text-lp-text">{plan.name}</h3>
      <p lang="bn" className="bn mt-1 text-xs text-lp-dim">
        {plan.audienceBn}
      </p>

      <div className="mt-5">
        <PriceBlock plan={plan} yearly={yearly} />
      </div>

      <div className="mt-6">
        <LpButton
          variant={plan.highlighted ? "primary" : "ghost"}
          size="lg"
          className="w-full"
          onClick={handleCta}
        >
          {isEnterprise ? (
            <span lang="bn" className="bn">
              যোগাযোগ করুন
            </span>
          ) : (
            <span lang="bn" className="bn">
              ৫ দিন ফ্রি শুরু করুন
            </span>
          )}
        </LpButton>
      </div>

      <div className="my-6 h-px bg-[var(--lp-border)]" />

      <ul className="flex flex-1 flex-col gap-3">
        {plan.features.map((f, i) => {
          const isHeader = f.en.startsWith("Everything in");
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              {isHeader ? (
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-lp-dim" />
              ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-lp-green-400" />
              )}
              <span className={cn(isHeader ? "text-lp-dim" : "text-lp-text")}>{f.en}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  const [demoOpen, setDemoOpen] = useState(false);
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const firedView = useRef(false);

  // Fire ViewContent once when the pricing section is ~50% into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedView.current) {
          firedView.current = true;
          trackPricingView();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <SectionShell id="pricing" labelledBy="pricing-heading" alt>
      <div ref={sentinelRef} className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow>PRICING</Eyebrow>
          <h2 id="pricing-heading" className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text">
            Simple pricing that grows with you
          </h2>
          <p className="mt-3 text-[var(--lp-text-body)] text-lp-muted">
            Taka pricing. No hidden fees. Cancel anytime.
          </p>
        </Reveal>

        {/* Billing toggle */}
        <Reveal delay={0.05}>
          <div className="mt-8 inline-flex items-center gap-3 rounded-[var(--lp-r-pill)] border border-[var(--lp-border)] bg-lp-surface px-4 py-2.5">
            <span className={cn("text-sm font-medium", !yearly ? "text-lp-text" : "text-lp-dim")}>Monthly</span>
            <Switch
              checked={yearly}
              onCheckedChange={setYearly}
              aria-label="Toggle yearly billing"
              className="data-[state=checked]:bg-lp-violet-500"
            />
            <span className={cn("text-sm font-medium", yearly ? "text-lp-text" : "text-lp-dim")}>Yearly</span>
            <span
              lang="bn"
              className="bn rounded-[var(--lp-r-pill)] bg-lp-green-tint px-2.5 py-0.5 text-xs font-semibold text-lp-green-400"
            >
              ২ মাস ফ্রি
            </span>
          </div>
          {/* Announce price-mode changes to screen readers. */}
          <p className="sr-only" aria-live="polite">
            {yearly ? "Showing yearly pricing, two months free" : "Showing monthly pricing"}
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <Reveal key={plan.id}>
            <div className="h-full">
              <PricingCard plan={plan} yearly={yearly} onEnterprise={() => setDemoOpen(true)} />
            </div>
          </Reveal>
        ))}
      </div>

      <DemoRequestDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        onSuccess={(credentials) => navigate("/auth/login", { state: { prefill: credentials } })}
      />
    </SectionShell>
  );
}
