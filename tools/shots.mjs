// Screenshot every screen on an emulated iPhone (and optionally desktop) using mocked ESPN responses.
// Usage: node tools/shots.mjs [iphone|desktop] [outdir]
import { chromium, devices } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import * as fx from './fixtures.mjs';

const mode = process.argv[2] || 'iphone';
const out = process.argv[3] || `shots/${mode}`;
const root = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  try { const body = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('nf'); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const ctxOpts = mode === 'iphone' ? { ...devices['iPhone 15'], locale: 'en-US', timezoneId: 'America/Los_Angeles' } : { viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Los_Angeles' };
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
// Logos: real CDN is reachable? If not, serve a placeholder so layout still renders.
await context.route(/a\.espncdn\.com/, async route => {
  try { const r = await route.fetch(); if (r.status() !== 200) throw 0; route.fulfill({ response: r }); } catch { route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#444"/></svg>' }); }
});
const page = await context.newPage();
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.addInitScript(() => { try { localStorage.setItem('cfb26.welcome.v1', '1'); localStorage.setItem('cfb26.prefs.v1', JSON.stringify({ teams: ['194', '2483'], services: ['peacock', 'yttv'], tz: 'local', filter: 'all' })); } catch {} });

const shots = [['home', '#/home'], ['scores', '#/scores'], ['tv', '#/tv'], ['rankings', '#/rankings'], ['playoff', '#/playoff'], ['teams', '#/teams'], ['team', '#/team/2483'], ['game', '#/game/4018100']];
await page.goto(`http://localhost:${port}/`);
await page.waitForTimeout(1500);
for (const [name, hash] of shots) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(1200);
  if (name === 'home') { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(2500); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); }
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  console.log(name, w.doc > w.win ? `HORIZONTAL OVERFLOW ${w.doc}>${w.win}` : 'ok');
}
await page.evaluate(() => { location.hash = '#/scores'; }); await page.waitForTimeout(800);
await page.click('#btn-settings'); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/setup.png`, fullPage: false });
await browser.close(); server.close();
console.log('done →', out);
