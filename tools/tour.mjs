// Records an explainer walkthrough of CFB/26 as numbered frames + an ffmpeg concat list with per-frame
// durations, using mocked ESPN data. Encode with tools/tour.sh.
// Usage: node tools/tour.mjs [phone|desktop] [outdir]
import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFile, mkdir, writeFile, rm } from 'fs/promises';
import { extname, join } from 'path';
import * as fx from './fixtures.mjs';
import { NARR } from './narration.mjs';
import { existsSync, readFileSync } from 'fs';

const mode = process.argv[2] || 'phone';
const out = process.argv[3] || `shots/tour-${mode}`;
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const root = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  try { const body = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('nf'); }
}).listen(0);
const port = server.address().port;

const PHONE = mode === 'phone';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const ctxOpts = PHONE
  ? { ...devices['iPhone 15'], deviceScaleFactor: 2.748, locale: 'en-US', timezoneId: 'America/Los_Angeles' } // 393x852 → 1080x2343, cropped to 1920 in ffmpeg? no: keep 1080x1920 by viewport 393x698
  : { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2, locale: 'en-US', timezoneId: 'America/Los_Angeles' };
if (PHONE) ctxOpts.viewport = { width: 393, height: 698 };
const context = await browser.newContext(ctxOpts);
await context.route(/site\.api\.espn\.com/, route => {
  const u = new URL(route.request().url());
  let body;
  if (u.pathname.endsWith('/scoreboard')) body = fx.scoreboard({ week: Number(u.searchParams.get('week') || 1) });
  else if (u.pathname.endsWith('/rankings')) body = fx.rankings();
  else if (u.pathname.endsWith('/standings')) body = fx.standings();
  else if (u.pathname.endsWith('/summary')) body = fx.summary(u.searchParams.get('event'));
  else if (/\/teams\/\d+\/schedule$/.test(u.pathname)) body = fx.schedule(u.pathname.split('/')[u.pathname.split('/').length - 2]);
  else if (/\/teams\/\d+$/.test(u.pathname)) body = fx.teamDetail(u.pathname.split('/').pop());
  else return route.fulfill({ status: 404, body: '{}' });
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
});
await context.route(/a\.espncdn\.com/, async route => {
  const m = route.request().url().match(/\/(\d+)\.png/);
  try { const body = await readFile(join(root, 'tools/logos', (m ? m[1] : 'x') + '.png')); return route.fulfill({ status: 200, contentType: 'image/png', body }); } catch {}
  try { const r = await route.fetch(); if (r.status() !== 200) throw 0; route.fulfill({ response: r }); } catch { route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#444"/></svg>' }); }
});
const page = await context.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.addInitScript(() => { try { localStorage.setItem('cfb26.welcome.v1', '1'); localStorage.setItem('cfb26.prefs.v1', JSON.stringify({ teams: ['194', '2483'], services: ['yttv'], tz: 'local', filter: 'all', theme: 'default' })); } catch {} });

// ---- overlay (captions, title cards, fake cursor) ---------------------------------------------
const OVERLAY = `
<style>
#tour{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Inter,Arial,sans-serif}
#tour .cap{position:absolute;left:50%;transform:translateX(-50%);bottom:${PHONE ? '8.5%' : '7%'};max-width:${PHONE ? '88%' : '62%'};background:rgba(8,9,12,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:${PHONE ? '14px 18px' : '16px 26px'};font-size:${PHONE ? '17px' : '24px'};line-height:1.35;text-align:center;font-weight:500;letter-spacing:-.01em;opacity:0;transition:opacity .28s ease,transform .28s ease;transform:translate(-50%,10px);box-shadow:0 20px 60px rgba(0,0,0,.5)}
#tour .cap.show{opacity:1;transform:translate(-50%,0)}
#tour .cap b{color:#f5a524;font-weight:600}
#tour .card{position:absolute;inset:0;background:#0b0c10;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8%;opacity:0;transition:opacity .35s ease}
#tour .card.show{opacity:1}
#tour .card .brand{font-size:${PHONE ? '64px' : '96px'};font-weight:600;letter-spacing:-.03em;color:#fff}
#tour .card .brand i{color:#f5a524;font-style:normal}#tour .card .brand s{text-decoration:none;color:#8a8f99;font-weight:300}
#tour .card .h{font-size:${PHONE ? '30px' : '48px'};font-weight:600;letter-spacing:-.02em;color:#fff;margin-top:18px;line-height:1.15}
#tour .card .s{font-size:${PHONE ? '17px' : '24px'};color:#a3a8b3;margin-top:16px;line-height:1.45;max-width:${PHONE ? '100%' : '760px'}}
#tour .card .url{margin-top:28px;font-family:ui-monospace,Menlo,monospace;font-size:${PHONE ? '15px' : '22px'};color:#f5a524;border:1px solid rgba(245,165,36,.4);padding:10px 18px;border-radius:999px}
#tour .cur{position:absolute;width:${PHONE ? '34px' : '26px'};height:${PHONE ? '34px' : '26px'};margin:${PHONE ? '-17px 0 0 -17px' : '-13px 0 0 -13px'};border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 10px rgba(0,0,0,.5);opacity:0;transition:left .45s cubic-bezier(.2,.7,.2,1),top .45s cubic-bezier(.2,.7,.2,1),opacity .2s,transform .12s}
#tour .cur.on{opacity:1}#tour .cur.press{transform:scale(.7);background:rgba(245,165,36,.7)}
</style>
<div id="tour"><div class="card"></div><div class="cap"></div><div class="cur"></div></div>`;
await page.addInitScript(html => { document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('beforeend', html)); }, OVERLAY);

// ---- frame capture with explicit durations -------------------------------------------------
let n = 0, T = 0; const list = [], cues = [];
const DUR = existsSync('shots/voice/durations.json') ? JSON.parse(readFileSync('shots/voice/durations.json', 'utf8')) : {};
let sayEnd = 0;
const frame = async (dur = 1 / 30) => { const f = `${String(n++).padStart(4, '0')}.png`; await page.screenshot({ path: join(out, f), animations: 'allow' }); list.push(`file '${f}'\nduration ${dur.toFixed(4)}`); T += dur; };
const hold = async s => frame(s);
const animate = async (s, fps = 24) => { const k = Math.max(1, Math.round(s * fps)); for (let i = 0; i < k; i++) { await page.waitForTimeout(1000 / fps); await frame(1 / fps); } };
const ev = (fn, arg) => page.evaluate(fn, arg);

// Narration: a cue starts a voice line at the current time; settle() waits until the line has finished (+ a beat).
const say = key => { if (!NARR[key] || !DUR[key]) return; cues.push({ key, t: +T.toFixed(3) }); sayEnd = T + DUR[key] + 0.45; };
const settle = async () => { if (T < sayEnd) await hold(sayEnd - T); };
const caption = async (key, dwell = 0) => { await settle(); const html = key ? NARR[key].cap : ''; say(key); await ev(h => { const c = document.querySelector('#tour .cap'); if (!h) { c.classList.remove('show'); return; } c.innerHTML = h; c.classList.add('show'); }, html); await animate(0.35); if (dwell) await hold(dwell); };
const card = async (key, html, secs) => { await settle(); say(key); await ev(h => { const c = document.querySelector('#tour .card'); c.innerHTML = h; c.classList.add('show'); }, html); await animate(0.4); await hold(secs); await settle(); await ev(() => document.querySelector('#tour .card').classList.remove('show')); await animate(0.4); };
const cursorTo = async (sel, opts = {}) => {
  try { await page.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 1500 }); await page.waitForTimeout(150); } catch {}
  const box = await page.locator(sel).first().boundingBox(); if (!box) { console.log('no box for', sel); return null; }
  const x = box.x + box.width * (opts.fx ?? 0.5), y = box.y + box.height * (opts.fy ?? 0.5);
  await ev(([x, y]) => { const c = document.querySelector('#tour .cur'); c.style.left = x + 'px'; c.style.top = y + 'px'; c.classList.add('on'); }, [x, y]);
  await animate(0.5); return { x, y };
};
const tap = async (sel, opts = {}) => {
  const p = await cursorTo(sel, opts); if (!p) return;
  await ev(() => document.querySelector('#tour .cur').classList.add('press')); await animate(0.15);
  await page.locator(sel).first().click({ force: true, position: opts.fx != null ? undefined : undefined });
  await ev(() => document.querySelector('#tour .cur').classList.remove('press')); await animate(0.25);
};
const cursorOff = async () => { await ev(() => document.querySelector('#tour .cur').classList.remove('on')); };
const scrollTo = async (y, secs) => { const y0 = await ev(() => scrollY); const k = Math.round(secs * 24); for (let i = 1; i <= k; i++) { const t = i / k, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; await ev(v => scrollTo(0, v), y0 + (y - y0) * e); await page.waitForTimeout(1000 / 24); await frame(1 / 24); } };
const scrollToEl = async (sel, secs, offset = 0) => { const y = await ev(([s, o]) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY - o : scrollY; }, [sel, offset]); await scrollTo(y, secs); };
const go = async (hash, wait = 900) => { await ev(h => { location.hash = h; }, hash); await page.waitForTimeout(wait); };
const url = 'cfb26-master-primez.vercel.app';

// ---- scenes ------------------------------------------------------------------------------
await page.goto(`http://localhost:${port}/#/home`);
await page.waitForTimeout(1500);
await ev(() => scrollTo(0, 0));

// 1. Title card
await card('title', `<div class="brand"><i>CFB</i><s>/</s>26</div><div class="h">Your college football season,<br>one screen at a time.</div><div class="s">A quick tour</div>`, 2.6);

// 2. Home story
await ev(() => { location.hash = '#/home'; }); await page.waitForTimeout(400);
await animate(1.6); // intro autoplay
await caption('home', 1.2);
await scrollToEl('#prob', 1.6, 0);
await caption('prob');
await animate(1.4); await hold(0.6);
await scrollToEl('#matchup', 1.3);
await caption('matchup'); await animate(1.0); await hold(0.5);
await scrollToEl('#season', 1.3);
await caption('season'); await animate(1.2); await hold(0.6);
await scrollToEl('#standing', 1.2);
await caption('standing'); await animate(0.9); await hold(0.4);
await scrollToEl('#others', 1.1);
await caption('others'); await animate(0.9); await hold(0.4);
await scrollToEl('#deeper', 1.1);
await caption('deeper'); await animate(0.9); await hold(0.6);
await caption(null);

// 3. Scores
const navSel = PHONE ? '#tabbar a[href="#/scores"]' : '#nav a[href="#/scores"]';
await tap(navSel); await page.waitForTimeout(700); await cursorOff();
await caption('scores'); await animate(1.2); await hold(0.8);
if (!PHONE) { await scrollTo(500, 1.2); await hold(0.4); await scrollTo(0, 0.8); }
else { await scrollTo(700, 1.4); await hold(0.4); await scrollTo(0, 0.8); }
await caption('boxscore'); await animate(0.3);
await tap('[data-game]'); await page.waitForTimeout(900); await cursorOff(); await animate(0.8); await hold(0.9);
if (!PHONE) { await scrollTo(400, 1.0); await hold(0.5); }
await caption(null);

// 4. TV guide
await tap(PHONE ? '#tabbar a[href="#/tv"]' : '#nav a[href="#/tv"]'); await page.waitForTimeout(900); await cursorOff();
await caption(PHONE ? 'tv_phone' : 'tv'); await animate(1.2); await hold(0.8);
await scrollTo(PHONE ? 600 : 500, 1.4); await hold(0.5); await scrollTo(0, 0.8);
await caption(null);

// 5. Rankings (desktop) / skip on phone
if (!PHONE) {
  await tap('#nav a[href="#/rankings"]'); await page.waitForTimeout(900); await cursorOff();
  await caption('rankings'); await animate(1.0); await hold(0.9);
  await caption(null);
}

// 6. Playoff
await tap(PHONE ? '#tabbar a[href="#/playoff"]' : '#nav a[href="#/playoff"]'); await page.waitForTimeout(900); await cursorOff();
await caption('playoff'); await animate(1.2); await hold(0.8);
if (PHONE) { await scrollTo(600, 1.4); await hold(0.4); }
await caption(null);

// 7. Teams → team page
await tap(PHONE ? '#tabbar a[href="#/teams"]' : '#nav a[href="#/teams"]'); await page.waitForTimeout(900); await cursorOff();
await caption('teams'); await animate(0.9); await hold(0.6);
await tap('a[href="#/team/130"], [data-team="130"]'); await page.waitForTimeout(1000); await cursorOff();
await caption('teampage'); await animate(1.0); await hold(0.7);
await scrollTo(PHONE ? 500 : 350, 1.2); await hold(0.4);
await caption(null);

// 8. My Setup
await ev(() => scrollTo(0, 0)); await page.waitForTimeout(200);
await tap('#btn-settings'); await page.waitForTimeout(600); await cursorOff();
await caption('setup'); await animate(0.6);
for (const q of ['M', 'Mi', 'Mic', 'Mich']) { await ev(v => { const i = document.querySelector('#team-search'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, q); await animate(0.14); } await animate(0.4);
await tap('#modal-body [data-star="130"]'); await page.waitForTimeout(300); await cursorOff(); await hold(0.7);
await caption('services'); await animate(0.4);
await tap('[data-service="peacock"]'); await cursorOff(); await hold(0.6);
await caption('theme'); await animate(0.3);
await tap('[data-theme-opt="team"]'); await cursorOff(); await animate(0.6); await hold(0.6);
await caption('share'); await animate(0.3);
await cursorTo('#copy-url'); await hold(1.2); await cursorOff();
await caption(null);
await tap('#modal-close'); await page.waitForTimeout(400); await cursorOff();
await go('#/home', 500); await ev(() => scrollTo(0, 0)); await animate(1.6);
await caption('saved'); await animate(1.0); await hold(1.2);
await caption(null);

// 9. End card
await card('end', `<div class="brand"><i>CFB</i><s>/</s>26</div><div class="h">Pick your teams.<br>Know how to watch.</div><div class="url">${url}</div>`, 3.0);

list.push(`file '${String(n - 1).padStart(4, '0')}.png'`);
await writeFile(join(out, 'frames.txt'), list.join('\n') + '\n');
await writeFile(join(out, 'cues.json'), JSON.stringify(cues, null, 1));
console.log('frames', n, 'seconds', T.toFixed(1), 'cues', cues.length, '→', out);
await browser.close(); server.close();
