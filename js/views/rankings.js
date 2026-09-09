import { esc, viewSwitch } from '../ui.js';
import { darkLogo } from '../api.js';
import { state } from '../state.js';

export function renderRankings(ctx) {
  const polls = ctx.rankings?.polls || [];
  if (!polls.length) return '<div class="panel empty">Rankings unavailable right now.</div>';
  const col = p => `<div class="panel panel-pad">
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px"><div class="disp h3">${esc(p.name)}</div><div class="sub">${esc(p.occurrence?.displayValue || '')}${p.date ? ' · ' + esc(p.date) : ''}</div></div>
    <div class="rank-list">${p.ranks.map(r => `<div class="rank-row">
      <span class="n${r.current <= 12 ? ' top' : ''}">${r.current}</span>
      <img src="${esc(darkLogo(r.team.logo))}" alt="" loading="lazy">
      <a class="nm" href="#/team/${r.team.id}"${state.isMine(r.team.id) ? ' style="color:var(--amber)"' : ''}>${esc(r.team.nickname)} <span class="muted" style="font-size:12px">${esc(r.team.name)}</span></a>
      <span class="rec">${esc(r.recordSummary || '')}</span>
      <span class="rec" style="width:44px;text-align:right">${r.points ? Math.round(r.points) : ''}</span>
      <span class="tr ${trendClass(r)}">${trendText(r)}</span>
    </div>`).join('')}</div>
    ${p.others?.length ? `<div class="hr" style="margin:12px 0"></div><div class="sub" style="line-height:1.6">Others receiving votes: ${p.others.map(o => esc(o.team.nickname || o.team.name) + ' ' + Math.round(o.points)).join(', ')}</div>` : ''}
  </div>`;
  return `<div class="toolbar"><div class="disp h1">Rankings</div><div class="sub">${polls.length} POLL${polls.length === 1 ? '' : 'S'} · CFP COMMITTEE RANKINGS APPEAR HERE ONCE RELEASED IN NOVEMBER</div><span class="spacer"></span>${viewSwitch([{ key: 'polls', label: 'Polls', icon: 'list', href: '#/rankings' }, { key: 'graph', label: 'Season graph', icon: 'chart', href: '#/rankings?view=graph' }], 'polls')}</div>
    <div class="rank-cols">${polls.map(col).join('')}</div>`;
}

function trendClass(r) {
  const t = Number(r.trend);
  if (!r.previous || r.previous === 0) return 'muted';
  return t > 0 ? 'up' : t < 0 ? 'down' : 'muted';
}
function trendText(r) {
  if (!r.previous || r.previous === 0) return 'NEW';
  const t = Number(r.trend);
  return t > 0 ? '▲' + t : t < 0 ? '▼' + Math.abs(t) : '—';
}
