import { ReactNode } from 'react';
import { BrandedLogo } from '@/components/BrandedLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ProductShowcase } from './ProductShowcase';

/**
 * AuthLayout — left brand hero + right form area.
 * 2026-07-01 brand refresh: violet gradient hero + ribbon-fold logo with shimmer reveal.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT — Brand Hero */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden ecx-hero">
        {/* Floating orbs (motion) */}
        <div className="ecx-hero__orb ecx-hero__orb--1" />
        <div className="ecx-hero__orb ecx-hero__orb--2" />

        {/* Brand cluster at top */}
        <div className="relative z-10 flex items-center justify-between p-8 lg:p-12">
          <BrandedLogo theme="dark" size="lg" />
          <LanguageSwitcher />
        </div>

        {/* Center brand mark with masked reveal */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="ecx-reveal mb-8">
            <img
              src="/brand/icon-square-512.png"
              alt="Ecomex"
              className="ecx-motion w-40 h-40 mx-auto rounded-[20%] shadow-[0_20px_60px_rgba(124,58,237,0.5)]"
            />
          </div>
          <h1 className="ecx-wordmark ecx-wordmark--light text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight">
            Ecomex
          </h1>
          <p className="text-violet-200 text-lg lg:text-xl font-medium tracking-wide uppercase opacity-80">
            Automation
          </p>
          <p className="mt-6 text-violet-100/70 text-base max-w-md leading-relaxed">
            Connect your WhatsApp Business number, automate conversations at scale, and grow revenue.
          </p>
        </div>

        {/* Bottom social proof area */}
        <div className="relative z-10 px-8 pb-8 text-center text-violet-200/60 text-xs">
          <span>Trusted by 2,000+ businesses worldwide</span>
        </div>
      </div>

      {/* RIGHT — Form area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 text-center">
            <BrandedLogo theme="light" size="md" className="mx-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

interface AuthLayoutProps {
  children: ReactNode;
}
