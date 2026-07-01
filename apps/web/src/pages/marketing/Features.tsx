import {
  Send, Bot, ShoppingCart, Wallet, Users, BarChart3,
  Shield, Globe2, MessageSquare, Webhook, Languages, Headphones,
} from "lucide-react";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { FinalCta } from "@/components/landing/FinalCta";
import { LpThemeProvider } from "@/components/landing/LpThemeContext";

import "@/styles/landing.css";
import "@/styles/marketing.css";

const features = [
  { icon: <Send size={28} />, title: "Bulk WhatsApp send", desc: "Import contacts from CSV/Excel and send personalized messages to 10,000+ recipients. Each recipient's name, order history, and location auto-merge into the message.", photo: "/marketing/photos/feat-bulk.webp" },
  { icon: <Bot size={28} />, title: "Auto-reply chatbot", desc: "Reply on your behalf 24/7. Handles FAQs, forwards qualified leads, gracefully falls back on edge cases. Works in Bangla + English.", photo: "/marketing/photos/feat-bot.webp" },
  { icon: <ShoppingCart size={28} />, title: "WhatsApp commerce", desc: "Customers browse products, build carts, and check out — all inside the chat. Ecomex gives you a mini storefront that runs inside WhatsApp.", photo: "/marketing/photos/feat-cart.webp" },
  { icon: <Wallet size={28} />, title: "Payment automation", desc: "bKash, Nagad, Rocket, SSLCommerz — all gateways supported. Auto invoice, receipt, reconciliation. Customer pays from the message, you see it in the dashboard.", photo: "/marketing/photos/feat-payment.webp" },
  { icon: <Users size={28} />, title: "Customer CRM", desc: "Every contact's purchase history, conversation history, tag, custom field, segment — all in one place. Track lifetime value.", photo: "/marketing/photos/feat-crm.webp" },
  { icon: <BarChart3 size={28} />, title: "Campaign analytics", desc: "Delivery, read, reply, and conversion rates — real-time for every campaign. See which segments respond best. A/B test subject lines.", photo: "/marketing/photos/feat-analytics.webp" },
  { icon: <Shield size={28} />, title: "Anti-ban protection", desc: "Smart warm-up, throttling, and rotation keep your WhatsApp account safe. Meta-approved templates and verified sender profile.", photo: "/marketing/photos/feat-antiban.webp" },
  { icon: <Globe2 size={28} />, title: "Multi-channel", desc: "Not just WhatsApp — Facebook Messenger, Instagram DM, and web chat all in one inbox. Unified customer view.", photo: "/marketing/photos/feat-multichannel.webp" },
  { icon: <MessageSquare size={28} />, title: "Team inbox", desc: "The whole team sees one inbox. Assign, mention, internal notes — Linear-grade collaboration built into WhatsApp messaging.", photo: "/marketing/photos/feat-team.webp" },
  { icon: <Webhook size={28} />, title: "Developer API", desc: "REST API, webhooks, and Zapier integration. Connect your existing ERP, POS, or accounting system.", photo: "/marketing/photos/feat-api.webp" },
  { icon: <Languages size={28} />, title: "Bangla-first", desc: "Full UI, template library, and support in Bangla. Your customers message in Bangla, we handle it.", photo: "/marketing/photos/feat-bangla.webp" },
  { icon: <Headphones size={28} />, title: "Local support", desc: "Dhaka-based team, 24/7 phone + chat + WhatsApp support. We stand with you when problems hit.", photo: "/marketing/photos/feat-support.webp" },
];

export default function FeaturesPage() {
  return (
    <LpThemeProvider>
      {(theme) => (
        <div className="lp min-h-screen flex flex-col" data-theme={theme}>
          <Nav />

          <section className="lp-section lp-section-tight">
            <div className="lp-section-head">
              <span className="lp-eyebrow">
                <Send size={14} /> Features
              </span>
              <h1 className="lp-display">Every feature your business needs, one platform</h1>
              <p className="lp-lead">
                Marketing, sales, and support — run everything from one place with Ecomex.
              </p>
            </div>

            <div className="ecx-feat-stack">
              {features.map((f, idx) => (
                <article key={f.title} className={`ecx-feat-row ${idx % 2 ? "ecx-feat-row-rev" : ""}`}>
                  <div className="ecx-feat-text">
                    <div className="ecx-feat-icon-big">{f.icon}</div>
                    <h3 className="lp-h3">{f.title}</h3>
                    <p className="lp-text">{f.desc}</p>
                  </div>
                  <div className="ecx-feat-visual">
                    <img loading="lazy" decoding="async" src={f.photo} alt={f.title} className="ecx-feat-img" />
                  </div>
                </article>
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