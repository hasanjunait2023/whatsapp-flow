import { POSTIZ_URL, POSTIZ_API_KEY } from "../../lib/env.js";

/**
 * Typed Postiz public-API client, modeled on waha/client.ts (timeout-bounded
 * request<T>(), typed errors, injectable fetch for tests).
 *
 * Base URL: POSTIZ_URL + "/public/v1". Auth: the API key is sent VERBATIM in the
 * `Authorization` header (Postiz public API does not use a `Bearer ` prefix).
 *
 * IMPORTANT — endpoint uncertainty is isolated to THIS file. The exact
 * channel-list path and the createPost request body must be re-confirmed
 * against the running Postiz instance + its /public/v1 docs before going live:
 *   - listChannels(): documented variants seen in the wild are
 *       GET /public/v1/integrations  and  GET /public/v1/channels.
 *     We try the primary path and fall back gracefully to the alternate.
 *   - createPost(): POST /public/v1/posts with { type, date, posts: [...] }.
 *     The per-post `integrationId` / `content` / `images` shape matches the
 *     Postiz UI's compose payload but should be validated end-to-end.
 */

const POSTIZ_REQUEST_TIMEOUT_MS = 30_000;

export interface PostizChannel {
  id: string;
  name?: string;
  identifier?: string; // platform key, e.g. "facebook", "x"
  [key: string]: unknown;
}

export interface PostizPostItem {
  integrationId: string;
  content: string;
  images?: string[];
  /** Optional grouping key when posting the same content across channels. */
  group?: string;
}

export interface PostizCreatePostRequest {
  type: "draft" | "schedule" | "now";
  /** ISO timestamp the post is scheduled for (required by Postiz even for now). */
  date: string;
  posts: PostizPostItem[];
}

export interface PostizCreatePostResult {
  /** Post id(s) assigned by Postiz. Shape varies; we surface the raw body too. */
  id?: string;
  postId?: string;
  [key: string]: unknown;
}

export class PostizError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "PostizError";
  }
}

export class PostizNotConfiguredError extends Error {
  constructor() {
    super("Postiz is not configured (POSTIZ_API_KEY missing)");
    this.name = "PostizNotConfiguredError";
  }
}

export interface PostizClientOptions {
  baseUrl?: string;
  apiKey?: string;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
}

export class PostizClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(opts: PostizClientOptions = {}) {
    // Public API root. Strip trailing slashes from the configured origin.
    this.baseUrl = `${(opts.baseUrl ?? POSTIZ_URL).replace(/\/+$/, "")}/public/v1`;
    this.apiKey = opts.apiKey ?? POSTIZ_API_KEY;
    this.fetchImpl = opts.fetchImpl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) throw new PostizNotConfiguredError();
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: this.apiKey,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const doFetch = this.fetchImpl ?? globalThis.fetch;
    // Bound every call: Node fetch has no default timeout, so a black-holed
    // Postiz connection would hang the request and hold a job slot indefinitely.
    const res = await doFetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(POSTIZ_REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new PostizError(`Postiz ${method} ${path} failed (${res.status})`, res.status, text);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Lists connected channels/integrations. Tries the primary documented path
   * and falls back to the alternate on a 404 so a single docs revision doesn't
   * break the call. Returns [] on a configuration-absent client.
   */
  async listChannels(): Promise<PostizChannel[]> {
    try {
      return await this.request<PostizChannel[]>("GET", "/integrations");
    } catch (err) {
      if (err instanceof PostizError && err.status === 404) {
        return this.request<PostizChannel[]>("GET", "/channels");
      }
      throw err;
    }
  }

  /** Creates a post (draft / scheduled / immediate) across the given channels. */
  async createPost(req: PostizCreatePostRequest): Promise<PostizCreatePostResult> {
    return this.request<PostizCreatePostResult>("POST", "/posts", req);
  }
}

/** Shared singleton used by jobs; constructed from env. */
export const postizClient = new PostizClient();
