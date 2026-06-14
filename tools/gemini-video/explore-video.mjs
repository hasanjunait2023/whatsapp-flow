// Map the "Create video" flow. Attach to running Chrome. Robust menu-item click.
import { chromium } from 'playwright';
const PORT = 9222;
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(4000);

await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 8000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'out/menu.png' });

// dump menu items with tag + aria for precise targeting
const items = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('[role=menuitem],button,[role=button]')) {
    const txt = (el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);
    const aria = (el.getAttribute('aria-label')||'').slice(0,40);
    if (/video/i.test(txt) || /video/i.test(aria)) out.push({ tag: el.tagName, role: el.getAttribute('role'), txt, aria });
  }
  return out;
});
console.log('video-related menu items:', JSON.stringify(items, null, 2));

// robust click strategies
let clicked = false;
for (const loc of [
  page.getByRole('menuitem', { name: /create video/i }),
  page.getByText('Create video', { exact: true }),
  page.locator('[aria-label="Create video"]'),
  page.locator(':text("Create video")'),
]) {
  try { if (await loc.count()) { await loc.first().click({ timeout: 4000 }); clicked = true; break; } } catch {}
}
console.log('create-video clicked:', clicked);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'out/video-mode.png' });

const info = await page.evaluate(() => {
  const labels = [];
  for (const el of document.querySelectorAll('button,[role=button],[aria-label],[role=menuitem],[role=option],input,textarea,[contenteditable=true]')) {
    const t = (el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,55);
    if (t) labels.push(t);
  }
  return [...new Set(labels)].slice(0,90);
});
console.log('--- controls after Create video ---');
console.log(info.join('\n'));
console.log('SHOTS: out/menu.png, out/video-mode.png');
await browser.close();
