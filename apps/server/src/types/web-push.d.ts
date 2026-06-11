/**
 * Minimal declaration for the optional "web-push" dependency. The package is
 * listed in package.json but may be absent until the next successful install
 * (services/push.ts dynamic-imports it and degrades gracefully). Replace with
 * @types/web-push once dependency installation is available again.
 */
declare module "web-push" {
  interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
  }
  interface PushSubscription {
    endpoint: string;
    keys: PushSubscriptionKeys;
  }
  interface SendResult {
    statusCode: number;
  }
  interface WebPushError extends Error {
    statusCode: number;
  }
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(
    subscription: PushSubscription,
    payload?: string,
  ): Promise<SendResult>;
  export { setVapidDetails, sendNotification, PushSubscription, SendResult, WebPushError };
}
