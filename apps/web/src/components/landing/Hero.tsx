import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

import { DemoRequestDialog } from "@/components/DemoRequestDialog";

import { signupHref } from "./config";
import { trackPlanCtaClick } from "./tracking-events";
import { GlowBackdrop } from "./ui/GlowBackdrop";
import { ImageSlot } from "./ui/ImageSlot";
import { LpButton } from "./ui/LpButton";
import { GlassPill, StatChip, LiveDot } from "./ui/primitives";

interface HeroProps {
  /** Attached to the CTA row so the sticky mobile bar can reveal after it scrolls past. */
  ctaRef?: React.Ref<HTMLDivElement>;
}

export function Hero({ ctaRef }: HeroProps) {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  const handleDemoSuccess = (credentials: { email: string; password: string }) => {
    // DemoRequestDialog hands back demo credentials; send the visitor to login
    // pre-filled via state (Login reads location.state when present).
    navigate("/auth/login", { state: { prefill: credentials } });
  };

  return (
    <section className="relative overflow-hidden px-5 pb-[var(--lp-space-section)] pt-16 md:px-6 md:pt-24">
      <GlowBackdrop grid drift />

      <div className="relative mx-auto max-w-[1200px]">
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow */}
          <GlassPill>
            <LiveDot />
            <span>Now with AI replies in Bangla &amp; English</span>
          </GlassPill>

          {/* H1 — Bangla primary */}
          <h1 className="lp-display mt-6 max-w-[18ch] text-balance text-lp-text">
            <span lang="bn" className="bn">
              WhatsApp, Facebook, Instagram —{" "}
              <span className="text-lp-violet-400">সব মেসেজ এক জায়গায়</span>
            </span>
          </h1>

          {/* English support line */}
          <p className="mt-5 max-w-[640px] text-[var(--lp-text-lead)] leading-relaxed text-lp-muted">
            Stop losing orders. One inbox for WhatsApp, Facebook &amp; Instagram — with AI replies, courier
            booking, bKash &amp; Nagad, and your customer data kept safely on your side.
          </p>

          {/* CTAs */}
          <div ref={ctaRef} className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <LpButton
              asChild
              size="lg"
              className="group w-full sm:w-auto"
              onClick={() => trackPlanCtaClick("pro")}
            >
              <a href={signupHref("pro")}>
                <span lang="bn" className="bn">
                  ৫ দিন ফ্রি শুরু করুন
                </span>
                <ArrowRight className="h-5 w-5 transition-transform [transition-duration:var(--lp-dur)] group-hover:translate-x-0.5" />
              </a>
            </LpButton>
            <LpButton
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="h-4 w-4" />
              <span lang="bn" className="bn">
                দেখুন কিভাবে কাজ করে
              </span>
            </LpButton>
          </div>

          {/* Microcopy */}
          <p lang="bn" className="bn mt-4 text-xs text-lp-dim">
            কার্ড লাগবে না · ৫ দিন ফ্রি ট্রায়াল · কয়েক মিনিটেই সেটআপ
          </p>

          {/* Stat chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StatChip value="3-in-1" label="channels, one inbox" />
            <StatChip value="AI" label="smart auto-reply" />
            <StatChip value="৩-ক্লিক" label="অর্ডার তৈরি" />
          </div>

          {/* Hero product shot */}
          <div className="relative mt-12 w-full max-w-[960px] md:mt-16">
            <div
              className="pointer-events-none absolute inset-x-8 -top-8 bottom-0 -z-10 rounded-[var(--lp-r-xl)]"
              style={{ boxShadow: "var(--lp-glow-violet-lg)" }}
              aria-hidden="true"
            />
            {/* SCREENSHOT: HERO_SHOT — unified inbox, light data, a Bangla message + green delivered ticks. 16:10, eager. */}
            <ImageSlot
              name="HERO_SHOT"
              hint="Unified inbox — Bangla message + green delivered ticks"
              aspect="aspect-[16/10]"
              frame="browser"
            />
          </div>
        </div>
      </div>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} onSuccess={handleDemoSuccess} />
    </section>
  );
}
