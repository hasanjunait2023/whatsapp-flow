import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
const CHROME='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const UDD='C:/Users/Junait/whatsapp-flow-main/tools/gemini-video/chrome-data';
const PORT=9222;
try{ execFileSync('taskkill',['/F','/IM','chrome.exe'],{stdio:'ignore'}); }catch{}
await new Promise(r=>setTimeout(r,2500));
spawn(CHROME,[`--remote-debugging-port=${PORT}`,`--user-data-dir=${UDD}`,'--no-first-run','--start-maximized','https://gemini.google.com/app'],{detached:true,stdio:'ignore'}).unref();
const t0=Date.now(); while(Date.now()-t0<30000){ try{ if((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; }catch{} await new Promise(r=>setTimeout(r,500)); }
const b=await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const page=b.contexts()[0].pages().find(p=>p.url().includes('gemini'))??b.contexts()[0].pages()[0];
await page.bringToFront(); await page.waitForTimeout(6000);
// open sidebar
for(const sel of ['[aria-label="Open sidebar"]','[aria-label="Main menu"]','[aria-label*="sidebar" i]']){
  const l=page.locator(sel).first(); if(await l.count()){ await l.click({timeout:5000}).catch(()=>{}); break; }
}
await page.waitForTimeout(2000);
await page.screenshot({path:'out/sidebar.png'});
// dump recent chat titles + their roles/selectors
const chats=await page.evaluate(()=>{
  const out=[];
  for(const e of document.querySelectorAll('[role=listitem],[data-test-id*=conversation],a[href*="/app/"], .conversation-title, [class*=conversation]')){
    const t=(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50);
    if(t && t.length>1) out.push(t);
  }
  return [...new Set(out)].slice(0,30);
});
console.log('CHATS:', JSON.stringify(chats,null,2));
console.log('SHOT: out/sidebar.png');
await b.close();
