import { chromium } from 'playwright';
const PORT = 9222;
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(3500);
await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 8000 });
await page.waitForTimeout(1000);

// probe every element whose trimmed text is exactly Create video / Create image / More tools
const probe = await page.evaluate(() => {
  const names = ['Create video','Create image','More tools','More uploads'];
  const res = [];
  for (const el of document.querySelectorAll('*')) {
    const t = (el.textContent||'').trim().replace(/\s+/g,' ');
    if (names.includes(t) && el.children.length <= 2) {
      const r = el.getBoundingClientRect();
      // find clickable ancestor
      let a = el, hops=0; while(a && hops<5 && !(a.getAttribute && (a.getAttribute('role')==='menuitem'||a.tagName==='BUTTON'||a.getAttribute('role')==='button'))){a=a.parentElement;hops++;}
      res.push({ text:t, tag:el.tagName, vis:(r.width>0&&r.height>0), x:Math.round(r.x), y:Math.round(r.y),
        clickableTag: a?a.tagName:null, clickableRole: a?(a.getAttribute&&a.getAttribute('role')):null,
        clickableAria: a?(a.getAttribute&&a.getAttribute('aria-label')):null });
    }
  }
  return res;
});
console.log(JSON.stringify(probe, null, 2));
await browser.close();
