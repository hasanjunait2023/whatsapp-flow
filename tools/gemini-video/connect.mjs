// Dedicated automation profile (its own Chrome instance + debug port). Chrome 136+ blocks
// the debug port on the DEFAULT user-data-dir, so we use a separate dir. This also means the
// founder's normal Chrome can stay open. First run = signed out; founder logs into
// amijunait@gmail.com once in the opened window; the login then persists in this dir.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const USER_DATA_DIR = 'C:/Users/Junait/whatsapp-flow-main/tools/gemini-video/chrome-data';
const PORT = 9222;
mkdirSync('out', { recursive: true });
mkdirSync(USER_DATA_DIR, { recursive: true });

const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run', '--no-default-browser-check', '--start-maximized',
  'https://gemini.google.com/app',
], { detached: true, stdio: 'ignore' });
proc.on('error', e => { console.error('spawn error', e.message); process.exit(1); });
proc.unref();

async function waitPort(ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('debug port never came up');
}
const ver = await waitPort();
console.log('attached chrome:', ver.Browser);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(8000);

const title = await page.title();
const signedOut = await page.locator('text=/^Sign in$/').count();
const acct = await page.evaluate(() => {
  const a = document.querySelector('a[aria-label*="Google Account"], [aria-label*="@gmail.com"], img[alt*="@"]');
  return a ? (a.getAttribute('aria-label') || a.getAttribute('alt') || '').slice(0,90) : null;
});
await page.screenshot({ path: 'out/gemini-cdp.png' });
console.log(JSON.stringify({ title, signedOutButtons: signedOut, account: acct,
  loggedIn: signedOut === 0 && !!acct }, null, 2));
console.log('SHOT: out/gemini-cdp.png');
console.log('Chrome LEFT OPEN for manual login if needed. Port', PORT);
await browser.close(); // detach only; chrome stays open
