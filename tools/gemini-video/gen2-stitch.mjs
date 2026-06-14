// Generate clip 2 (continuity/CTA) on the dedicated profile, then stitch clip1+clip2.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const PORT = 9222;
const FF = 'C:/Users/Junait/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe';
const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);
const PROMPT2 = '@amijunait একই তরুণ বাংলাদেশি উদ্যোক্তা, একই ছোট অনলাইন শপ, এবার হাসিমুখে ফোন দেখিয়ে বাংলায় বলছে: "এখন What A App আমার হয়ে রাত-দিন অটো রিপ্লাই দেয় — একটা অর্ডারও মিস হয় না।" vertical 9:16, রিয়েলিস্টিক, ১০ সেকেন্ড।';

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p=>p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
const shot = (p)=>page.screenshot({path:`out/${p}`}).catch(()=>{});

// Fresh reload clears any stuck overlay.
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(5000);
await page.keyboard.press('Escape').catch(()=>{});
// Gemini may PERSIST video mode from clip1. Detect it; only select Create video if not already active.
const inVideoMode = async () =>
  (await page.getByText(/Describe your video/i).count()) > 0 ||
  (await page.locator('[aria-label*="Videos" i]').count()) > 0 ||
  (await page.getByText(/Landscape \(16:9\)|Portrait \(9:16\)/i).count()) > 0;
if (await inVideoMode()) {
  log('already in video mode (persisted)');
} else {
  await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.locator('.cdk-overlay-pane').getByText('Create video', { exact: true }).first().click({ timeout: 6000 });
  await page.waitForTimeout(2500);
  log('video mode set via menu');
}
// 9:16
try {
  await page.getByText(/Landscape \(16:9\)/i).first().click({ timeout: 6000 });
  await page.waitForTimeout(900);
  const p = page.getByText(/Portrait \(9:16\)|9:16/i).first();
  if (await p.count()) await p.click({ timeout: 4000 });
  await page.waitForTimeout(700);
} catch(e){ log('ratio note', e.message); }
log('video mode + 9:16');

// prompt with @amijunait mention
const box = page.locator('[contenteditable="true"], textarea').first();
await box.click({ timeout: 6000 });
await page.keyboard.type('@amijunait', { delay: 40 });
await page.waitForTimeout(1500);
await page.keyboard.press('Enter').catch(()=>{});
await page.waitForTimeout(500);
await page.keyboard.type(' ' + PROMPT2.replace('@amijunait','').trim(), { delay: 12 });
await page.waitForTimeout(600);
// send
let sent=false;
for (const sel of ['[aria-label="Send message"]','[aria-label="Send"]']) {
  const b=page.locator(sel).first(); if(await b.count() && await b.isEnabled().catch(()=>false)){await b.click().catch(()=>{});sent=true;break;}
}
if(!sent) await page.keyboard.press('Enter');
log('clip2 submitted; waiting...');
await shot('c2-submitted.png');

// wait + download
let done=false;
for(let i=0;i<60;i++){
  await page.waitForTimeout(5000);
  if(await page.locator('[aria-label*="Download" i]').count() || await page.locator('video').count()){done=true;break;}
  if(i%4===0) log(`poll ${i}`);
}
if(done){
  try{
    const dl=page.locator('[aria-label*="Download" i]').first();
    const [d]=await Promise.all([page.waitForEvent('download',{timeout:30000}), dl.click()]);
    await d.saveAs('out/clip2.mp4'); log('DOWNLOADED clip2');
  }catch(e){ log('dl note', e.message); }
} else log('clip2 gen not confirmed');
await browser.close();

// stitch clip1 + clip2 (re-encode concat for robustness)
if (existsSync('out/clip1.mp4') && existsSync('out/clip2.mp4')) {
  log('stitching...');
  execFileSync(FF, ['-y','-i','out/clip1.mp4','-i','out/clip2.mp4',
    '-filter_complex','[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]',
    '-map','[v]','-map','[a]','-r','30','-pix_fmt','yuv420p','out/stitched.mp4'], {stdio:'ignore'});
  log('STITCHED -> out/stitched.mp4');
} else log('missing a clip; cannot stitch');
log('DONE');
