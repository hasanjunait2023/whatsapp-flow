import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(3500);
await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 8000 });
await page.waitForTimeout(1200);
// dump the open menu/popup container(s)
const dump = await page.evaluate(() => {
  const pops = document.querySelectorAll('[role=menu],[role=listbox],.cdk-overlay-pane,[class*=menu]');
  const out = [];
  for (const p of pops) {
    const items = [];
    for (const it of p.querySelectorAll('[role=menuitem],button,[role=button],a,li')) {
      const t = (it.getAttribute('aria-label')||it.textContent||'').trim().replace(/\s+/g,' ').slice(0,45);
      const r = it.getBoundingClientRect();
      if (t && r.width>0 && r.height>0) items.push(t);
    }
    if (items.length) out.push({ container: p.getAttribute('role')||p.className.slice(0,30), items: [...new Set(items)].slice(0,30) });
  }
  return out;
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
