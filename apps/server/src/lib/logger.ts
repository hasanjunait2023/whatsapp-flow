import { IS_PRODUCTION } from "./env.js";

/**
 * Zero-dependency structured logger. Emits one JSON object per line to stdout
 * (info/warn) or stderr (error) so any aggregator (docker logs, Loki, Datadog)
 * can parse it. We avoid pulling in pino/winston deliberately — a new dep risks
 * the pnpm install issues this repo has hit, and the surface we need is tiny.
 *
 * NEVER log message bodies / phone numbers / tokens — only IDs. Pass a `fields`
 * object with request_id / tenant_id / user_id for correlation.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
// Quieter in prod by default; DEBUG=1 lowers the floor.
const MIN_LEVEL: number =
  process.env.LOG_LEVEL && LEVEL_RANK[process.env.LOG_LEVEL as LogLevel] !== undefined
    ? LEVEL_RANK[process.env.LOG_LEVEL as LogLevel]
    : IS_PRODUCTION
      ? LEVEL_RANK.info
      : LEVEL_RANK.debug;

function emit(level: LogLevel, msg: string, fields?: LogFields): void {
  if (LEVEL_RANK[level] < MIN_LEVEL) return;
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
  /** Returns a logger that merges `base` fields into every line (request scope). */
  child(base: LogFields) {
    return {
      debug: (msg: string, fields?: LogFields) => emit("debug", msg, { ...base, ...fields }),
      info: (msg: string, fields?: LogFields) => emit("info", msg, { ...base, ...fields }),
      warn: (msg: string, fields?: LogFields) => emit("warn", msg, { ...base, ...fields }),
      error: (msg: string, fields?: LogFields) => emit("error", msg, { ...base, ...fields }),
    };
  },
};
