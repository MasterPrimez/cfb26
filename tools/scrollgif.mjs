// Capture a scroll-through of the Story home as numbered frames (later stitched into a GIF).
// Usage: node tools/scrollgif.mjs [iphone|desktop] [outdir]
import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join } from 'path';
import * as fx from './fixtures.mjs';

const mode = process.argv[2] || 'iphone';
const out = process.argv[3] || `shots/scroll-${mode}`;
await mkdir(out, { recursive: true });
const root = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  try { const body = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('nf'); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const ctxOpts = mode === 'iphone' ? { ...devices['iPhone 15'], locale: 'en-US', timezoneId: 'America/Los_Angeles' } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/Los_Angeles' };
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
  try { const r = await route.fetch(); if (r.status() !== 200) throw 0; route.fulfill({ response: r }); } catch { route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#444"/></svg>' }); }
});
const page = await context.newPage();
await page.addInitScript(() => { try { localStorage.setItem('cfb26.prefs.v1', JSON.stringify({ teams: ['194', '2483'], services: ['peacock', 'yttv'], tz: 'local', filter: 'all', theme: 'team' })); } catch {} });
await page.goto(`http://localhost:${port}/#/home`);
await page.waitForTimeout(2500);
const total = await page.evaluate(() => document.body.scrollHeight - innerHeight);
const step = await page.evaluate(() => Math.round(innerHeight * 0.12));
let i = 0;
const snap = async () => { await page.screenshot({ path: `${out}/${String(i++).padStart(3, '0')}.png` }); };
await snap(); await snap();
for (let y = 0; y <= total; y += step) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(90); await snap(); }
await page.waitForTimeout(600); await snap(); await snap(); await snap();
console.log('frames', i, 'scroll px', total);
await browser.close(); server.close();
