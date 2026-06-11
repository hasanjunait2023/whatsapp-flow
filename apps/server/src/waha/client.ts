import { WAHA_URL, WAHA_API_KEY, WAHA_SINGLE_SESSION } from "../lib/env.js";

/**
 * Typed WAHA (WhatsApp HTTP API) REST client. Authenticates with the X-Api-Key
 * header. In single-session mode (WAHA Core / pilot) every instance id maps to
 * the lone `default` session; in Plus mode the session name equals the instance
 * id so each tenant instance gets its own session.
 */

export interface WahaWebhookConfig {
  url: string;
  events: string[];
  hmac?: { key: string } | null;
}

export interface WahaSession {
  name: string;
  status: WahaSessionStatus;
  config?: { webhooks?: WahaWebhookConfig[] };
  me?: { id: string; pushName?: string } | null;
  engine?: { engine?: string };
}

export type WahaSessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

export interface WahaSendTextRequest {
  session: string;
  chatId: string;
  text: string;
  reply_to?: string | null;
}

export interface WahaSendMediaRequest {
  session: string;
  chatId: string;
  file: { url?: string; mimetype?: string; filename?: string };
  caption?: string;
  reply_to?: string | null;
}

export interface WahaSendResult {
  /** WhatsApp message id assigned by WAHA, e.g. true_1555..._ABCD. */
  id?: string;
  [key: string]: unknown;
}

export class WahaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "WahaError";
  }
}

/** Maps an instance id to a WAHA session name, honoring single-session mode. */
export function sessionNameForInstance(instanceId: string): string {
  return WAHA_SINGLE_SESSION ? "default" : instanceId;
}

export interface WahaClientOptions {
  baseUrl?: string;
  apiKey?: string;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
}

export class WahaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(opts: WahaClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? WAHA_URL).replace(/\/+$/, "");
    this.apiKey = opts.apiKey ?? WAHA_API_KEY;
    // Resolve fetch lazily when not injected so test spies on globalThis.fetch
    // are honored by the shared singleton.
    this.fetchImpl = opts.fetchImpl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Api-Key": this.apiKey,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const doFetch = this.fetchImpl ?? globalThis.fetch;
    const res = await doFetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new WahaError(`WAHA ${method} ${path} failed (${res.status})`, res.status, text);
    }
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Creates (or upserts) a session with a webhook pointing at our backend.
   * WAHA Core auto-provides a `default` session; PUT updates its config instead
   * of POSTing a new one when in single-session mode.
   */
  async createSession(
    name: string,
    webhookUrl: string,
    events: string[],
    hmacSecret?: string,
  ): Promise<WahaSession> {
    const config = {
      webhooks: [
        {
          url: webhookUrl,
          events,
          ...(hmacSecret ? { hmac: { key: hmacSecret } } : {}),
        },
      ],
    };
    if (name === "default") {
      // Core's default session already exists; update its webhook config.
      return this.request<WahaSession>("PUT", `/api/sessions/${name}`, { config });
    }
    return this.request<WahaSession>("POST", "/api/sessions", { name, config });
  }

  async startSession(name: string): Promise<WahaSession> {
    return this.request<WahaSession>("POST", `/api/sessions/${name}/start`, {});
  }

  async stopSession(name: string): Promise<WahaSession> {
    return this.request<WahaSession>("POST", `/api/sessions/${name}/stop`, {});
  }

  async getSession(name: string): Promise<WahaSession> {
    return this.request<WahaSession>("GET", `/api/sessions/${name}`);
  }

  async logout(name: string): Promise<void> {
    await this.request<void>("POST", `/api/sessions/${name}/logout`, {});
  }

  /** Fetches the QR code as a base64 data URI for the awaiting-scan session. */
  async getQr(name: string): Promise<{ qr: string; mimetype: string }> {
    const res = await this.request<{ data?: string; mimetype?: string }>(
      "GET",
      `/api/${name}/auth/qr?format=raw`,
    );
    const value = res?.data ?? "";
    const mimetype = res?.mimetype ?? "image/png";
    const qr = value.startsWith("data:") ? value : `data:${mimetype};base64,${value}`;
    return { qr, mimetype };
  }

  async sendText(req: WahaSendTextRequest): Promise<WahaSendResult> {
    return this.request<WahaSendResult>("POST", "/api/sendText", req);
  }

  async sendImage(req: WahaSendMediaRequest): Promise<WahaSendResult> {
    return this.request<WahaSendResult>("POST", "/api/sendImage", req);
  }

  async sendFile(req: WahaSendMediaRequest): Promise<WahaSendResult> {
    return this.request<WahaSendResult>("POST", "/api/sendFile", req);
  }

  async getMessages(name: string, chatId: string, limit = 50): Promise<unknown[]> {
    const params = new URLSearchParams({ session: name, chatId, limit: String(limit) });
    return this.request<unknown[]>("GET", `/api/messages?${params.toString()}`);
  }
}

/** Shared singleton used by routes/jobs; constructed from env. */
export const wahaClient = new WahaClient();
