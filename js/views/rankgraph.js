// Rankings → "Season graph": a bump chart of every ranked team, week 1 → now. Emphasis form: highlighted teams in
// color, everyone else gray until hovered/pinned. History comes from the Worker (/polls); falls back to what this
// device has seen (localStorage) when accounts are off.
import { esc, viewSwitch, isMobile, pinchZoom, zoomControl } from '../ui.js';
import { state } from '../state.js';
import { API_URL } from '../config.js';
import { logoUrl } from '../api.js';

let cache = null; // {season, polls:{ap:{week:{id:{r,n,p}}}, usa:…}}
export async function loadPollHistory(ctx) {
  if (cache && Date.now() - cache.t < 5 * 60_000) return cache;
  let polls = {};
  if (API_URL) { try { const d = await (await fetch(API_URL + '/polls')).json(); polls = d.polls || {}; } catch (e) { console.warn('polls', e); } }
  // Merge in local observations (older devices / no API) and the live poll for the current week.
  try { const h = JSON.parse(localStorage.getItem('cfb26.rankhist.v1') || '{}'); polls.ap = polls.ap || {}; Object.entries(h).forEach(([w, m]) => { if (!polls.ap[w]) polls.ap[w] = Object.fromEntries(Object.entries(m).map(([id, r]) => [id, { r }])); }); } catch {}
  for (const [key, poll] of [['ap', ctx.rankings?.ap], ['usa', ctx.rankings?.polls?.find(p => p.type === 'usa')], ['cfp', ctx.rankings?.cfp]]) {
    const w = poll?.occurrence?.number; if (!poll || !w) continue;
    polls[key] = polls[key] || {};
    if (!polls[key][w]) polls[key][w] = Object.fromEntries(poll.ranks.map(x => [String(x.team.id), { r: x.current, n: x.team.nickname || x.team.name, p: x.points }]));
    if (w > 1 && !polls[key][w - 1]) polls[key][w - 1] = Object.fromEntries(poll.ranks.filter(x => x.previous).map(x => [String(x.team.id), { r: x.previous, n: x.team.nickname || x.team.name }]));
  }
  cache = { t: Date.now(), polls };
  return cache;
}

const POLL_NAMES = { ap: 'AP Top 25', usa: 'Coaches', cfp: 'CFP' };

export function renderRankGraph(ctx, hist, params) {
  const pollKey = params.poll && hist.polls[params.poll] ? params.poll : (hist.polls.ap ? 'ap' : Object.keys(hist.polls)[0]);
  const poll = hist.polls[pollKey] || {};
  const weeks = Object.keys(poll).map(Number).sort((a, b) => a - b);
  const hl = params.hl || 'mine';
  const dir = ctx.directory;
  const nameOf = id => dir?.teams.find(t => t.id === id)?.name || Object.values(poll).map(w => w[id]?.n).find(Boolean) || id;
  const teams = new Map();
  weeks.forEach(w => Object.entries(poll[w]).forEach(([id, v]) => { if (!teams.has(id)) teams.set(id, {}); teams.get(id)[w] = v.r; }));
  const last = weeks[weeks.length - 1], prevW = weeks[weeks.length - 2];
  const pollBtns = Object.keys(hist.polls).map(k => `<a class="btn${k === pollKey ? ' on' : ''}" href="#/rankings?view=graph&poll=${k}&hl=${hl}">${POLL_NAMES[k] || k}</a>`).join('');
  const hlBtns = [['mine', 'My Teams'], ['top5', 'Top 5'], ['movers', 'Biggest movers'], ['none', 'None']].map(([k, l]) => `<a class="btn${k === hl ? ' on' : ''}" href="#/rankings?view=graph&poll=${pollKey}&hl=${k}">${l}</a>`).join('');
  const toolbar = `<div class="toolbar"><div class="disp h1">Rankings</div><div class="sub">${esc(POLL_NAMES[pollKey] || pollKey).toUpperCase()} · WEEK ${weeks[0] || '–'} → ${last || '–'}</div><span class="spacer"></span>${viewSwitch([{ key: 'polls', label: 'Polls', icon: 'list', href: '#/rankings' }, { key: 'graph', label: 'Season graph', icon: 'chart', href: `#/rankings?view=graph&poll=${pollKey}&hl=${hl}` }], 'graph')}</div><div class="toolbar"><span class="label">Poll</span>${pollBtns}<span class="sep"></span><span class="label">Highlight</span>${hlBtns}</div>`;
  if (weeks.length < 2) return toolbar + `<div class="panel empty">The graph draws once two weeks of the ${esc(POLL_NAMES[pollKey] || pollKey)} poll have been recorded. ${weeks.length ? 'One week so far — check back after the next poll.' : 'No poll recorded yet.'}</div>`;

  // Which teams are emphasized.
  let emph = new Set();
  if (hl === 'mine') emph = new Set([...state.myTeams].filter(id => teams.has(id)));
  else if (hl === 'top5') emph = new Set([...teams].filter(([, m]) => m[last] && m[last] <= 5).map(([id]) => id));
  else if (hl === 'movers') { const mv = [...teams].map(([id, m]) => [id, (m[weeks[0]] || 26) - (m[last] || 26)]).filter(([, d]) => d !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4); emph = new Set(mv.map(([id]) => id)); }
  const palette = ['#f5a524', '#fee123', '#4fc98a', '#ff5a4a', '#6aa9ff', '#c084fc'];
  const colorOf = new Map([...emph].map((id, i) => [id, palette[i % palette.length]]));

  // Geometry (viewBox units; the SVG scales to its container).
  const W = 1180, padL = 150, padR = 160, padT = 34, padB = 16, rowH = 26, H = padT + 24 * rowH + padB;
  const xs = w => padL + (weeks.indexOf(w)) * (W - padL - padR) / (weeks.length - 1);
  const ys = r => padT + (r - 1) * rowH;
  const grid = Array.from({ length: 25 }, (_, i) => `<line x1="${padL - 8}" x2="${W - padR + 8}" y1="${ys(i + 1)}" y2="${ys(i + 1)}" stroke="var(--line2)"/>`).join('');
  const wkLabels = weeks.map(w => `<text x="${xs(w)}" y="${padT - 16}" class="mono" font-size="10" fill="var(--muted)" text-anchor="middle" letter-spacing="1">WK ${w}</text>`).join('');
  const segs = (m) => { const out = []; let run = []; weeks.forEach(w => { if (m[w]) run.push([xs(w), ys(m[w])]); else { if (run.length) out.push(run); run = []; } }); if (run.length) out.push(run); return out; };
  const line = (id, m, on) => segs(m).map(run => run.length > 1 ? `<path d="M${run.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')}" fill="none" stroke="${on ? colorOf.get(id) : 'var(--line3)'}" stroke-width="${on ? 3 : 2}" stroke-linejoin="round" stroke-linecap="round"/>` : '').join('') +
    weeks.filter(w => m[w]).map(w => `<circle cx="${xs(w).toFixed(1)}" cy="${ys(m[w]).toFixed(1)}" r="${on ? 5 : 3.5}" fill="${on ? colorOf.get(id) : 'var(--line3)'}" stroke="var(--panel)" stroke-width="2"/>`).join('');
  const series = [...teams].sort((a, b) => (emph.has(a[0]) ? 1 : 0) - (emph.has(b[0]) ? 1 : 0)).map(([id, m]) => `<g class="rg-line${emph.has(id) ? ' on' : ''}" data-team="${id}" style="--c:${colorOf.get(id) || 'var(--amber)'}">${line(id, m, emph.has(id))}</g>`).join('');
  const labelL = [...teams].filter(([, m]) => m[weeks[0]]).map(([id, m]) => `<text x="${padL - 16}" y="${ys(m[weeks[0]]) + 4}" text-anchor="end" font-size="12" class="rg-lbl${emph.has(id) ? ' on' : ''}" data-team="${id}">${m[weeks[0]]}  ${esc(nameOf(id))}</text>`).join('');
  const labelR = [...teams].filter(([, m]) => m[last]).map(([id, m]) => { const d = (prevW && m[prevW] ? m[prevW] : 26) - m[last]; const arrow = d > 0 ? `<tspan fill="var(--win)"> ▲${d}</tspan>` : d < 0 ? `<tspan fill="var(--live)"> ▼${-d}</tspan>` : ''; return `<text x="${W - padR + 16}" y="${ys(m[last]) + 4}" font-size="12" class="rg-lbl${emph.has(id) ? ' on' : ''}" data-team="${id}">${m[last]}  ${esc(nameOf(id))}${arrow}</text>`; }).join('');
  const legend = emph.size ? [...emph].map(id => `<span><i style="background:${colorOf.get(id)}"></i>${esc(nameOf(id)).toUpperCase()}</span>`).join('') : '';
  const html = toolbar + `<div class="panel rankgraph" id="rg-wrap">
      <div class="rg-legend mono">${legend}<span><i style="background:var(--line3)"></i>EVERYONE ELSE · HOVER OR TAP A NAME</span><span class="rg-note">RANK 1 AT TOP · A GAP MEANS THE TEAM DROPPED OUT OF THE 25</span></div>
      <svg viewBox="0 0 ${W} ${H}" class="rg-svg" id="rg-svg">${grid}${wkLabels}<g id="rg-lines">${series}</g>${labelL}${labelR}<g id="rg-hover"></g></svg>
      <div class="rg-tip mono" id="rg-tip" hidden></div>
    </div>${isMobile() ? zoomControl('rgzoom') : ''}`;
  const mount = root => {
    const svg = root.querySelector('#rg-svg'); if (!svg) return;
    const zc = root.querySelector('#rgzoom');
    if (zc) pinchZoom(root.querySelector('#rg-wrap'), svg, 'cfb26.rgzoom.v1', { initial: 1.8, min: 0.8, max: 4, alt: 3, width: true, pad: 16, label: zc.querySelector('.zv'), buttons: [...zc.querySelectorAll('[data-zoom]')] });
    const tip = root.querySelector('#rg-tip');
    const pinned = new Set();
    const setHover = id => { svg.querySelectorAll('.rg-line, .rg-lbl').forEach(el => el.classList.toggle('hover', !!id && el.dataset.team === id)); };
    svg.addEventListener('mouseover', e => { const id = e.target.closest('[data-team]')?.dataset.team; if (id) setHover(id); });
    svg.addEventListener('mouseleave', () => { setHover(null); tip.hidden = true; });
    svg.addEventListener('click', e => { const id = e.target.closest('[data-team]')?.dataset.team; if (!id) return; svg.querySelectorAll(`[data-team="${id}"]`).forEach(el => el.classList.toggle('pin')); });
    svg.addEventListener('mousemove', e => {
      const id = e.target.closest('[data-team]')?.dataset.team; const c = e.target.closest('circle'); if (!id || !c) { tip.hidden = true; return; }
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      const w = weeks.reduce((best, x) => Math.abs(xs(x) - loc.x) < Math.abs(xs(best) - loc.x) ? x : best, weeks[0]);
      const v = poll[w]?.[id]; if (!v) { tip.hidden = true; return; }
      tip.innerHTML = `<div class="k">WEEK ${w} · ${esc(POLL_NAMES[pollKey] || pollKey).toUpperCase()}</div><div class="v"><img src="${logoUrl(id)}" alt="">${esc(nameOf(id))} <b>#${v.r}</b></div>${v.p ? `<div class="k">${Number(v.p).toLocaleString()} PTS</div>` : ''}`;
      tip.hidden = false; const r = root.querySelector('.rankgraph').getBoundingClientRect();
      tip.style.left = Math.min(e.clientX - r.left + 14, r.width - 190) + 'px'; tip.style.top = (e.clientY - r.top - 54) + 'px';
    });
  };
  return { html, mount };
}
