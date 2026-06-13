import { defineConfig } from "drizzle-kit";

// `generate` (diff schema -> SQL) does not need live credentials; `migrate`/
// `push` do — they read DATABASE_URL from the environment at run time.
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/whatsapp_flow",
  },
});
