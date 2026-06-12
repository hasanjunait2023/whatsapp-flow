import { Truck, Wallet, MessageSquare } from "lucide-react";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";

interface Group {
  icon: typeof Truck;
  label: string;
  items: string[];
}

// Brand names rendered as text wordmarks — replace with real monochrome SVGs.
const GROUPS: Group[] = [
  { icon: MessageSquare, label: "Channels", items: ["WhatsApp", "Messenger", "Instagram"] },
  { icon: Truck, label: "Couriers", items: ["Pathao", "RedX", "Steadfast", "eCourier"] },
  { icon: Wallet, label: "Payments", items: ["bKash", "Nagad", "Rocket"] },
];

export function Integrations() {
  return (
    <SectionShell id="integrations" labelledBy="integrations-heading">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow>INTEGRATIONS</Eyebrow>
          <h2
            id="integrations-heading"
            className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text"
          >
            Works with the tools you already use
          </h2>
          <p className="mt-3 text-[var(--lp-text-body)] text-lp-muted">
            Connect your channels, couriers and payments — no extra apps for your customers.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
        {GROUPS.map((group, gi) => {
          const Icon = group.icon;
          return (
            <Reveal key={group.label} delay={gi * 0.06}>
              <div className="h-full rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface p-6 shadow-[var(--lp-shadow-card)] md:p-8">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] bg-lp-violet-500/10 text-lp-violet-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Eyebrow className="mb-0">{group.label}</Eyebrow>
                </div>
                {/* Replace text marks with real monochrome SVG logos. */}
                <ul className="mt-5 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      aria-label={item}
                      className="rounded-[var(--lp-r-sm)] border border-[var(--lp-border)] bg-lp-surface-2 px-3 py-1.5 text-sm font-medium text-lp-muted"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
