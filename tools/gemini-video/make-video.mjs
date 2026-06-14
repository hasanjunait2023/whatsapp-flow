// Production runner: ONE chat, multiple clips, white-shirt branding + @amijunait,
// continuity, stitch, Ecomex logo overlay. Parameterized via a content JSON.
//   node make-video.mjs content.json        (or uses DEFAULT_CONTENT)
// content.json: { "slug": "...", "caption": "...", "clips": ["bangla prompt 1", "prompt 2", ...] }
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const USER_DATA_DIR = 'C:/Users/Junait/whatsapp-flow-main/tools/gemini-video/chrome-data';
const FF = 'C:/Users/Junait/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe';
const FP = FF.replace('ffmpeg.exe','ffprobe.exe');
const LOGO = 'C:/Users/Junait/whatsapp-flow-main/tools/gemini-video/assets/ecomex-logo.png';
const PORT = 9222;
mkdirSync('out', { recursive: true });
mkdirSync('fonts', { recursive: true });
// libass needs a colon-free fontsdir on Windows -> keep a local Bangla font copy
try { if (!existsSync('fonts/kalpurush.ttf')) copyFileSync('C:/Windows/Fonts/kalpurush.ttf','fonts/kalpurush.ttf'); } catch {}
const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);

// White shirt = Ecomex brand dress. Prefix every clip prompt with brand+continuity constraints.
const BRAND = 'একই তরুণ বাংলাদেশি পুরুষ @amijunait, সবসময় পরিষ্কার সাদা শার্ট পরা (white shirt branding), একই চেহারা ও পরিবেশ ধরে রাখো, vertical 9:16, রিয়েলিস্টিক, ১০ সেকেন্ড। ';
const wrap = (clip) => {
  const sp = clipSpeech(clip);
  const say = sp ? ` স্পষ্ট বাংলায় বলছে: "${sp}"` : '';
  return `@amijunait ${BRAND}${clipPrompt(clip).replace(/@amijunait/g,'').trim()}${say}`;
};

// Each clip: { prompt (scene/direction), dialogue (exact Bangla the avatar speaks = the caption) }
const DEFAULT_CONTENT = {
  slug: 'cod-tip-1',
  caption: 'COD return কমানোর ১টা সহজ নিয়ম 👇 #ecommerce #bangladesh #ecomex',
  clips: [
    { prompt: 'ক্যামেরার দিকে তাকিয়ে গম্ভীরভাবে বলছে। ছোট অনলাইন শপের পরিবেশ।',
      dialogue: 'COD অর্ডার ফেরত আসে কারণ কাস্টমার confirm করে না।' },
    { prompt: 'হাসিমুখে আত্মবিশ্বাসের সাথে বলছে।',
      dialogue: 'অর্ডারের পরেই confirmation মেসেজ পাঠান — fake অর্ডার কমে যাবে।' },
  ],
};
const clipPrompt = (c) => typeof c === 'string' ? c : c.prompt;
const clipSpeech = (c) => typeof c === 'string' ? '' : (c.dialogue || '');

const content = process.argv[2] && existsSync(process.argv[2])
  ? JSON.parse(readFileSync(process.argv[2],'utf-8')) : DEFAULT_CONTENT;
log('content:', content.slug, '| clips:', content.clips.length);

async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { log('chrome up'); return; } } catch {}
  const p = spawn(CHROME, [`--remote-debugging-port=${PORT}`,`--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run','--no-default-browser-check','--start-maximized','https://gemini.google.com/app'], { detached:true, stdio:'ignore' });
  p.on('error',e=>log('spawn err',e.message)); p.unref();
  const t0=Date.now(); while(Date.now()-t0<30000){ try{ const r=await fetch(`http://127.0.0.1:${PORT}/json/version`); if(r.ok){log('chrome up');return;} }catch{} await new Promise(r=>setTimeout(r,500)); }
  throw new Error('chrome not up');
}
await ensureChrome();
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p=>p.url().includes('gemini.google.com')) ?? ctx.pages()[0];
await page.bringToFront();
const shot = (p)=>page.screenshot({path:`out/${p}`}).catch(()=>{});

// Fresh chat ONCE for the whole video
await page.goto('https://gemini.google.com/app', { waitUntil:'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(5000);
await page.keyboard.press('Escape').catch(()=>{});

const inVideoMode = async () =>
  (await page.getByText(/Describe your video/i).count())>0 ||
  (await page.getByText(/Landscape \(16:9\)|Portrait \(9:16\)/i).count())>0;

async function enterVideoMode(){
  if (await inVideoMode()) { log('video mode persisted'); }
  else {
    await page.locator('[aria-label="Upload & tools"]').first().click({ timeout: 10000 });
    await page.waitForTimeout(1300);
    await page.locator('.cdk-overlay-pane').getByText('Create video', { exact: true }).first().click({ timeout: 6000 });
    await page.waitForTimeout(2500);
    log('video mode set');
  }
  // ensure 9:16
  try { const land = page.getByText(/Landscape \(16:9\)/i).first();
    if (await land.count()) { await land.click({timeout:5000}); await page.waitForTimeout(800);
      const p=page.getByText(/Portrait \(9:16\)|9:16/i).first(); if(await p.count()){await p.click({timeout:4000}); log('-> 9:16');}
      await page.waitForTimeout(600);
    } else log('ratio already 9:16'); } catch(e){ log('ratio note', e.message); }
}
await enterVideoMode();

async function genClip(clip, idx){
  // BASELINE: how many videos/downloads already exist (from prior clips in this chat)
  const dlSel = '[aria-label*="Download" i]';
  const before = await page.locator(dlSel).count();
  const beforeVid = await page.locator('video').count();
  log(`clip ${idx}: typing (baseline downloads=${before} videos=${beforeVid})`);
  // dismiss any lingering overlay/menu that would intercept the click
  for (let k=0;k<3 && await page.locator('.cdk-overlay-backdrop, .cdk-overlay-pane [role=menu]').count(); k++){
    await page.keyboard.press('Escape').catch(()=>{}); await page.waitForTimeout(500);
  }
  const box = page.locator('[contenteditable="true"], textarea').first();
  await box.click({ timeout: 8000 });
  await page.keyboard.type('@amijunait', { delay: 40 });
  await page.waitForTimeout(1400);
  await page.keyboard.press('Enter').catch(()=>{});
  await page.waitForTimeout(400);
  await page.keyboard.type(' ' + wrap(clip).replace('@amijunait','').trim(), { delay: 10 });
  await page.waitForTimeout(500);
  let sent=false;
  for(const sel of ['[aria-label="Send message"]','[aria-label="Send"]']){ const b=page.locator(sel).first(); if(await b.count()&&await b.isEnabled().catch(()=>false)){await b.click().catch(()=>{});sent=true;break;} }
  if(!sent) await page.keyboard.press('Enter');
  log(`clip ${idx}: submitted, waiting for a NEW video...`);
  // Wait until a NEW download/video appears (count strictly increases) — never reuse a prior clip
  let done=false;
  for(let i=0;i<72;i++){ await page.waitForTimeout(5000);
    const nowDl = await page.locator(dlSel).count();
    const nowVid = await page.locator('video').count();
    if(nowDl > before || nowVid > beforeVid){ done=true; break; }
  }
  if(!done){ log(`clip ${idx}: gen timeout (no NEW video)`); return null; }
  await page.waitForTimeout(2000);
  try{
    const dls = page.locator(dlSel);
    const dl = dls.last(); // newest clip's download is last in DOM order
    const [d]=await Promise.all([page.waitForEvent('download',{timeout:30000}), dl.click()]);
    const out=`out/${content.slug}-clip${idx}.mp4`; await d.saveAs(out); log(`clip ${idx}: downloaded (new)`); return out;
  }catch(e){ log(`clip ${idx} dl note`, e.message); return null; }
}

const segs=[]; // { file, dialogue }
for(let i=0;i<content.clips.length;i++){ const f=await genClip(content.clips[i], i+1); if(f) segs.push({file:f, dialogue: clipSpeech(content.clips[i])}); await page.waitForTimeout(1500); }
await browser.close();
log('generated clips:', segs.length);
if(segs.length===0){ log('no clips; abort'); process.exit(1); }
const files = segs.map(s=>s.file);

// stitch
let stitched=`out/${content.slug}-stitched.mp4`;
if(files.length===1){ stitched=files[0]; }
else {
  const inputs=files.flatMap(f=>['-i',f]);
  const n=files.length;
  const fc=files.map((_,i)=>`[${i}:v][${i}:a]`).join('')+`concat=n=${n}:v=1:a=1[v][a]`;
  execFileSync(FF,['-y',...inputs,'-filter_complex',fc,'-map','[v]','-map','[a]','-r','30','-pix_fmt','yuv420p',stitched],{stdio:'ignore'});
  log('stitched', stitched);
}

// --- Bangla captions (.ass via libass + kalpurush) timed per clip ---
const dur = (f) => { try { return parseFloat(execFileSync(FP,['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim())||10; } catch { return 10; } };
const toAss = (sec) => { const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=(sec%60).toFixed(2).padStart(5,'0'); return `${h}:${String(m).padStart(2,'0')}:${s}`; };
const assEsc = (t)=> t.replace(/\n/g,'\\N');
let assPath=null;
if (segs.some(s=>s.dialogue)) {
  let t=0; const events=[];
  for (const s of segs){ const d=dur(s.file); if(s.dialogue){ events.push(`Dialogue: 0,${toAss(t)},${toAss(t+d)},Cap,,0,0,0,,${assEsc(s.dialogue)}`); } t+=d; }
  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV
Style: Cap,Kalpurush,52,&H00FFFFFF,&H00000000,&H64000000,1,4,1,2,40,40,235
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;
  assPath=`out/${content.slug}.ass`; writeFileSync(assPath, ass, 'utf-8'); log('captions ->', assPath);
}

// brand: TWO passes (combining subtitles+overlay in one graph fails to parse on Windows).
// Pass 1: burn Bangla captions via relative fontsdir=fonts (colon-in-path breaks the filter).
let base = stitched;
if (assPath) {
  const capt=`out/${content.slug}-capt.mp4`;
  execFileSync(FF,['-y','-i',stitched,'-vf',`subtitles=${assPath}:fontsdir=fonts`,'-c:a','copy',capt],{stdio:'ignore'});
  base = capt; log('captions burned');
}
// Pass 2: Ecomex logo overlay (bottom-center)
const branded=`out/${content.slug}-branded.mp4`;
execFileSync(FF,['-y','-i',base,'-i',LOGO,'-filter_complex','[1]scale=300:-1[lg];[0][lg]overlay=(W-w)/2:H-h-70','-c:a','copy',branded],{stdio:'ignore'});
log('BRANDED (captioned) ->', branded);
log('CAPTION:', content.caption);
log('DONE');
