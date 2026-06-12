import { Reveal } from "./ui/Reveal";

/**
 * Trust strip: recognizable BD payment + courier brand marks. Per the brief we do
 * NOT invent fake logos — these are text wordmarks marked for replacement with the
 * real SVG marks (TRUST_LOGOS slot, LANDING_DESIGN.md §4).
 */
const PARTNERS = ["bKash", "Nagad", "Rocket", "Pathao", "RedX", "Steadfast"];

export function TrustStrip() {
  return (
    <section
      aria-label="Trusted payment and delivery partners"
      className="relative border-y border-[var(--lp-border)] bg-lp-bg px-5 py-10 md:px-6"
    >
      <div className="mx-auto max-w-[1200px]">
        <Reveal>
          <p className="text-center text-xs text-lp-dim">
            Powering sales for businesses across Bangladesh ·{" "}
            <span className="lp-tnum text-lp-muted" title="Placeholder — confirm with marketing">
              X,000+
            </span>{" "}
            shops
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          {/* TRUST_LOGOS: replace each wordmark with the real monochrome SVG (h-6/7). */}
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
            {PARTNERS.map((name) => (
              <li
                key={name}
                aria-label={name}
                className="text-lg font-semibold tracking-tight text-lp-muted opacity-55 grayscale transition-opacity [transition-duration:var(--lp-dur)] hover:opacity-90 md:text-xl"
              >
                {name}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
