import { useEffect } from "react";

import { trackingConfig } from "@/lib/tracking";

/**
 * Injects ad/analytics loader scripts for whichever platforms are configured via
 * VITE_* env vars. Each platform is skipped silently when its ID is unset, so this
 * renders nothing and does no network work in a default (unconfigured) deploy.
 *
 * Mount once near the landing root. Scripts are appended to <head> exactly once.
 */
export function PixelScripts() {
  const { metaPixelId, ga4Id, googleAdsId, tiktokPixelId } = trackingConfig;

  // Trackers load on browser-idle, never competing with the page's first paint
  // or time-to-interactive. PageView still fires (just a beat later).
  useEffect(() => {
    if (metaPixelId) return whenIdle(() => injectMetaPixel(metaPixelId));
  }, [metaPixelId]);

  useEffect(() => {
    const gaId = ga4Id || googleAdsId;
    if (gaId) return whenIdle(() => injectGtag(gaId, ga4Id, googleAdsId));
  }, [ga4Id, googleAdsId]);

  useEffect(() => {
    if (tiktokPixelId) return whenIdle(() => injectTiktokPixel(tiktokPixelId));
  }, [tiktokPixelId]);

  return null;
}

/** Runs fn when the browser is idle (rIC), with a setTimeout fallback. Returns a cleanup. */
function whenIdle(fn: () => void): () => void {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(fn, { timeout: 3000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 1200);
  return () => window.clearTimeout(id);
}

function once(id: string): boolean {
  if (document.getElementById(id)) return false;
  return true;
}

function injectMetaPixel(pixelId: string): void {
  if (!once("lp-meta-pixel")) return;
  const s = document.createElement("script");
  s.id = "lp-meta-pixel";
  s.async = true;
  s.text = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}'); fbq('track', 'PageView');
  `;
  document.head.appendChild(s);
}

function injectGtag(loaderId: string, ga4Id?: string, googleAdsId?: string): void {
  if (!once("lp-gtag-loader")) return;
  const loader = document.createElement("script");
  loader.id = "lp-gtag-loader";
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${loaderId}`;
  document.head.appendChild(loader);

  const init = document.createElement("script");
  init.id = "lp-gtag-init";
  const configs: string[] = [];
  if (ga4Id) configs.push(`gtag('config', '${ga4Id}');`);
  if (googleAdsId) configs.push(`gtag('config', '${googleAdsId}');`);
  init.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    ${configs.join("\n")}
  `;
  document.head.appendChild(init);
}

function injectTiktokPixel(pixelId: string): void {
  if (!once("lp-tiktok-pixel")) return;
  const s = document.createElement("script");
  s.id = "lp-tiktok-pixel";
  s.text = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
        var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(s);
}
