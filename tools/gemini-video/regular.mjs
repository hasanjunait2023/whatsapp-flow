// Drive the REGULAR amijunait profile (Profile 41) via Playwright launchPersistentContext
// with automation-evasion flags so Google keeps the settled session. Chrome must be closed.
import { chromium } from 'playwright';
const USER_DATA = 'C:/Users/Junait/AppData/Local/Google/Chrome/User Data';
const PROFILE = 'Profile 41';

const ctx = await chromium.launchPersistentContext(USER_DATA, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  ignoreDefaultArgs: ['--enable-automation'],
  args: [
    `--profile-directory=${PROFILE}`,
    '--disable-blink-features=AutomationControlled',
    '--no-first-run', '--no-default-browser-check', '--start-maximized',
  ],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(8000);
const title = await page.title();
const signIn = await page.locator('text=/^Sign in$/').count();
const acct = await page.evaluate(() => {
  const a = document.querySelector('a[aria-label*="Google Account"],[aria-label*="@gmail.com"],img[alt*="@"]');
  return a ? (a.getAttribute('aria-label')||a.getAttribute('alt')||'').slice(0,100) : null;
});
await page.screenshot({ path: 'out/regular-home.png' });
console.log(JSON.stringify({ title, signInButtons: signIn, account: acct, loggedIn: signIn===0 && !!acct }, null, 2));
console.log('SHOT: out/regular-home.png');
await ctx.close();
