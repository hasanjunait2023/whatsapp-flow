import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db, sqlite } from "../db/index.js";
import { authSchema } from "../db/auth-schema.js";
import { AUTH_BASE_URL, IS_PRODUCTION, getAuthSecret } from "../lib/env.js";
import { verifyBcrypt, isBcryptHash } from "./password.js";

/**
 * better-auth instance: email/password + organization plugin (tenant = org).
 * Sessions are cookie-based, suitable for a same-origin SPA served by this server.
 *
 * The custom password verifier transparently accepts legacy GoTrue bcrypt hashes
 * imported during migration; better-auth rehashes to its native format when the
 * password is updated. Native verification falls through to the default hasher.
 *
 * Google sign-in (socialProviders) is OWNER-ONLY by product decision: team
 * members keep email/password. The session-create hook enforces the gate for
 * social sign-ins; the plan's Firebase route was replaced by better-auth's
 * native provider (same outcome, no custom session forging, no new deps).
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

/** True when the user owns a tenant or has an explicit owner role. */
function isTenantOwner(userId: string): boolean {
  const owner = sqlite
    .prepare(
      `SELECT 1 FROM tenants WHERE owner_id = ?
       UNION SELECT 1 FROM user_roles WHERE user_id = ? AND role = 'owner' LIMIT 1`,
    )
    .get(userId, userId);
  return owner !== undefined;
}

/** True when the user signed up via Google (has a google account row). */
function hasGoogleAccount(userId: string): boolean {
  const row = sqlite
    .prepare(`SELECT 1 FROM account WHERE user_id = ? AND provider_id = 'google' LIMIT 1`)
    .get(userId);
  return row !== undefined;
}

/** True when the user has any non-social (credential) account. */
function hasCredentialAccount(userId: string): boolean {
  const row = sqlite
    .prepare(`SELECT 1 FROM account WHERE user_id = ? AND provider_id = 'credential' LIMIT 1`)
    .get(userId);
  return row !== undefined;
}

export const auth = betterAuth({
  baseURL: AUTH_BASE_URL,
  secret: getAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      verify: async ({ password, hash }) => {
        if (isBcryptHash(hash)) {
          return verifyBcrypt(password, hash);
        }
        // Fall back to better-auth's default scrypt verifier.
        const { verifyPassword } = await import("better-auth/crypto");
        return verifyPassword({ password, hash });
      },
    },
  },
  ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  account: {
    accountLinking: {
      enabled: true,
      // Google verifies emails; safe to link to an existing same-email user.
      trustedProviders: ["google"],
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Owner gate for Google sign-ins. A brand-new Google user has no
          // tenant yet — allow (they become an owner in onboarding). An
          // EXISTING non-owner (team member with a credential account) must
          // use email/password.
          if (
            hasGoogleAccount(session.userId) &&
            hasCredentialAccount(session.userId) &&
            !isTenantOwner(session.userId)
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Google sign-in is for account owners. Team members use email & password.",
            });
          }
          return { data: session };
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: "wf",
    useSecureCookies: IS_PRODUCTION,
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  plugins: [organization()],
});

export type Auth = typeof auth;
