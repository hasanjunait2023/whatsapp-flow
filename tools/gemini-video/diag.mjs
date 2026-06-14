import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx=b.contexts()[0];
const page=ctx.pages().find(p=>p.url().includes('gemini'))??ctx.pages()[0];
await page.bringToFront();
await page.screenshot({path:'out/diag-home.png'});
console.log('url', page.url(), 'title', await page.title());
const ut = page.locator('[aria-label="Upload & tools"]');
console.log('upload&tools count', await ut.count());
if(await ut.count()){ await ut.first().click({timeout:8000}).catch(e=>console.log('click err',e.message)); await page.waitForTimeout(1500); await page.screenshot({path:'out/diag-menu.png'});
  const items=await page.evaluate(()=>{const o=[];for(const e of document.querySelectorAll('.cdk-overlay-pane [role=menuitem],.cdk-overlay-pane button')){const t=(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);if(t)o.push(t);}return [...new Set(o)];});
  console.log('menu items:', JSON.stringify(items));
}
await b.close();
