import { esc } from '../ui.js';
import { state } from '../state.js';

// 12-team CFP with straight seeding (since 2025): the 5 highest-ranked conference champions get
// automatic bids, 7 at-large; all 12 are seeded strictly by ranking; seeds 1–4 get byes.
// Before the committee's first ranking we project from the AP poll and treat each conference's
// highest-ranked team as its champion.
export function projectPlayoff(rankings, directory) {
  if (!rankings || !directory) return null;
  const poll = rankings.cfp || rankings.ap;
  if (!poll) return null;
  const byId = new Map(directory.teams.map(t => [t.id, t]));
  const ranked = poll.ranks.map(r => {
    const d = byId.get(String(r.team.id));
    return { id: String(r.team.id), name: r.team.nickname || r.team.name, logo: r.team.logo, record: r.recordSummary || d?.overall || '', rank: r.current, trend: Number(r.trend) || 0, conf: d?.conf?.id, confAbbr: d?.conf?.abbr || '' };
  });
  // Also consider ranked "others receiving votes" so a G5 leader can show up when unranked.
  const others = (poll.others || []).map((o, i) => { const d = byId.get(String(o.team.id)); return { id: String(o.team.id), name: o.team.nickname || o.team.name, logo: o.team.logo || d?.logo, record: d?.overall || '', rank: 26 + i, trend: 0, conf: d?.conf?.id, confAbbr: d?.conf?.abbr || '', points: o.points }; });
  const pool = [...ranked, ...others];

  // Highest-ranked team per conference (independents can't be champions).
  const champs = [];
  const seenConf = new Set();
  pool.forEach(t => { if (t.conf && t.conf !== '18' && !seenConf.has(t.conf)) { seenConf.add(t.conf); champs.push(t); } });
  // Fill to five with the best-record leaders of conferences not represented at all.
  if (champs.length < 5) {
    const missing = directory.confs.filter(c => c.id !== '18' && !seenConf.has(c.id));
    const leaders = missing.map(c => directory.teams.filter(t => t.conf.id === c.id).sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))[0]).filter(Boolean)
      .map(t => ({ id: t.id, name: t.name, logo: t.logo, record: t.overall, rank: 99, trend: 0, conf: t.conf.id, confAbbr: t.conf.abbr }));
    leaders.sort((a, b) => b.record.localeCompare(a.record));
    champs.push(...leaders.slice(0, 5 - champs.length));
  }
  const autoBids = champs.slice(0, 5).map(t => ({ ...t, auto: true }));
  const autoIds = new Set(autoBids.map(t => t.id));
  const atLarge = pool.filter(t => !autoIds.has(t.id)).slice(0, 7).map(t => ({ ...t, auto: false }));
  const field = [...autoBids, ...atLarge].sort((a, b) => a.rank - b.rank).slice(0, 12);
  const fieldIds = new Set(field.map(t => t.id));
  const firstOut = pool.filter(t => !fieldIds.has(t.id)).slice(0, 4);
  return { official: !!rankings.cfp, source: poll.shortName || poll.name, asOf: poll.occurrence?.displayValue || '', field, firstOut };
}

export function renderPlayoff(ctx) {
  const p = ctx.playoff;
  if (!p) return '<div class="panel empty">Playoff picture unavailable right now.</div>';
  const f = p.field;
  const seed = (t, i) => t ? `<div class="seed-row"><span class="s">${i + 1}</span><img src="${esc(t.logo)}" alt="" loading="lazy"><a class="nm" href="#/team/${t.id}"${state.isMine(t.id) ? ' style="color:var(--amber)"' : ''}>${esc(t.name)}</a>${t.auto ? `<span class="badge" style="font-size:9px;padding:2px 5px">${esc(t.confAbbr)}</span>` : '<span class="sub">at-large</span>'}</div>` : '';
  const ph = label => `<div class="seed-row"><span class="s muted">—</span><div class="ph">?</div><span class="nm muted">${esc(label)}</span></div>`;
  const m = (head, a, b) => `<div class="panel matchup"><div class="mh"><span>${esc(head)}</span></div>${a}${b}</div>`;

  return `<div class="toolbar"><div class="disp h1">12-Team Playoff Picture</div>
      <span class="badge" style="color:var(--amber);border-color:var(--amber-dim)">${p.official ? 'CFP COMMITTEE · ' + esc(p.asOf) : 'PROJECTED · ' + esc(p.source) + ' · ' + esc(p.asOf)}</span></div>
    <div class="sub" style="margin:-8px 0 18px;line-height:1.6">5 highest-ranked conference champions + 7 at-large · straight seeding by rank · seeds 1–4 bye · first round on campus, quarterfinals and semifinals at the New Year's bowls.${p.official ? '' : ' Until the committee\'s first ranking in November, each conference\'s highest-ranked team is treated as its champion.'}</div>
    <div class="bracket">
      <div class="col"><div class="label">First Round · Dec 2026 · Campus sites</div>
        ${m('At No. 5', seed(f[11], 11), seed(f[4], 4))}
        ${m('At No. 6', seed(f[10], 10), seed(f[5], 5))}
        ${m('At No. 7', seed(f[9], 9), seed(f[6], 6))}
        ${m('At No. 8', seed(f[8], 8), seed(f[7], 7))}
      </div>
      <div class="col"><div class="label">Quarterfinals · New Year's bowls</div>
        ${m('Quarterfinal', seed(f[3], 3), ph('Winner 5 / 12'))}
        ${m('Quarterfinal', seed(f[2], 2), ph('Winner 6 / 11'))}
        ${m('Quarterfinal', seed(f[1], 1), ph('Winner 7 / 10'))}
        ${m('Quarterfinal', seed(f[0], 0), ph('Winner 8 / 9'))}
      </div>
      <div class="col"><div class="label">Semifinals · Jan 2027</div>
        ${m('Semifinal', ph('QF 1 winner'), ph('QF 2 winner'))}
        ${m('Semifinal', ph('QF 3 winner'), ph('QF 4 winner'))}
      </div>
      <div class="col"><div class="label">National Championship · Jan 2027</div>
        <div class="panel matchup champ"><div class="mh"><span>CFP National Championship</span></div>${ph('Semifinal winner')}${ph('Semifinal winner')}</div>
        <div class="panel matchup"><div class="mh"><span>Bubble · first four out</span></div>${p.firstOut.map(t => `<div class="seed-row"><span class="s muted">${t.rank <= 25 ? t.rank : 'RV'}</span><img src="${esc(t.logo)}" alt=""><a class="nm" href="#/team/${t.id}">${esc(t.name)}</a><span class="sub">${esc(t.record)}</span></div>`).join('')}</div>
      </div>
    </div>`;
}
