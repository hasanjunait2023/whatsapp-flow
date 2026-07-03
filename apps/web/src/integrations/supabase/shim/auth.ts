import type { User, Session } from "@supabase/supabase-js";

/**
 * supabase-js-shaped auth adapter over better-auth's REST endpoints
 * (mounted at /api/auth/*). Emits User/Session objects whose shape matches what
 * the app consumes (see apps/web/src/hooks/useAuth.tsx): session.user, user.id,
 * user.email, user.user_metadata.full_name.
 */

const AUTH_BASE = "/api/auth";

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED";
type AuthCallback = (event: AuthEvent, session: Session | null) => void;

interface BetterAuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface BetterAuthSession {
  user?: BetterAuthUser;
  session?: { token?: string; expiresAt?: string };
}

function toUser(u: BetterAuthUser): User {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: undefined,
    phone: "",
    confirmed_at: undefined,
    last_sign_in_at: undefined,
    app_metadata: {},
    user_metadata: { full_name: u.name ?? undefined, avatar_url: u.image ?? undefined },
    identities: [],
    created_at: u.createdAt ?? new Date().toISOString(),
    updated_at: u.updatedAt ?? new Date().toISOString(),
  } as unknown as User;
}

function toSession(s: BetterAuthSession): Session | null {
  if (!s?.user) return null;
  const user = toUser(s.user);
  return {
    access_token: s.session?.token ?? "cookie",
    refresh_token: "cookie",
    expires_in: 3600,
    expires_at: s.session?.expiresAt
      ? Math.floor(new Date(s.session.expiresAt).getTime() / 1000)
      : undefined,
    token_type: "bearer",
    user,
  } as unknown as Session;
}

async function fetchJson(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  return res.json().catch(() => null);
}

const listeners = new Set<AuthCallback>();

function emit(event: AuthEvent, session: Session | null): void {
  for (const cb of listeners) cb(event, session);
}

export const authAdapter = {
  async getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    try {
      const raw = (await fetchJson("/get-session")) as BetterAuthSession | null;
      return { data: { session: raw ? toSession(raw) : null }, error: null };
    } catch (error) {
      return { data: { session: null }, error: error as Error };
    }
  },

  async getUser(): Promise<{ data: { user: User | null }; error: Error | null }> {
    try {
      const raw = (await fetchJson("/get-session")) as BetterAuthSession | null;
      return { data: { user: raw?.user ? toUser(raw.user) : null }, error: null };
    } catch (error) {
      return { data: { user: null }, error: error as Error };
    }
  },

  onAuthStateChange(callback: AuthCallback): {
    data: { subscription: { unsubscribe: () => void } };
  } {
    listeners.add(callback);
    // Emit current state asynchronously, mirroring supabase-js behaviour.
    void this.getSession().then(({ data }) => {
      callback(data.session ? "SIGNED_IN" : "SIGNED_OUT", data.session);
    });
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  },

  async signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }> {
    const raw = (await fetchJson("/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    })) as (BetterAuthSession & { error?: { message: string } }) | null;

    if (!raw || raw.error || !raw.user) {
      return {
        data: { session: null, user: null },
        error: new Error(raw?.error?.message ?? "Invalid credentials"),
      };
    }
    const session = toSession(raw);
    emit("SIGNED_IN", session);
    return { data: { session, user: session?.user ?? null }, error: null };
  },

  async signUp(params: {
    email: string;
    password: string;
    options?: { data?: { full_name?: string }; emailRedirectTo?: string };
  }): Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }> {
    const raw = (await fetchJson("/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        name: params.options?.data?.full_name ?? params.email,
      }),
    })) as (BetterAuthSession & { error?: { message: string } }) | null;

    if (!raw || raw.error || !raw.user) {
      return {
        data: { session: null, user: null },
        error: new Error(raw?.error?.message ?? "Sign up failed"),
      };
    }
    const session = toSession(raw);
    emit("SIGNED_IN", session);
    return { data: { session, user: session?.user ?? null }, error: null };
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      await fetchJson("/sign-out", { method: "POST", body: "{}" });
      emit("SIGNED_OUT", null);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async signInWithOAuth({ provider, options }: {
    provider: string;
    options?: { redirectTo?: string };
  }): Promise<{ data: { provider: string; url: string } | null; error: Error | null }> {
    try {
      const callbackURL = options?.redirectTo ?? `${window.location.origin}/dashboard`;
      const res = await fetch(`${AUTH_BASE}/sign-in/social`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, callbackURL }),
      });
      const data = await res.json().catch(() => null);
      const url = data?.url as string | undefined;
      if (url) {
        window.location.href = url;
        return { data: { provider, url }, error: null };
      }
      return { data: null, error: new Error("No redirect URL from auth server") };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async resetPasswordForEmail(
    _email: string,
    _options?: { redirectTo?: string },
  ): Promise<{ data: Record<string, never>; error: Error | null }> {
    // Stub for Phase 1; password reset flow is wired in a later phase.
    return { data: {}, error: null };
  },

  async updateUser(attributes: {
    data?: Record<string, unknown>;
    password?: string;
    email?: string;
  }): Promise<{ data: { user: User | null }; error: Error | null }> {
    try {
      const raw = (await fetchJson("/update-user", {
        method: "POST",
        body: JSON.stringify(attributes),
      })) as BetterAuthSession | null;
      const session = await this.getSession();
      void raw;
      const user = session.data.session?.user ?? null;
      if (user) emit("USER_UPDATED", session.data.session);
      return { data: { user }, error: null };
    } catch (error) {
      return { data: { user: null }, error: error as Error };
    }
  },
};
