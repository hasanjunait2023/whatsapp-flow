/**
 * Hook point fired after an inbound message is persisted (webhook tx committed).
 * Consumers (e.g. the Hermes AI agent pipeline) register at startup; the webhook
 * route never needs to change when a new consumer is added. Hooks must not
 * throw into the webhook path — failures are logged and swallowed.
 */

export interface InboundMessageEvent {
  messageId: string;
  contactId: string;
  tenantId: string;
  instanceId: string;
  isNewContact: boolean;
  channel: "whatsapp" | "facebook";
  /** Inbound message text/caption — used by the opt-out (STOP) handler. */
  text?: string;
}

type InboundHook = (event: InboundMessageEvent) => void | Promise<void>;

const hooks: InboundHook[] = [];

export function onInboundMessagePersisted(hook: InboundHook): void {
  hooks.push(hook);
}

export function fireInboundMessagePersisted(event: InboundMessageEvent): void {
  for (const hook of hooks) {
    try {
      const result = hook(event);
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error("[inbound-hooks] async hook failed:", err);
        });
      }
    } catch (err) {
      console.error("[inbound-hooks] hook failed:", err);
    }
  }
}
