import { Link } from "react-router-dom";
import { Check, X, Sparkles, HelpCircle } from "lucide-react";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { FinalCta } from "@/components/landing/FinalCta";
import { LpButton } from "@/components/landing/ui/LpButton";
import { LpThemeProvider } from "@/components/landing/LpThemeContext";

import "@/styles/landing.css";
import "@/styles/marketing.css";

type Plan = {
  name: string;
  price: string;
  unit: string;
  highlight?: boolean;
  badge?: string;
  features: { ok: boolean; text: string }[];
  cta: string;
  ctaHref: string;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "৳ ০",
    unit: "/ month",
    features: [
      { ok: true, text: "১০০ message / month" },
      { ok: true, text: "১ WhatsApp number connect" },
      { ok: true, text: "CSV contact import" },
      { ok: true, text: "Basic analytics" },
      { ok: true, text: "Community support" },
      { ok: false, text: "Auto-reply chatbot" },
      { ok: false, text: "bKash payment link" },
      { ok: false, text: "Team inbox" },
    ],
    cta: "Start free",
    ctaHref: "/auth/signup?plan=free",
  },
  {
    name: "Starter",
    price: "৳ ৯৯৯",
    unit: "/ month",
    highlight: true,
    badge: "Most popular",
    features: [
      { ok: true, text: "৫,০০০ message / month" },
      { ok: true, text: "৩ WhatsApp numbers" },
      { ok: true, text: "Auto-reply chatbot" },
      { ok: true, text: "bKash / Nagad payment link" },
      { ok: true, text: "Customer segmentation" },
      { ok: true, text: "Live delivery analytics" },
      { ok: true, text: "Email + chat support" },
      { ok: false, text: "Team inbox (3+ agents)" },
    ],
    cta: "Choose Starter",
    ctaHref: "/auth/signup?plan=starter",
  },
  {
    name: "Pro",
    price: "৳ ২,৯৯৯",
    unit: "/ month",
    features: [
      { ok: true, text: "Unlimited messages" },
      { ok: true, text: "Unlimited WhatsApp numbers" },
      { ok: true, text: "Advanced chatbot" },
      { ok: true, text: "All payment gateways" },
      { ok: true, text: "Advanced segmentation" },
      { ok: true, text: "Team inbox (unlimited)" },
      { ok: true, text: "Priority phone support" },
      { ok: true, text: "Dedicated account manager" },
    ],
    cta: "Choose Pro",
    ctaHref: "/auth/signup?plan=pro",
  },
];

const faqs = [
  { q: "Will my WhatsApp account get banned?", a: "No. Ecomex uses smart throttling, warm-up, and Meta-approved templates. None of our 500+ customers have been banned in over a year." },
  { q: "Do I need a Meta Business account?", a: "Yes, the WhatsApp Business API requires a Meta-verified Business account. Ecomex walks you through the setup step by step — about 10 minutes from start to finish." },
  { q: "How does bKash payment work?", a: "Connect your bKash merchant account to Ecomex. We inject a dynamic payment link into your messages — customers click, pay, and you get instant confirmation in the dashboard." },
  { q: "What happens to unused messages at the end of the month?", a: "Starter plan messages reset monthly. Pro plan is unlimited — no rollover rules to remember." },
  { q: "Refund policy?", a: "Full refund within the first 7 days, no questions asked. Email support@ecomex.cloud." },
  { q: "Do you offer Bangla support?", a: "Yes. Our Dhaka-based team replies in Bangla 24/7. Starter: email + chat. Pro: phone + WhatsApp." },
];

export default function PricingPage() {
  return (
    <LpThemeProvider>
      {(theme) => (
        <div className="lp min-h-screen flex flex-col" data-theme={theme}>
          <Nav />

          <section className="lp-section lp-section-tight">
            <div className="lp-section-head">
              <span className="lp-eyebrow">
                <Sparkles size={14} /> Pricing
              </span>
              <h1 className="lp-display">Plans that grow with your business</h1>
              <p className="lp-lead">
                From solo shops to enterprise — pick the plan that fits, upgrade any time.
              </p>
            </div>

            <div className="ecx-pricing-grid">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`ecx-pricing-card ${p.highlight ? "ecx-pricing-highlight" : ""}`}
                >
                  {p.badge && <span className="ecx-pricing-badge">{p.badge}</span>}
                  <h3 className="ecx-pricing-name">{p.name}</h3>
                  <div className="ecx-pricing-price">
                    <span className="ecx-pricing-amount">{p.price}</span>
                    <span className="ecx-pricing-unit">{p.unit}</span>
                  </div>
                  <Link to={p.ctaHref} className="w-full">
                    <LpButton variant={p.highlight ? "primary" : "ghost"} size="lg" className="w-full">
                      {p.cta}
                    </LpButton>
                  </Link>
                  <ul className="ecx-pricing-features">
                    {p.features.map((f) => (
                      <li key={f.text} className={f.ok ? "" : "ecx-pricing-no"}>
                        {f.ok ? <Check size={16} /> : <X size={16} />}
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="ecx-pricing-foot">
              7-day money-back guarantee on every plan. No hidden fees.
            </p>
          </section>

          <section className="lp-section">
            <div className="lp-section-head">
              <span className="lp-eyebrow">
                <HelpCircle size={14} /> FAQ
              </span>
              <h2 className="lp-h2">Common questions</h2>
            </div>
            <div className="ecx-faq">
              {faqs.map((f) => (
                <details key={f.q} className="ecx-faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <FinalCta />
          <Footer />
        </div>
      )}
    </LpThemeProvider>
  );
}