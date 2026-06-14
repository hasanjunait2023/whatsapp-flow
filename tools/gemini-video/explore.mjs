// Local runner (exploration): open gemini.google.com/app on the amijunait profile,
// confirm login, capture the Video-tool UI. Chrome must be CLOSED first (profile lock).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const USER_DATA = 'C:\Users\Junait\AppData\Local\Google\Chrome\User Data';
const PROFILE = 'Profile 41'; // amijunait@gmail.com
mkdirSync('out', { recursive: true });

const ctx = await chromium.launchPersistentContext(USER_DATA, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: [`--profile-directory=${PROFILE}`, '--start-maximized'],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const title = await page.title();
const url = page.url();
const signedIn = await page.locator('text=/sign in|log in|Sign in to Google/i').count();
await page.screenshot({ path: 'out/gemini-home.png', fullPage: false });
// dump visible button/aria labels to find the Video tool
const labels = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button,[role=button],a,[aria-label]')) {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,60);
    if (t) out.push(t);
  }
  return [...new Set(out)].slice(0, 120);
});
console.log(JSON.stringify({ title, url, maybeSignInPrompts: signedIn }, null, 2));
console.log('--- UI labels ---');
console.log(labels.join('\n'));
console.log('SCREENSHOT: out/gemini-home.png');
await page.waitForTimeout(2000);
await ctx.close();
