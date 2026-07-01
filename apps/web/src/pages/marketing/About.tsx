import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { FinalCta } from "@/components/landing/FinalCta";
import { LpButton } from "@/components/landing/ui/LpButton";
import { LpThemeProvider } from "@/components/landing/LpThemeContext";

import "@/styles/landing.css";
import "@/styles/marketing.css";

export default function AboutPage() {
  const team = [
    { name: "Junait Hasan", role: "Founder & CEO", photo: "/marketing/photos/team/junait.jpg" },
    { name: "Sabbir Ahmed", role: "CTO", photo: "/marketing/photos/team/sabbir.jpg" },
    { name: "Mushfika Rahman", role: "Head of Design", photo: "/marketing/photos/team/mushfika.jpg" },
    { name: "Tareq Aziz", role: "Head of Growth", photo: "/marketing/photos/team/tareq.jpg" },
  ];

  return (
    <LpThemeProvider>
      {(theme) => (
        <div className="lp min-h-screen flex flex-col" data-theme={theme}>
          <Nav />

          <section className="lp-section lp-section-tight">
            <div className="lp-section-head lp-section-head-left">
              <span className="lp-eyebrow">Our story</span>
              <h1 className="lp-display">Digitising Bangladesh's SMEs, one WhatsApp at a time</h1>
              <p className="lp-lead">
                Ecomex started in 2025 in Dhaka with one goal: give every small and medium business in Bangladesh
                access to the same WhatsApp automation tools that big enterprises use.
              </p>
            </div>

            <div className="ecx-about-hero">
              <img
                src="/marketing/photos/office-dhaka.jpg"
                alt="Ecomex team at our Dhaka office"
                className="ecx-about-hero-img"
              />
            </div>
          </section>

          <section className="lp-section lp-section-alt">
            <div className="ecx-about-grid">
              <div className="ecx-about-card">
                <div className="ecx-about-icon"><CheckCircle2 size={32} /></div>
                <h3 className="lp-h3">Mission</h3>
                <p className="lp-text">Make WhatsApp a professional marketing channel for every shopkeeper and small business in Bangladesh.</p>
              </div>
              <div className="ecx-about-card">
                <div className="ecx-about-icon"><CheckCircle2 size={32} /></div>
                <h3 className="lp-h3">Vision</h3>
                <p className="lp-text">Become the default WhatsApp commerce platform for South Asian SMEs — 100,000 businesses by 2030.</p>
              </div>
              <div className="ecx-about-card">
                <div className="ecx-about-icon"><CheckCircle2 size={32} /></div>
                <h3 className="lp-h3">Team</h3>
                <p className="lp-text">25 people, all Dhaka-based. Engineers, designers, growth, support — everyone works for customer success.</p>
              </div>
            </div>
          </section>

          <section className="lp-section">
            <div className="lp-section-head">
              <h2 className="lp-h2">Our team</h2>
              <p className="lp-lead">The people building Ecomex for Bangladesh's businesses.</p>
            </div>
            <div className="ecx-team-grid">
              {team.map((m) => (
                <div key={m.name} className="ecx-team-card">
                  <img src={m.photo} alt={m.name} className="ecx-team-avatar" />
                  <h4>{m.name}</h4>
                  <p>{m.role}</p>
                </div>
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