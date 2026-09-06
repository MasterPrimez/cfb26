// ESPN public college football API (unofficial, no key). All calls are browser-side.
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';
const V2 = 'https://site.api.espn.com/apis/v2/sports/football/college-football';

const cache = new Map();

async function getJSON(url, ttlMs) {
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.t < ttlMs) return hit.v;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`ESPN ${r.status} for ${url}`);
  const v = await r.json();
  cache.set(url, { t: now, v });
  return v;
}

export const api = {
  // Whole FBS slate for a week. groups=80 = FBS. Omit week to get the current one.
  scoreboard(week, opts = {}) {
    const q = new URLSearchParams({ groups: '80', limit: '400' });
    if (week) q.set('week', String(week));
    if (opts.seasontype) q.set('seasontype', String(opts.seasontype));
    return getJSON(`${SITE}/scoreboard?${q}`, opts.ttl ?? 30_000);
  },
  rankings() { return getJSON(`${SITE}/rankings`, 5 * 60_000); },
  // Standings doubles as the FBS team directory (138 teams grouped by conference, with logos).
  standings(season) { return getJSON(`${V2}/standings?season=${season}`, 10 * 60_000); },
  team(id) { return getJSON(`${SITE}/teams/${id}`, 5 * 60_000); },
  schedule(id) { return getJSON(`${SITE}/teams/${id}/schedule`, 2 * 60_000); },
  summary(eventId) { return getJSON(`${SITE}/summary?event=${eventId}`, 30_000); },
};

// ---- Normalizers -----------------------------------------------------------

export function normalizeEvent(e) {
  const c = e.competitions[0];
  const st = e.status?.type || c.status?.type || {};
  const comps = c.competitors.map(x => ({
    id: x.team.id,
    homeAway: x.homeAway,
    abbr: x.team.abbreviation,
    name: x.team.shortDisplayName || x.team.location || x.team.displayName,
    fullName: x.team.displayName,
    logo: darkLogo(x.team.logo) || pickLogo(x.team),
    color: '#' + (x.team.color || '333333'),
    rank: x.curatedRank && x.curatedRank.current && x.curatedRank.current <= 25 ? x.curatedRank.current : null,
    score: x.score != null ? Number(x.score) : null,
    winner: !!x.winner,
    record: (x.records || []).find(r => r.type === 'total')?.summary || '',
    confRecord: (x.records || []).find(r => r.type === 'vsconf')?.summary || '',
    conferenceId: x.team.conferenceId,
    linescores: (x.linescores || []).map(l => l.value),
  }));
  const home = comps.find(x => x.homeAway === 'home') || comps[0];
  const away = comps.find(x => x.homeAway === 'away') || comps[1];
  const networks = [];
  (c.broadcasts || []).forEach(b => (b.names || []).forEach(n => networks.push(n)));
  (c.geoBroadcasts || []).forEach(g => { const n = g.media?.shortName; if (n && !networks.includes(n)) networks.push(n); });
  const odds = c.odds && c.odds[0];
  return {
    id: e.id,
    name: e.name,
    shortName: e.shortName,
    date: new Date(e.date),
    week: e.week?.number,
    state: st.state, // pre | in | post
    completed: !!st.completed,
    detail: st.shortDetail || st.detail || '',
    period: e.status?.period,
    clock: e.status?.displayClock,
    home, away,
    venue: c.venue ? { name: c.venue.fullName?.replace(/\s*\(.*\)$/, ''), city: c.venue.address?.city, state: c.venue.address?.state, indoor: c.venue.indoor } : null,
    neutral: !!c.neutralSite,
    networks,
    odds: odds ? { details: odds.details, overUnder: odds.overUnder, spread: odds.spread } : null,
    situation: c.situation ? { possession: c.situation.possession, text: c.situation.downDistanceText, lastPlay: c.situation.lastPlay?.text, homeWin: c.situation.lastPlay?.probability?.homeWinPercentage } : null,
    headline: c.headlines && c.headlines[0]?.shortLinkText,
    tbd: /TBD|TBA/i.test(st.detail || '') || e.timeValid === false,
  };
}

export function logoUrl(teamId, dark = true) {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500${dark ? '-dark' : ''}/${teamId}.png`;
}
// ESPN's default logos are drawn for white backgrounds (dark lettering); the -dark set is for dark UIs.
export const darkLogo = u => (u || '').replace('/teamlogos/ncaa/500/', '/teamlogos/ncaa/500-dark/');
// Prefer the 'dark' entry of a team's logos[] when present.
export function pickLogo(team) {
  const l = team?.logos || [];
  const d = l.find(x => (x.rel || []).includes('dark'))?.href;
  return d || darkLogo(l[0]?.href || team?.logo || '') || logoUrl(team?.id);
}

// Team directory from standings: [{id, name, abbr, logo, conf: {id, name, abbr}}]
export function normalizeDirectory(standings) {
  const teams = [];
  const confs = [];
  const walk = (node, conf) => {
    if (node.standings && node.standings.entries) {
      node.standings.entries.forEach(en => {
        const t = en.team;
        const stat = n => en.stats.find(s => s.name === n || s.type === n);
        teams.push({
          id: t.id, name: t.shortDisplayName || t.location, fullName: t.displayName, abbr: t.abbreviation,
          logo: pickLogo(t),
          conf,
          overall: stat('overall')?.displayValue || stat('total')?.displayValue || '',
          confRec: en.stats.find(s => s.type === 'vsconf')?.displayValue || '',
          wins: Number(stat('wins')?.value ?? 0),
          streak: stat('streak')?.displayValue || '',
          pointsFor: Number(stat('pointsFor')?.value ?? 0),
          pointsAgainst: Number(stat('pointsAgainst')?.value ?? 0),
        });
      });
    }
    (node.children || []).forEach(ch => walk(ch, conf));
  };
  (standings.children || []).forEach(ch => {
    const conf = { id: ch.id, name: ch.name, abbr: prettyConf(ch) };
    confs.push(conf);
    walk(ch, conf);
  });
  return { teams, confs };
}

function prettyConf(ch) {
  const m = { acc: 'ACC', big12: 'Big 12', big10: 'Big Ten', sec: 'SEC', usa: 'C-USA', ind: 'Independent', midam: 'MAC', mwest: 'MWC', pac12: 'Pac-12', belt: 'Sun Belt', American: 'American' };
  return m[ch.abbreviation] || ch.abbreviation || ch.name;
}

export const POWER4 = new Set(['1', '4', '5', '8']); // ACC, Big 12, Big Ten, SEC
