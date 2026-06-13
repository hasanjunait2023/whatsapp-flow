import { MessageCircle, ShoppingBag, Bot, CheckCheck } from 'lucide-react';

/**
 * Premium SaaS-style product showcase for the auth split-screen — replaces the
 * old YouTube iframe (slow, off-brand). Pure CSS/SVG: a glassmorphic "live
 * product" card mocking the WhatsApp CRM inbox + an AI auto-reply (Bangla) + an
 * order card, floating on the gradient. Zero network cost, paints instantly,
 * gives a polished first impression. Mockup copy is illustrative (not i18n).
 */
export function ProductShowcase() {
  return (
    <div className="relative w-full max-w-md">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 rounded-[28px] bg-white/10 blur-2xl" aria-hidden />

      {/* The product card */}
      <div className="relative rounded-[22px] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 animate-[float_6s_ease-in-out_infinite]">
        {/* Card chrome */}
        <div className="flex items-center justify-between rounded-t-[14px] bg-white/95 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-slate-900">Rahim Fashion</p>
              <p className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                online
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            WhatsApp
          </span>
        </div>

        {/* Chat body */}
        <div className="space-y-2.5 bg-[#e8f3ec] px-3 py-3.5">
          {/* Inbound (Bangla customer) */}
          <div className="flex">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[12px] text-slate-700 shadow-sm">
              ভাই, এই শার্টটা কি স্টকে আছে? দাম কত? 🙂
            </div>
          </div>

          {/* AI auto-reply (Bangla) */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[12px] text-slate-800 shadow-sm">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <Bot className="h-3 w-3" /> AI Auto-reply
              </span>
              জি ভাই, স্টকে আছে ✅ দাম ১,২৫০৳। অর্ডার করতে চাইলে নাম, ঠিকানা আর ফোন নম্বর দিন।
              <span className="mt-1 flex items-center justify-end gap-0.5 text-[9px] text-emerald-600">
                <CheckCheck className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Order card */}
          <div className="flex justify-end">
            <div className="w-[85%] rounded-2xl rounded-tr-sm border border-emerald-100 bg-white px-3 py-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <div className="flex-1 leading-tight">
                  <p className="text-[11px] font-semibold text-slate-900">New order · #1048</p>
                  <p className="text-[10px] text-slate-500">Cotton Shirt × 1</p>
                </div>
                <p className="text-[12px] font-bold text-emerald-600">৳1,250</p>
              </div>
              <div className="mt-2 flex gap-1.5">
                <span className="flex-1 rounded-md bg-emerald-500 px-2 py-1 text-center text-[10px] font-semibold text-white">
                  Confirm
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-center text-[10px] font-medium text-slate-600">
                  Book courier
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer metric strip */}
        <div className="flex items-center justify-between rounded-b-[14px] bg-white/95 px-4 py-2">
          <span className="text-[10px] font-medium text-slate-500">Auto-handled in 2s</span>
          <span className="text-[11px] font-bold text-emerald-600">+38% faster replies</span>
        </div>
      </div>
    </div>
  );
}
