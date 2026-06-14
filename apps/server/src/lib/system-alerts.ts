import os from "node:os";
import { statfs } from "node:fs/promises";
import { logger } from "./logger.js";
import { sendTelegramMessage } from "../services/telegram.js";
import {
  OPS_TELEGRAM_CHAT_ID,
  ALERT_MEM_THRESHOLD,
  ALERT_DISK_THRESHOLD,
} from "./env.js";

/**
 * Resource-pressure watchdog. The Contabo box runs near its memory ceiling
 * (Phase 0: swap exhausted), and deploy/README.md *assumes* RAM/disk alerts
 * exist — they didn't. This implements them: check on an interval, alert via
 * Telegram when usage crosses the threshold, and re-arm only after it recovers
 * (edge-triggered) so we don't spam while sitting over the line.
 */

const armed = { mem: true, disk: true };

async function diskUsedFraction(pathToCheck = "/"): Promise<number | null> {
  try {
    const s = await statfs(pathToCheck);
    const total = s.blocks * s.bsize;
    const free = s.bfree * s.bsize;
    if (total <= 0) return null;
    return 1 - free / total;
  } catch {
    return null;
  }
}

export async function checkResourcePressure(): Promise<void> {
  const total = os.totalmem();
  const memUsed = total > 0 ? 1 - os.freemem() / total : 0;
  const diskUsed = await diskUsedFraction();

  // Memory (edge-triggered).
  if (memUsed >= ALERT_MEM_THRESHOLD) {
    if (armed.mem) {
      armed.mem = false;
      await alert(`⚠️ *RAM ${pct(memUsed)}* (≥ ${pct(ALERT_MEM_THRESHOLD)} threshold)`);
    }
  } else if (memUsed < ALERT_MEM_THRESHOLD - 0.05) {
    armed.mem = true;
  }

  // Disk (edge-triggered).
  if (diskUsed !== null) {
    if (diskUsed >= ALERT_DISK_THRESHOLD) {
      if (armed.disk) {
        armed.disk = false;
        await alert(`⚠️ *Disk ${pct(diskUsed)}* (≥ ${pct(ALERT_DISK_THRESHOLD)} threshold)`);
      }
    } else if (diskUsed < ALERT_DISK_THRESHOLD - 0.05) {
      armed.disk = true;
    }
  }
}

function pct(f: number): string {
  return `${Math.round(f * 100)}%`;
}

async function alert(text: string): Promise<void> {
  logger.warn("resource_pressure", { detail: text.replace(/[*`]/g, "") });
  if (!OPS_TELEGRAM_CHAT_ID) return;
  try {
    await sendTelegramMessage(OPS_TELEGRAM_CHAT_ID, text);
  } catch {
    // best-effort
  }
}
