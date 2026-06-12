import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, MessageCircle } from "lucide-react";

import { AppLogo } from "@/components/AppLogo";
import { APP_SHORT_NAME } from "@/config/branding";
import { cn } from "@/lib/utils";

import { NAV_LINKS, WA_SUPPORT_URL, WA_SUPPORT_DISPLAY, signupHref } from "./config";
import { useScrolled, useScrollSpy } from "./useLandingScroll";
import { LpButton } from "./ui/LpButton";
import { ThemeToggle } from "./ui/ThemeToggle";

const SECTION_IDS = NAV_LINKS.map((l) => l.href.replace("#", ""));

export function Nav() {
  const scrolled = useScrolled(24);
  const activeId = useScrollSpy(SECTION_IDS);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <nav
        aria-label="Primary"
        className={cn(
          "transition-all [transition-duration:var(--lp-dur)]",
          scrolled
            ? "border-b border-[var(--lp-border)] bg-[var(--lp-surface-glass)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-6">
          {/* Wordmark */}
          <a href="#main" className="flex items-center gap-2" aria-label={`${APP_SHORT_NAME} home`}>
            <span className="rounded-[var(--lp-r-sm)] shadow-[var(--lp-glow-violet)]">
              <AppLogo size="sm" />
            </span>
            <span className="text-lg font-bold tracking-tight text-lp-text">{APP_SHORT_NAME}</span>
          </a>

          {/* Center links (desktop) */}
          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeId === link.href.replace("#", "");
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative text-sm font-medium transition-colors [transition-duration:var(--lp-dur-fast)]",
                      isActive ? "text-lp-text" : "text-lp-muted hover:text-lp-text",
                    )}
                  >
                    {link.en}
                    <span
                      className={cn(
                        "absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-lp-violet-500 transition-transform [transition-duration:var(--lp-dur)] group-hover:scale-x-100",
                        isActive && "scale-x-100",
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Right cluster (desktop) */}
          <div className="hidden items-center gap-4 lg:flex">
            <a
              href={WA_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-lp-muted transition-colors hover:text-lp-green-400"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="lp-tnum">{WA_SUPPORT_DISPLAY}</span>
            </a>
            <a href="/auth/login" className="text-sm font-medium text-lp-muted transition-colors hover:text-lp-text">
              Log in
            </a>
            <ThemeToggle />
            <LpButton asChild size="pill">
              <a href={signupHref("pro")}>Get Started</a>
            </LpButton>
          </div>

          {/* Right cluster (mobile) */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <LpButton asChild size="pill" className="h-10 px-4 text-sm">
              <a href={signupHref("pro")}>Get Started</a>
            </LpButton>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] text-lp-text"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
                <Dialog.Content
                  className="lp fixed inset-0 z-[70] flex flex-col bg-lp-bg px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] data-[state=open]:animate-fade-in"
                  aria-label="Mobile navigation"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AppLogo size="sm" />
                      <span className="text-lg font-bold tracking-tight text-lp-text">{APP_SHORT_NAME}</span>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close menu"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--lp-r-md)] border border-[var(--lp-border)] text-lp-text"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <ul className="mt-10 flex flex-1 flex-col gap-2">
                    {NAV_LINKS.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between rounded-[var(--lp-r-md)] py-4 text-2xl font-semibold text-lp-text transition-colors hover:text-lp-violet-300"
                        >
                          <span>{link.en}</span>
                          <span lang="bn" className="bn text-base text-lp-dim">
                            {link.bn}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-3">
                    <LpButton asChild size="lg" className="w-full">
                      <a href={signupHref("pro")} onClick={() => setOpen(false)}>
                        <span lang="bn" className="bn">
                          ৫ দিন ফ্রি শুরু করুন
                        </span>
                      </a>
                    </LpButton>
                    <LpButton asChild variant="ghost" size="lg" className="w-full">
                      <a href="/auth/login" onClick={() => setOpen(false)}>
                        Log in
                      </a>
                    </LpButton>
                    <a
                      href={WA_SUPPORT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center justify-center gap-2 text-sm font-medium text-lp-green-400"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="lp-tnum">{WA_SUPPORT_DISPLAY}</span>
                    </a>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </nav>
    </header>
  );
}
