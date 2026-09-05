import { esc, statusBadge } from '../ui.js';
import { api, normalizeEvent, logoUrl } from '../api.js';
import { fmtDay, state } from '../state.js';
import { watchOptions, primaryNetwork, displayNetwork } from '../networks.js';

const TZS = [['pt', 'America/Los_Angeles', 'Pacific'], ['mt', 'America/Denver', 'Mountain'], ['ct', 'America/Chicago', 'Central'], ['et', 'America/New_York', 'Eastern']];

export async function renderGame(ctx, params) {
  const id = params.id;
  let g = ctx.games.find(x => x.id === id) || ctx.allGames?.get(id);
  let sum = null;
  try { sum = await api.summary(id); } catch {}
  if (!g && sum?.header?.competitions?.[0]) g = normalizeEvent({ id, name: '', shortName: '', date: sum.header.competitions[0].date, status: sum.header.competitions[0].status, competitions: [{ ...sum.header.competitions[0], venue: sum.gameInfo?.venue, odds: sum.pickcenter }], week: sum.header.week ? { number: sum.header.week } : undefined });
  if (!g) return '<div class="panel empty">Game not found.</div>';

  const opts = watchOptions(g.networks);
  const mine = state.myServices;
  const watch = opts.length ? opts.map(o => `<a class="watch-item${mine.has(o.id) ? ' have' : ''}" href="${esc(o.url)}" target="_blank" rel="noopener"><span>${esc(o.name)}</span><span class="tag">${mine.has(o.id) ? 'YOU HAVE THIS' : (o.kind === 'primary' ? 'STREAMS ' + esc(displayNetwork(o.via).toUpperCase()) : 'LIVE TV BUNDLE')}</span></a>`).join('') : `<div class="sub">${g.networks.length ? 'Check local listings' : 'Broadcast not announced yet'}</div>`;

  const times = TZS.map(([k, z, n]) => `<div><div class="label">${n}</div><div class="mono" style="font-size:15px;margin-top:3px">${g.tbd ? 'TBA' : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: z }).format(g.date)}</div></div>`).join('');

  // Box score bits from the summary, when present.
  const bs = sum?.boxscore?.teams || [];
  const statOf = (teamId, name) => bs.find(t => String(t.team?.id) === String(teamId))?.statistics?.find(s => s.name === name)?.displayValue;
  const statRows = [['totalYards', 'Total yards'], ['netPassingYards', 'Passing'], ['rushingYards', 'Rushing'], ['thirdDownEff', '3rd down'], ['turnovers', 'Turnovers'], ['possessionTime', 'Possession']];
  const toNum = v => { if (v == null) return 0; if (/^\d+-\d+$/.test(v)) { const [a, b] = v.split('-').map(Number); return b ? a / b : 0; } if (/^\d+:\d+$/.test(v)) { const [m, s] = v.split(':').map(Number); return m * 60 + s; } return Number(v) || 0; };
  const stats = bs.length ? statRows.map(([k, label]) => { const a = statOf(g.away.id, k), h = statOf(g.home.id, k); if (a == null && h == null) return ''; const na = toNum(a), nh = toNum(h), mx = Math.max(na, nh) || 1; return `<div class="statbar"><div class="nums"><span>${esc(a ?? '—')}</span><span class="label">${label}</span><span>${esc(h ?? '—')}</span></div><div class="bars"><div class="l"><i style="width:${Math.round(na / mx * 100)}%;background:${g.away.color}"></i></div><div><i style="width:${Math.round(nh / mx * 100)}%;background:${g.home.color}"></i></div></div></div>`; }).join('') : '';

  const leaders = (sum?.leaders || []).map(tl => ({ team: tl.team, cats: (tl.leaders || []).filter(c => ['passingYards', 'rushingYards', 'receivingYards'].includes(c.name)).map(c => ({ label: c.displayName || c.name, top: c.leaders?.[0] })) }));
  const leaderHtml = leaders.length ? ['passingYards', 'rushingYards', 'receivingYards'].map((k, i) => { const label = ['Passing', 'Rushing', 'Receiving'][i]; const rows = leaders.map(l => { const c = l.cats.find(c => c.label.toLowerCase().includes(label.toLowerCase())); const t = c?.top; if (!t) return ''; return `<div class="kv"><span><span class="mono" style="font-size:10px;color:${String(l.team?.id) === g.home.id ? g.home.color : g.away.color};margin-right:6px">${esc(l.team?.abbreviation || '')}</span>${esc(t.athlete?.shortName || t.athlete?.displayName || '')}</span><span class="mono muted" style="font-size:11px">${esc(t.displayValue || '')}</span></div>`; }).join(''); return rows ? `<div><div class="label">${label}</div><div class="stack" style="gap:4px;margin-top:6px">${rows}</div></div>` : ''; }).join('') : '';

  const plays = (sum?.scoringPlays || []).slice(-8).reverse();
  const playsHtml = plays.length ? plays.map(p => `<div style="display:flex;gap:12px;font-size:13px"><span class="mono muted" style="width:80px;font-size:11px;flex-shrink:0">Q${p.period?.number ?? ''} ${esc(p.clock?.displayValue || '')}</span><span class="mono" style="width:44px;font-size:11px;flex-shrink:0;color:${String(p.team?.id) === g.home.id ? g.home.color : g.away.color}">${esc(p.team?.abbreviation || '')}</span><span>${esc(p.text || '')} <span class="muted mono" style="font-size:11px">${p.awayScore ?? ''}–${p.homeScore ?? ''}</span></span></div>`).join('') : '';

  const ls = g.home.linescores?.length || g.away.linescores?.length;
  const periods = Math.max(g.home.linescores?.length || 0, g.away.linescores?.length || 0, g.state === 'pre' ? 0 : 4);
  const lsTable = ls ? `<div class="panel rows"><table><thead><tr><th>Scoring</th>${Array.from({ length: periods }, (_, i) => `<th style="text-align:center">${i < 4 ? i + 1 : 'OT' + (i > 4 ? i - 3 : '')}</th>`).join('')}<th style="text-align:center">T</th></tr></thead><tbody>
    ${[g.away, g.home].map(t => `<tr><td><img class="mini" src="${esc(t.logo)}" alt="">${esc(t.name)}</td>${Array.from({ length: periods }, (_, i) => `<td class="mono" style="text-align:center">${t.linescores?.[i] ?? '<span class="muted">–</span>'}</td>`).join('')}<td class="mono" style="text-align:center;font-weight:500">${t.score ?? ''}</td></tr>`).join('')}</tbody></table></div>` : '';

  const wp = g.situation?.homeWin != null ? Math.round(g.situation.homeWin * 100) : (sum?.winprobability?.length ? Math.round(sum.winprobability[sum.winprobability.length - 1].homeWinPercentage * 100) : null);
  const venue = sum?.gameInfo?.venue || null;
  const weather = sum?.gameInfo?.weather;
  const side = (t, right) => `<div class="side${right ? ' r' : ''}">${right ? '' : `<img src="${esc(t.logo)}" alt="">`}<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><div class="mono amber" style="font-size:12px">${t.rank ? '#' + t.rank + ' · ' : ''}${right ? 'HOME' : (g.neutral ? 'NEUTRAL' : 'AWAY')}</div><div class="disp big"><a href="#/team/${t.id}" style="color:inherit">${esc(t.fullName)}</a></div><div class="sub">${esc(t.record)}${t.confRecord ? ' · ' + esc(t.confRecord) + ' conf' : ''}</div></div>${right ? `<img src="${esc(t.logo)}" alt="">` : ''}</div>`;

  return `<div class="sub" style="margin-bottom:6px"><a href="#/scores">← Scores</a></div>
    <div class="game-head" style="background:linear-gradient(90deg,${g.away.color}22 0%,transparent 40%,transparent 60%,${g.home.color}22 100%)">
      ${side(g.away, false)}
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">${statusBadge(g)}
        <div class="score"><span class="${g.state !== 'pre' && (g.away.score ?? 0) >= (g.home.score ?? 0) ? '' : 'muted'}">${g.state === 'pre' ? '' : g.away.score ?? ''}</span><span class="dash">${g.state === 'pre' ? esc(fmtDay(g.date)) : '–'}</span><span class="${g.state !== 'pre' && (g.home.score ?? 0) >= (g.away.score ?? 0) ? '' : 'muted'}">${g.state === 'pre' ? '' : g.home.score ?? ''}</span></div>
        <div class="sub">${g.state === 'in' && g.situation ? esc(g.situation.text || '') : (g.headline ? esc(g.headline) : '')}</div></div>
      ${side(g.home, true)}
    </div>
    <div class="game-cols">
      <div class="stack" style="gap:16px">
        <div class="panel panel-pad stack" style="gap:14px"><div class="disp h3">Kickoff</div>
          <div><div class="label">Date</div><div style="margin-top:3px">${esc(fmtDay(g.date))}</div></div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${times}</div>
          <div class="hr"></div>
          <div><div class="label">Venue</div><div style="margin-top:3px">${esc(venue?.fullName || g.venue?.name || 'TBA')}</div><div class="muted" style="font-size:12px">${esc([venue?.address?.city || g.venue?.city, venue?.address?.state || g.venue?.state].filter(Boolean).join(', '))}${g.neutral ? ' · Neutral site' : ''}${venue?.capacity ? ' · Cap. ' + Number(venue.capacity).toLocaleString() : ''}</div></div>
          ${weather?.displayValue ? `<div><div class="label">Weather</div><div class="mono" style="font-size:13px;margin-top:3px">${esc(weather.displayValue)}${weather.temperature != null ? ' · ' + esc(weather.temperature) + '°F' : ''}</div></div>` : ''}
        </div>
        <div class="panel panel-pad stack"><div class="disp h3">How to Watch</div>
          <div style="display:flex;align-items:center;gap:10px"><span class="badge net" style="min-width:54px;text-align:center">${esc(primaryNetwork(g.networks) || 'TBA')}</span><span style="font-size:13px">${g.networks.length > 1 ? 'Also: ' + esc(g.networks.slice(1).map(displayNetwork).join(', ')) : (/\+$/.test(g.networks[0] || '') ? 'Streaming only' : 'Broadcast')}</span></div>
          <div class="hr"></div><div class="watch-list">${watch}</div>
          <div class="sub">Set your services under My Setup to highlight what you can watch.</div>
        </div>
        ${g.odds ? `<div class="panel panel-pad stack" style="gap:8px"><div class="disp h3">Line</div><div class="kv"><span class="k">Spread</span><span class="mono">${esc(g.odds.details || '—')}</span></div>${g.odds.overUnder ? `<div class="kv"><span class="k">Total</span><span class="mono">O/U ${g.odds.overUnder}</span></div>` : ''}</div>` : ''}
      </div>
      <div class="stack" style="gap:16px">
        ${lsTable}
        ${stats ? `<div class="panel panel-pad stack" style="gap:14px"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="disp h3">Team Stats</div><div class="sub">${esc(g.away.abbr)} ◀ ▶ ${esc(g.home.abbr)}</div></div>${stats}</div>` : (g.state === 'pre' ? '<div class="panel empty">Team stats, scoring plays and leaders appear here once the game kicks off.</div>' : '')}
        ${playsHtml ? `<div class="panel panel-pad stack"><div class="disp h3">Scoring Plays</div>${playsHtml}</div>` : ''}
      </div>
      <div class="stack" style="gap:16px">
        ${leaderHtml ? `<div class="panel panel-pad stack" style="gap:12px"><div class="disp h3">Leaders</div>${leaderHtml}</div>` : ''}
        ${wp != null && g.state !== 'pre' ? `<div class="panel panel-pad stack" style="gap:8px"><div class="disp h3">Win Probability</div><div style="display:flex;align-items:baseline;gap:10px"><span class="disp" style="font-size:40px;line-height:1">${wp >= 50 ? wp : 100 - wp}%</span><span class="sub">${esc(wp >= 50 ? g.home.name.toUpperCase() : g.away.name.toUpperCase())}</span></div></div>` : ''}
      </div>
    </div>`;
}
