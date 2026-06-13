import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

import { SectionShell } from "./ui/SectionShell";
import { Reveal } from "./ui/Reveal";
import { WA_SUPPORT_URL } from "./config";

interface Faq {
  q: string;
  qBn: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "Can I keep my existing WhatsApp number?",
    qBn: "আমার বর্তমান নম্বর রাখতে পারব?",
    a: "Yes. What A App connects to your existing WhatsApp number — no new number and nothing for your customers to install. Your chats keep coming to the same number, now in one shared inbox.",
  },
  {
    q: "Can I take payments via bKash & Nagad?",
    qBn: "bKash / Nagad দিয়ে পেমেন্ট নেওয়া যাবে?",
    a: "Yes. Send bKash and Nagad payment links straight from a chat, confirm transactions, and keep everything reconciled with the order — no separate spreadsheet.",
  },
  {
    q: "Will I be auto-charged after the 5-day free trial?",
    qBn: "৫ দিন পর কি অটো-চার্জ হবে?",
    a: "No surprises. The 5-day trial needs no card to start. We only charge once you choose a plan and pay — you will never be auto-charged without confirming.",
  },
  {
    q: "How many agents can use it together?",
    qBn: "কতজন এজেন্ট একসাথে ব্যবহার করতে পারবে?",
    a: "It depends on your plan: Starter includes 2 agents, Pro includes 5, and Business includes 15. Everyone shares one inbox and can be assigned chats. Need more? Enterprise is flexible.",
  },
  {
    q: "Which couriers are supported?",
    qBn: "কোন কুরিয়ার সাপোর্ট করে?",
    a: "Book and track major Bangladeshi couriers including Pathao, RedX and Steadfast directly from the order — and share live delivery status with the customer automatically.",
  },
  {
    q: "Does it work without English?",
    qBn: "ইংরেজি ছাড়া কি চলবে?",
    a: "Absolutely. The interface and the AI replies both work in Bangla. You and your team can run everything in Bangla, and the AI answers your customers in Bangla too.",
  },
  {
    q: "Who owns my customer data — and what if I get banned?",
    qBn: "আমার কাস্টমার ডেটার মালিক কে?",
    a: "You do. Your contacts, chats and orders are stored securely on your side, so a page or number ban can't erase them. You can export your data any time and re-engage customers on a new number or channel.",
  },
];

function FaqItem({ faq, value }: { faq: Faq; value: string }) {
  return (
    <Accordion.Item value={value} className="border-b border-[var(--lp-border)]">
      <Accordion.Header className="flex">
        <Accordion.Trigger className="group flex flex-1 items-start justify-between gap-4 py-5 text-left">
          <span className="text-[var(--lp-text-h3)] font-semibold text-lp-text transition-colors group-hover:text-lp-violet-300">
            {faq.q}
            <span lang="bn" className="bn mt-1 block text-sm font-normal text-lp-dim">
              {faq.qBn}
            </span>
          </span>
          <Plus
            aria-hidden="true"
            className="lp-faq-icon mt-1 h-5 w-5 shrink-0 text-lp-violet-400 transition-transform [transition-duration:var(--lp-dur)]"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <p className="max-w-[60ch] pb-5 text-[var(--lp-text-body)] leading-relaxed text-lp-muted">{faq.a}</p>
      </Accordion.Content>
    </Accordion.Item>
  );
}

export function Faq() {
  const mid = Math.ceil(FAQS.length / 2);
  const left = FAQS.slice(0, mid);
  const right = FAQS.slice(mid);

  return (
    <SectionShell id="faqs" labelledBy="faqs-heading">
      <div className="mx-auto max-w-[640px] text-center">
        <Reveal>
          <h2 id="faqs-heading" className="text-[var(--lp-text-h2)] font-bold tracking-tight text-lp-text">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-[var(--lp-text-body)] text-lp-muted">
            Still curious?{" "}
            <a
              href={WA_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-lp-green-400 hover:underline"
            >
              Message us on WhatsApp
            </a>
            .
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-10 grid max-w-[1000px] gap-x-10 md:grid-cols-2">
        <Accordion.Root type="single" collapsible>
          {left.map((faq, i) => (
            <FaqItem key={faq.q} faq={faq} value={`l-${i}`} />
          ))}
        </Accordion.Root>
        <Accordion.Root type="single" collapsible>
          {right.map((faq, i) => (
            <FaqItem key={faq.q} faq={faq} value={`r-${i}`} />
          ))}
        </Accordion.Root>
      </div>
    </SectionShell>
  );
}
