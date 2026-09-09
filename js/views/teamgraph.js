// Team page → "Season" panel: this team's AP + Coaches position week by week, with each game's result underneath.
import { esc } from '../ui.js';

const C = { ap: '#f5a524', usa: '#6aa9ff', win: '#4fc98a', loss: '#ff5a4a' };

export function renderSeasonGraph(id, hist, events) {
  id = String(id);
  const polls = hist?.polls || {};
  const games = new Map(events.filter(e => e.week).map(e => [e.week, e]));
  const pollWeeks = ['ap', 'usa'].flatMap(k => Object.keys(polls[k] || {}).filter(w => polls[k][w][id]).map(Number));
  const playedWeeks = events.filter(e => e.state === 'post' && e.week).map(e => e.week);
  const maxW = Math.max(0, ...pollWeeks, ...playedWeeks);
  if (!maxW) return '';
  const weeks = Array.from({ length: maxW }, (_, i) => i + 1);
  const rank = (k, w) => polls[k]?.[w]?.[id]?.r || null;
  const n = weeks.length;

  const phone = matchMedia('(max-width: 720px)').matches;
  const W = phone ? 76 * n + 90 : Math.max(1180, 76 * n + 90), H = 320, padL = 44, padR = 40, padT = 28, padB = 78;
  const x = i => padL + (n > 1 ? (i / (n - 1)) * (W - padL - padR) : (W - padL - padR) / 2);
  const y = r => padT + ((r - 1) / 24) * (H - padT - padB);
  const gy = H - padB + 24;

  const grid = [1, 5, 10, 15, 20, 25].map(r => `<line x1="${padL}" x2="${W - padR}" y1="${y(r)}" y2="${y(r)}" stroke="rgba(255,255,255,.08)"${r === 1 ? '' : ' stroke-dasharray="2 4"'}/><text x="${padL - 10}" y="${y(r) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${r === 1 ? '#1' : r}</text>`).join('');
  const cols = weeks.map((w, i) => `<text x="${x(i)}" y="${padT - 12}" text-anchor="middle" font-size="9" letter-spacing="1" fill="var(--muted)">WK ${w}</text><line x1="${x(i)}" x2="${x(i)}" y1="${padT}" y2="${H - padB}" stroke="rgba(255,255,255,.05)"/>`).join('');
  const lossBand = weeks.map((w, i) => { const g = games.get(w); return g && g.state === 'post' && !g.won ? `<rect x="${x(i) - 14}" y="${padT}" width="28" height="${H - padB - padT}" fill="rgba(255,90,74,.07)"/>` : ''; }).join('');

  const series = k => {
    const runs = []; let run = [];
    weeks.forEach((w, i) => { const r = rank(k, w); if (r) run.push([x(i), y(r)]); else { if (run.length) runs.push(run); run = []; } });
    if (run.length) runs.push(run);
    const paths = runs.map(r => r.length > 1 ? `<path d="M${r.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L')}" fill="none" stroke="${C[k]}" stroke-width="${k === 'ap' ? 3 : 2.5}" stroke-linejoin="round" stroke-linecap="round"${k === 'usa' ? ' opacity=".9"' : ''}/>` : '').join('');
    const dots = weeks.map((w, i) => { const r = rank(k, w); return r ? `<circle cx="${x(i)}" cy="${y(r)}" r="3.5" fill="${C[k]}" stroke="var(--panel)" stroke-width="1.5"><title>Week ${w} · ${k === 'ap' ? 'AP' : 'Coaches'} #${r}</title></circle>` : ''; }).join('');
    return paths + dots;
  };
  const lastAp = rank('ap', maxW), lastCo = rank('usa', maxW);
  const endLbl = (lastAp ? `<text x="${x(n - 1) + 10}" y="${y(lastAp) + 4}" font-size="11" font-weight="700" fill="${C.ap}">#${lastAp}</text>` : '') +
    (lastCo ? `<text x="${x(n - 1) + 10}" y="${y(lastCo) + (lastCo === lastAp ? 16 : 4)}" font-size="11" font-weight="700" fill="${C.usa}">#${lastCo}</text>` : '');

  const results = weeks.map((w, i) => {
    const g = games.get(w);
    if (!g) return `<text x="${x(i)}" y="${gy + 4}" text-anchor="middle" font-size="9" fill="var(--muted)">BYE</text>`;
    const opp = `${g.home || g.neutral ? 'vs' : 'at'} ${esc((g.opp.abbr || g.opp.name).toUpperCase())}`;
    if (g.state !== 'post') return `<text x="${x(i)}" y="${gy + 4}" text-anchor="middle" font-size="9" fill="var(--muted)">${g.state === 'in' ? 'LIVE' : '·'}</text><text x="${x(i)}" y="${gy + 22}" text-anchor="middle" font-size="9" fill="var(--muted)">${opp}</text>`;
    const col = g.won ? C.win : C.loss, m = (g.score || 0) - (g.oppScore || 0);
    return `<a href="#/game/${g.id}"><circle cx="${x(i)}" cy="${gy}" r="9" fill="${col}"/><text x="${x(i)}" y="${gy + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#0b0d10">${g.won ? 'W' : 'L'}</text>
      <text x="${x(i)}" y="${gy + 22}" text-anchor="middle" font-size="9" fill="var(--text)">${opp}</text>
      <text x="${x(i)}" y="${gy + 34}" text-anchor="middle" font-size="9" fill="${col}">${m > 0 ? '+' : ''}${m}</text></a>`;
  }).join('');

  return `<div class="panel teamgraph">
    <div class="tg-head"><div class="disp h3">Season</div><div class="sub">POLL POSITION WEEK BY WEEK · RESULTS BELOW</div>
      <div class="rg-legend mono"><span><i style="background:${C.ap}"></i>AP TOP 25</span><span><i style="background:${C.usa}"></i>COACHES</span><span><i class="dot" style="background:${C.win}"></i>WIN</span><span><i class="dot" style="background:${C.loss}"></i>LOSS</span></div></div>
    <div class="tg-wrap"><svg class="tg-svg mono" viewBox="0 0 ${W} ${H}" style="${phone ? `width:${W}px;max-width:none` : ""}">${lossBand}${grid}${cols}${series('usa')}${series('ap')}${endLbl}${results}</svg></div>
  </div>`;
}
