import { useState } from "react";
import { Facebook, Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";

import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { APP_SHORT_NAME, SUPPORT_EMAIL } from "@/config/branding";
import { cn } from "@/lib/utils";

import { WA_SUPPORT_URL } from "./config";
import { LpButton } from "./ui/LpButton";

interface LinkCol {
  heading: string;
  links: { label: string; href: string }[];
}

const COLUMNS: LinkCol[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#integrations" },
      { label: "Data ownership", href: "#data-ownership" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: WA_SUPPORT_URL },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help center", href: "#faqs" },
      { label: "WhatsApp us", href: WA_SUPPORT_URL },
      { label: "Status", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Refund policy", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const trap = (form.elements.namedItem("company") as HTMLInputElement)?.value;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    if (trap) return;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/public/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="h-12 flex-1 rounded-[var(--lp-r-md)] border border-[var(--lp-border)] bg-lp-surface px-4 text-sm text-lp-text placeholder:text-lp-dim focus:border-[var(--lp-border-strong)] focus:outline-none"
        />
        {/* Honeypot (hidden from users + AT) */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <LpButton type="submit" size="lg" className="shrink-0">
          Subscribe
        </LpButton>
      </div>
      {status === "ok" && (
        <p className="mt-2 text-sm text-lp-green-400" role="status">
          Thanks — you&apos;re on the list.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-[color:var(--lp-danger)]" role="alert">
          Please enter a valid email address.
        </p>
      )}
    </form>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--lp-border)] bg-lp-bg-1 px-5 py-16 md:px-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Newsletter band */}
        <div className="grid items-center gap-8 border-b border-[var(--lp-border)] pb-12 md:grid-cols-2">
          <div>
            <h3 className="text-[var(--lp-text-h3)] font-semibold text-lp-text">Stay connected</h3>
            <p className="mt-1 text-sm text-lp-muted">Product tips &amp; updates for sellers. No spam.</p>
          </div>
          <NewsletterForm />
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-6">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
              <span className="text-lg font-bold tracking-tight text-lp-text">{APP_SHORT_NAME}</span>
            </div>
            <p className="mt-3 max-w-[34ch] text-sm text-lp-muted">
              One inbox for WhatsApp, Facebook &amp; Instagram — AI replies, courier booking and your own
              customer data, made for Bangladeshi sellers.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--lp-r-md)] bg-lp-surface text-lp-muted transition-colors hover:bg-lp-surface-2 hover:text-lp-violet-300"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
              <a
                href={WA_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp us"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--lp-r-md)] bg-lp-surface text-lp-green-400 transition-colors hover:bg-lp-surface-2"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-lp-dim">{col.heading}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="text-sm text-lp-muted transition-colors hover:text-lp-text"
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* Trust / business info — placeholders for real registration details */}
        <div className="border-t border-[var(--lp-border)] py-6 text-xs text-lp-dim">
          <p>
            <span>Dhaka, Bangladesh</span>
            {" · "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-lp-muted">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-[var(--lp-border)] pt-8 md:flex-row md:items-center">
          <p className="text-xs text-lp-dim">
            © {new Date().getFullYear()} What A App by Ecomex. Made in Bangladesh 🇧🇩
          </p>
          <div className="flex items-center gap-4">
            <ul className="flex items-center gap-3" aria-label="Accepted payments">
              {["bKash", "Nagad"].map((p) => (
                <li key={p} aria-label={p} className="text-xs font-semibold text-lp-dim opacity-60 grayscale">
                  {p}
                </li>
              ))}
            </ul>
            <LanguageSwitcher variant="ghost" size="sm" />
          </div>
        </div>
      </div>
    </footer>
  );
}
