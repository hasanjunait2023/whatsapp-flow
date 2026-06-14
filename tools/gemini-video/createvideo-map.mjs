import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(3500);

await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 8000 });
await page.waitForTimeout(1000);

// click Create video within the overlay menu
const pane = page.locator('.cdk-overlay-pane');
let clicked = false;
for (const loc of [
  pane.getByRole('menuitem', { name: /create video/i }),
  pane.getByText('Create video', { exact: true }),
  page.getByText('Create video', { exact: true }),
]) { try { if (await loc.count()) { await loc.first().click({ timeout: 4000 }); clicked = true; break; } } catch {} }
console.log('create-video clicked:', clicked);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'out/createvideo.png' });

// map controls now: ratio/aspect/social options, prompt box, send button
const map = await page.evaluate(() => {
  const labels = [];
  for (const el of document.querySelectorAll('button,[role=button],[aria-label],[role=menuitem],[role=option],[contenteditable=true],textarea,input,[role=radio],[role=tab]')) {
    const t = (el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,55);
    if (t) labels.push(t);
  }
  const ratioHits = labels.filter(l => /ratio|aspect|9:16|16:9|1:1|portrait|landscape|square|social|vertical/i.test(l));
  return { all: [...new Set(labels)].slice(0,90), ratioHits: [...new Set(ratioHits)] };
});
console.log('--- RATIO-related ---'); console.log(JSON.stringify(map.ratioHits, null, 2));
console.log('--- all controls ---'); console.log(map.all.join('\n'));
console.log('SHOT: out/createvideo.png');
await browser.close();
