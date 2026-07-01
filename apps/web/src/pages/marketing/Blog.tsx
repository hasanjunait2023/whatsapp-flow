import { Link } from "react-router-dom";
import { Calendar, User, BookOpen } from "lucide-react";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { LpThemeProvider } from "@/components/landing/LpThemeContext";

import "@/styles/landing.css";
import "@/styles/marketing.css";

const posts = [
  { slug: "whatsapp-ban-protect", title: "7 golden rules to keep your WhatsApp out of ban territory", excerpt: "Bulk WhatsApp sending scares many businesses. Here's how our 500+ customers have stayed ban-free for over a year.", author: "Sabbir Ahmed", date: "2 June 2026", minutes: "6 min", tag: "Guide", photo: "/marketing/photos/blog/whatsapp-ban.webp" },
  { slug: "bkash-payment-automation", title: "bKash + WhatsApp payment automation — the complete guide", excerpt: "Step-by-step how to connect your bKash merchant account to Ecomex, send payment links, and auto-reconcile.", author: "Tareq Aziz", date: "24 May 2026", minutes: "10 min", tag: "Tutorial", photo: "/marketing/photos/blog/bkash-payment.webp" },
  { slug: "eid-campaign-case-study", title: "Case study: How we sent 50,000 messages in 2 hours for Eid", excerpt: "Dhaka Fashion House's Eid 2026 campaign — strategy, templates, results, ROI breakdown.", author: "Nusrat Jahan", date: "10 May 2026", minutes: "8 min", tag: "Case study", photo: "/marketing/photos/blog/eid-campaign.webp" },
  { slug: "whatsapp-business-api-bd", title: "WhatsApp Business API in Bangladesh — everything you need to know", excerpt: "Meta verification, BDT pricing, hosting requirements, and the latest 2026 updates.", author: "Sabbir Ahmed", date: "1 May 2026", minutes: "12 min", tag: "Guide", photo: "/marketing/photos/blog/whatsapp-api.webp" },
  { slug: "segmentation-strategies", title: "Why 80% of your revenue comes from 20% of your customers", excerpt: "Pareto in WhatsApp marketing — how to identify top customers, segment them, and treat them right.", author: "Tareq Aziz", date: "20 April 2026", minutes: "7 min", tag: "Strategy", photo: "/marketing/photos/blog/segmentation.webp" },
  { slug: "ecommerce-trends-2026", title: "10 Bangladesh eCommerce trends for 2026 that will change everything", excerpt: "WhatsApp commerce, BNPL, voice search, AI personalization — predictions and how to prepare.", author: "Junait Hasan", date: "5 April 2026", minutes: "9 min", tag: "Industry", photo: "/marketing/photos/blog/ecommerce-trends.webp" },
];

export default function BlogPage() {
  return (
    <LpThemeProvider>
      {(theme) => (
        <div className="lp min-h-screen flex flex-col" data-theme={theme}>
          <Nav />

          <section className="lp-section lp-section-tight">
            <div className="lp-section-head">
              <span className="lp-eyebrow">
                <BookOpen size={14} /> Blog
              </span>
              <h1 className="lp-display">Ecomex Blog</h1>
              <p className="lp-lead">
                WhatsApp marketing, Bangladesh eCommerce, customer growth — real stories and practical guides.
              </p>
            </div>

            <div className="ecx-blog-grid">
              {posts.map((p, idx) => (
                <article key={p.slug} className={`ecx-blog-card ${idx === 0 ? "ecx-blog-card-hero" : ""}`}>
                  <Link to={`/blog/${p.slug}`} className="ecx-blog-card-link">
                    <div className="ecx-blog-thumb">
                      <img loading="lazy" decoding="async" src={p.photo} alt={p.title} className="ecx-blog-thumb-img" />
                      <span className="ecx-blog-tag">{p.tag}</span>
                    </div>
                    <div className="ecx-blog-body">
                      <h3 className="lp-h3">{p.title}</h3>
                      <p className="lp-text">{p.excerpt}</p>
                      <div className="ecx-blog-meta">
                        <span><User size={14} /> {p.author}</span>
                        <span><Calendar size={14} /> {p.date}</span>
                        <span>· {p.minutes}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <Footer />
        </div>
      )}
    </LpThemeProvider>
  );
}