import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../db/index.js";
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
 */
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
