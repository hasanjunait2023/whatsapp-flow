// Attach to the ALREADY-RUNNING automation Chrome (port 9222, no spawn). Verify amijunait
// login persisted, then map the Gemini Video tool UI.
import { chromium } from 'playwright';
const PORT = 9222;

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(6000);

const title = await page.title();
const signIn = await page.locator('text=/^Sign in$/').count();
const acct = await page.evaluate(() => {
  const a = document.querySelector('a[aria-label*="Google Account"],[aria-label*="@gmail.com"],img[alt*="@"]');
  return a ? (a.getAttribute('aria-label')||a.getAttribute('alt')||'').slice(0,100) : null;
});
await page.screenshot({ path: 'out/verify-home.png' });
console.log(JSON.stringify({ title, signInButtons: signIn, account: acct, loggedIn: signIn===0 && !!acct }, null, 2));

// Try to open the "Upload & tools" menu to find the Video tool
let toolLabels = [];
try {
  const tools = page.locator('[aria-label="Upload & tools"], [aria-label*="tools"]').first();
  if (await tools.count()) {
    await tools.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'out/verify-tools.png' });
    toolLabels = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[role=menuitem],[role=option],button,[role=button]')) {
        const t = (el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,50);
        if (t) out.push(t);
      }
      return [...new Set(out)].slice(0,80);
    });
  }
} catch (e) { console.log('tools menu note:', e.message); }
console.log('--- tools/menu labels ---');
console.log(toolLabels.join('\n'));
console.log('SHOTS: out/verify-home.png, out/verify-tools.png');
await browser.close();
