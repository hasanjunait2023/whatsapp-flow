/**
 * PWA runtime: service-worker registration + web-push subscription. The SW is
 * a hand-rolled static file (public/sw.js) — no build plugin involved.
 */

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure leaves the app a normal SPA.
    });
  });
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Asks for permission, subscribes, and registers the subscription with the
 * backend. Returns true on success.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidKey),
    }));

  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.functions.invoke("push-subscribe", {
    body: subscription.toJSON(),
  });
  return !error;
}

export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.functions.invoke("push-unsubscribe", {
    body: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}
