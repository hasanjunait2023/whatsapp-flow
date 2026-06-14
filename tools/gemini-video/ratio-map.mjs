import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
await page.waitForTimeout(1500);
// ratio control should still be present from the prior createvideo state; if not, re-enter
let ratio = page.getByText(/Landscape \(16:9\)|Portrait \(9:16\)|aspect/i).first();
if (!(await ratio.count())) {
  await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 8000 });
  await page.waitForTimeout(900);
  await page.locator('.cdk-overlay-pane').getByText('Create video', { exact: true }).first().click({ timeout: 5000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  ratio = page.getByText(/Landscape \(16:9\)/i).first();
}
console.log('ratio control present:', await ratio.count());
await ratio.click({ timeout: 6000 }).catch(e=>console.log('ratio click note', e.message));
await page.waitForTimeout(1200);
await page.screenshot({ path: 'out/ratio.png' });
const opts = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('[role=menuitem],[role=option],button,[role=button],li')) {
    const t = (el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);
    if (t && /portrait|landscape|square|9:16|16:9|1:1|ratio/i.test(t)) out.push(t);
  }
  return [...new Set(out)];
});
console.log('--- ratio options ---'); console.log(JSON.stringify(opts, null, 2));
console.log('SHOT: out/ratio.png');
await browser.close();
