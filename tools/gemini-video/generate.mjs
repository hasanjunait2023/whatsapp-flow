// Full clip-1 generation on the dedicated amijunait profile.
// Spawn-or-reuse Chrome on 9222 (dedicated chrome-data dir), attach via CDP, drive:
// Create video -> 9:16 -> @amijunait Bangla prompt -> generate -> download.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const USER_DATA_DIR = 'C:/Users/Junait/whatsapp-flow-main/tools/gemini-video/chrome-data';
const PORT = 9222;
mkdirSync('out', { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);
const shot = (p) => page.screenshot({ path: `out/${p}` }).catch(()=>{});

// PROMPT for clip 1 (Bangla, hook, @amijunait, vertical social)
const PROMPT_CLIP1 = '@amijunait ক্যামেরার দিকে তাকিয়ে বাংলায় বলছে: "রাত ২টায় কাস্টমার অর্ডার করল, কিন্তু কেউ রিপ্লাই দিল না — অর্ডারটা হারিয়ে গেল।" তরুণ বাংলাদেশি উদ্যোক্তা, ছোট অনলাইন শপের পরিবেশ, vertical 9:16, রিয়েলিস্টিক, ১০ সেকেন্ড।';

async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { log('chrome already up'); return; } } catch {}
  log('spawning chrome...');
  const p = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run','--no-default-browser-check','--start-maximized','https://gemini.google.com/app',
  ], { detached: true, stdio: 'ignore' });
  p.on('error', e => { log('spawn err', e.message); });
  p.unref();
  const t0 = Date.now();
  while (Date.now()-t0 < 30000) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { log('chrome up'); return; } } catch {} await new Promise(r=>setTimeout(r,500)); }
  throw new Error('chrome did not come up');
}

await ensureChrome();
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
globalThis.page = ctx.pages().find(p=>p.url().includes('gemini.google.com')) ?? ctx.pages()[0] ?? await ctx.newPage();
await page.bringToFront();
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(5000);
await page.keyboard.press('Escape').catch(()=>{});
log('on gemini:', await page.title());

// 1) Upload & tools -> Create video
await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 10000 });
await page.waitForTimeout(1200);
await page.locator('.cdk-overlay-pane').getByText('Create video', { exact: true }).first().click({ timeout: 6000 });
await page.waitForTimeout(2500);
await shot('g1-videomode.png');
log('create video mode set');

// 2) set ratio 9:16 (Portrait). click the ratio chip, then the portrait option.
try {
  await page.getByText(/Landscape \(16:9\)/i).first().click({ timeout: 6000 });
  await page.waitForTimeout(1000);
  await shot('g2-ratio-open.png');
  const portrait = page.getByText(/Portrait \(9:16\)|9:16/i).first();
  if (await portrait.count()) { await portrait.click({ timeout: 4000 }); log('ratio -> 9:16'); }
  else log('WARN: 9:16 option not found');
  await page.waitForTimeout(800);
} catch (e) { log('ratio step note:', e.message); }
await shot('g3-after-ratio.png');

// 3) type prompt into the prompt box (contenteditable). Handle @amijunait mention popup.
const box = page.locator('[contenteditable="true"], textarea').first();
await box.click({ timeout: 6000 });
await page.waitForTimeout(400);
// type the @mention first, then accept suggestion if a popup shows
await page.keyboard.type('@amijunait', { delay: 40 });
await page.waitForTimeout(1500);
await shot('g4-mention.png');
// try to accept mention suggestion (Enter), then continue typing the rest
await page.keyboard.press('Enter').catch(()=>{});
await page.waitForTimeout(500);
const rest = PROMPT_CLIP1.replace('@amijunait', '').trim();
await page.keyboard.type(' ' + rest, { delay: 12 });
await page.waitForTimeout(600);
await shot('g5-prompt.png');
log('prompt typed');

// 4) submit (send button or Enter)
let sent = false;
for (const sel of ['[aria-label="Send message"]','[aria-label="Send"]','button[aria-label*="Send"]','[aria-label*="Submit"]']) {
  const b = page.locator(sel).first();
  if (await b.count() && await b.isEnabled().catch(()=>false)) { await b.click().catch(()=>{}); sent = true; log('clicked send', sel); break; }
}
if (!sent) { await page.keyboard.press('Enter'); log('pressed Enter to send'); }
await page.waitForTimeout(4000);
await shot('g6-submitted.png');

// 5) wait for video generation (poll up to 5 min for a <video> or a download control)
log('waiting for video generation (up to 5min)...');
let done = false;
for (let i=0;i<60;i++){
  await page.waitForTimeout(5000);
  const hasVideo = await page.locator('video').count();
  const hasDownload = await page.locator('[aria-label*="Download" i], [aria-label*="download" i]').count();
  if (i%4===0) { await shot('g7-progress.png'); log(`poll ${i}: video=${hasVideo} download=${hasDownload}`); }
  if (hasVideo>0 || hasDownload>0) { done = true; log('video ready signal'); break; }
}
await shot('g8-final.png');

// 6) attempt download
if (done) {
  try {
    const dl = page.locator('[aria-label*="Download" i]').first();
    if (await dl.count()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        dl.click(),
      ]);
      const path = `out/clip1.mp4`;
      await download.saveAs(path);
      log('DOWNLOADED clip1 ->', path);
    } else { log('no download button; video may be inline. screenshot saved.'); }
  } catch (e) { log('download note:', e.message); }
} else { log('generation not confirmed within timeout. see screenshots.'); }

log('DONE. screenshots in out/. leaving chrome open.');
await browser.close();
