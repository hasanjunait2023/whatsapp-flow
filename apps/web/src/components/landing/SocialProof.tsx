import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { Eyebrow } from "./ui/primitives";

interface Testimonial {
  quote: string;
  name: string;
  shop: string;
  district: string;
}

// MARKED placeholders — names / shops / districts to be confirmed with marketing.
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Ecomex put WhatsApp, Facebook and Instagram in one place. We stopped missing night orders and our replies got way faster.",
    name: "[Customer name]",
    shop: "[Boutique name]",
    district: "Dhaka",
  },
  {
    quote:
      "The AI answers in Bangla just like my staff would. It handles the simple questions so we focus on packing and delivery.",
    name: "[Customer name]",
    shop: "[Fashion store]",
    district: "Chattogram",
  },
  {
    quote:
      "Booking courier and taking bKash right from the chat saves us hours every day. And our customer list is finally ours.",
    name: "[Customer name]",
    shop: "[Gadget shop]",
    district: "Sylhet",
  },
];

export function SocialProof() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <SectionShell id="testimonials" labelledBy="testimonials-heading" alt>
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <Eyebrow>LOVED BY SELLERS</Eyebrow>
          <h2
            id="testimonials-heading"
            className="mt-3 text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text"
          >
            What Bangladeshi sellers say
          </h2>
        </Reveal>
      </div>

      <div
        className="mt-12"
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer testimonials"
      >
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 md:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 lg:basis-1/3"
                role="group"
                aria-roledescription="slide"
                aria-label={`Testimonial ${i + 1} of ${TESTIMONIALS.length}`}
              >
                <figure className="flex h-full min-h-[260px] flex-col rounded-[var(--lp-r-lg)] border border-[var(--lp-border)] bg-lp-surface p-6 shadow-[var(--lp-shadow-card)]">
                  <Quote className="h-7 w-7 text-lp-violet-500/40" aria-hidden="true" />
                  <blockquote className="mt-3 flex-1 text-[var(--lp-text-body)] leading-relaxed text-lp-text">
                    {t.quote}
                  </blockquote>
                  <div className="mt-1 flex gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-lp-violet-400 text-lp-violet-400" />
                    ))}
                  </div>
                  <figcaption className="mt-4 flex items-center gap-3 border-t border-[var(--lp-border)] pt-4">
                    {/* AVATAR — placeholder; replace with real customer photo (1:1, 80px). */}
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--lp-border-strong)] bg-lp-surface-2 text-xs font-semibold text-lp-dim">
                      {t.district.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-lp-text">{t.name}</p>
                      <p className="truncate text-xs text-lp-dim">
                        {t.shop} · {t.district}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous testimonial"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] text-lp-muted transition-colors hover:border-[var(--lp-border-strong)] hover:text-lp-text"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose testimonial">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-selected={i === selectedIndex}
                role="tab"
                className={cn(
                  "h-2 rounded-full transition-all [transition-duration:var(--lp-dur)]",
                  i === selectedIndex ? "w-6 bg-lp-violet-500" : "w-2 bg-lp-dim/50 hover:bg-lp-dim",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next testimonial"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] text-lp-muted transition-colors hover:border-[var(--lp-border-strong)] hover:text-lp-text"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </SectionShell>
  );
}
