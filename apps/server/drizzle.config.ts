import { defineConfig } from "drizzle-kit";
import { DB_PATH } from "./src/lib/env.js";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: DB_PATH,
  },
});
