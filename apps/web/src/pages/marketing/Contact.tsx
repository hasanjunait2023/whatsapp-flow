import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, Send, CheckCircle2, Clock } from "lucide-react";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { LpButton } from "@/components/landing/ui/LpButton";
import { LpThemeProvider } from "@/components/landing/LpThemeContext";

import "@/styles/landing.css";
import "@/styles/marketing.css";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "sales", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSent(true);
  }

  return (
    <LpThemeProvider>
      {(theme) => (
        <div className="lp min-h-screen flex flex-col" data-theme={theme}>
          <Nav />

          <section className="lp-section lp-section-tight">
            <div className="lp-section-head">
              <span className="lp-eyebrow">
                <MessageSquare size={14} /> Contact
              </span>
              <h1 className="lp-display">Let's talk</h1>
              <p className="lp-lead">Sales, support, partnership — we reply within 24 hours.</p>
            </div>

            <div className="ecx-contact-grid">
              <div className="ecx-contact-info">
                <div className="ecx-contact-item">
                  <Mail size={20} />
                  <div>
                    <strong>Email</strong>
                    <a href="mailto:hello@ecomex.cloud">hello@ecomex.cloud</a>
                  </div>
                </div>
                <div className="ecx-contact-item">
                  <Phone size={20} />
                  <div>
                    <strong>Phone</strong>
                    <a href="tel:+8801700000000">+880 1700-000000</a>
                  </div>
                </div>
                <div className="ecx-contact-item">
                  <MessageSquare size={20} />
                  <div>
                    <strong>WhatsApp</strong>
                    <a href="https://wa.me/8801700000000">+880 1700-000000</a>
                  </div>
                </div>
                <div className="ecx-contact-item">
                  <MapPin size={20} />
                  <div>
                    <strong>Office</strong>
                    <span>House 12, Road 7, Dhanmondi, Dhaka 1205, Bangladesh</span>
                  </div>
                </div>

                <div className="ecx-contact-hours">
                  <h4>
                    <Clock size={16} /> Support hours
                  </h4>
                  <ul>
                    <li>Mon–Fri: 9 AM – 10 PM</li>
                    <li>Sat: 10 AM – 6 PM</li>
                    <li>Sun: Pro customers only</li>
                  </ul>
                </div>

                <div className="ecx-contact-map">
                  <img loading="lazy" decoding="async" src="/marketing/photos/dhaka-map.webp" alt="Dhaka cityscape" className="ecx-contact-map-img" />
                </div>
              </div>

              <form className="ecx-contact-form" onSubmit={submit}>
                {sent ? (
                  <div className="ecx-contact-success">
                    <CheckCircle2 size={48} />
                    <h3>Message sent!</h3>
                    <p>We'll reply within 24 hours.</p>
                  </div>
                ) : (
                  <>
                    <label>
                      <span>Your name</span>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Sakib Hossain"
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      <span>Topic</span>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      >
                        <option value="sales">Sales inquiry</option>
                        <option value="support">Customer support</option>
                        <option value="partners">Partnership</option>
                        <option value="press">Press / media</option>
                      </select>
                    </label>
                    <label>
                      <span>Message</span>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us what you need..."
                      />
                    </label>
                    <LpButton type="submit" variant="primary" size="lg" disabled={submitting}>
                      {submitting ? "Sending..." : <>Send message <Send size={16} /></>}
                    </LpButton>
                  </>
                )}
              </form>
            </div>
          </section>

          <Footer />
        </div>
      )}
    </LpThemeProvider>
  );
}