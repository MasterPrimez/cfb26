// Synthetic ESPN-shaped responses for local testing (the real API blocks datacenter IPs).
// Shapes mirror what site.api.espn.com returns for college football, trimmed to the fields the app reads.

const TEAMS = [
  ['194', 'Ohio State', 'OSU', 'bb0000', '5'], ['2483', 'Oregon', 'ORE', '154733', '5'], ['61', 'Georgia', 'UGA', 'ba0c2f', '8'],
  ['87', 'Notre Dame', 'ND', '0c2340', '18'], ['251', 'Texas', 'TEX', 'bf5700', '8'], ['84', 'Indiana', 'IU', '970310', '5'],
  ['2390', 'Miami', 'MIA', 'f47321', '1'], ['245', 'Texas A&M', 'TAMU', '500000', '8'], ['145', 'Ole Miss', 'MISS', '13294b', '8'],
  ['201', 'Oklahoma', 'OU', '841617', '8'], ['99', 'LSU', 'LSU', '461d7c', '8'], ['2641', 'Texas Tech', 'TTU', 'cc0000', '4'],
  ['333', 'Alabama', 'ALA', '9e1b32', '8'], ['252', 'BYU', 'BYU', '0d1b3e', '4'], ['130', 'Michigan', 'MICH', '00274c', '5'],
  ['264', 'Washington', 'WASH', '4b2e83', '5'], ['213', 'Penn State', 'PSU', '041e42', '5'], ['2567', 'SMU', 'SMU', 'c8102e', '1'],
  ['2633', 'Tennessee', 'TENN', 'ff8200', '8'], ['30', 'USC', 'USC', '990000', '5'], ['254', 'Utah', 'UTAH', 'cc0000', '4'],
  ['2294', 'Iowa', 'IOWA', 'ffcd00', '5'], ['248', 'Houston', 'HOU', 'c8102e', '4'], ['97', 'Louisville', 'LOU', 'ad0000', '1'],
  ['142', 'Missouri', 'MIZ', '000000', '8'], ['68', 'Boise State', 'BSU', '0033a0', '9'], ['228', 'Clemson', 'CLEM', 'f56600', '1'],
  ['26', 'UCLA', 'UCLA', '2d68c4', '5'], ['9', 'Arizona State', 'ASU', '8c1d40', '4'], ['2306', 'Kansas State', 'KSU', '512888', '4'],
  ['2050', 'Ball State', 'BALL', 'ba0c2f', '15'], ['2582', 'Texas State', 'TXST', '501214', '37'], ['2653', 'Tulsa', 'TLSA', '002d72', '151'],
  ['2229', 'Florida Atlantic', 'FAU', '003366', '151'], ['2226', 'Kent State', 'KENT', '002664', '15'], ['2348', 'Coastal Carolina', 'CCU', '006f71', '37'],
];
const CONF = { '1': ['acc', 'Atlantic Coast Conference'], '4': ['big12', 'Big 12 Conference'], '5': ['big10', 'Big Ten Conference'], '8': ['sec', 'Southeastern Conference'], '9': ['pac12', 'Pac-12 Conference'], '15': ['midam', 'Mid-American Conference'], '18': ['ind', 'FBS Independents'], '37': ['belt', 'Sun Belt Conference'], '151': ['American', 'American Conference'] };
const NETS = ['ABC', 'CBS', 'FOX', 'NBC', 'ESPN', 'ESPN2', 'ESPNU', 'FS1', 'CW', 'TNT', 'USA Net', 'SEC Network', 'ACC Network', 'BTN', 'CBSSN', 'ESPN+', 'SECN+', 'Peacock'];
const VENUES = [['Ohio Stadium', 'Columbus', 'OH'], ['Autzen Stadium', 'Eugene', 'OR'], ['Sanford Stadium', 'Athens', 'GA'], ['Rose Bowl', 'Pasadena', 'CA'], ['Los Angeles Memorial Coliseum', 'Los Angeles', 'CA'], ['Kyle Field', 'College Station', 'TX'], ['Tiger Stadium', 'Baton Rouge', 'LA']];

const team = (t, i) => ({ id: t[0], uid: 's:20~l:23~t:' + t[0], location: t[1], name: 'Mascots', abbreviation: t[2], displayName: t[1] + ' Mascots', shortDisplayName: t[1], color: t[3], alternateColor: 'ffffff', logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t[0]}.png`, logos: [{ href: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t[0]}.png` }], conferenceId: t[4] });

export function scoreboard({ now = new Date(), week = 1 } = {}) {
  const sat = new Date(now); sat.setHours(9, 0, 0, 0);
  const events = [];
  for (let i = 0; i < TEAMS.length - 1; i += 2) {
    const home = team(TEAMS[i]), away = team(TEAMS[i + 1]);
    const k = i / 2;
    const dayOff = k % 6 === 5 ? -1 : 0; // a few Friday games
    const start = new Date(sat.getTime() + dayOff * 86400e3 + (k % 5) * 2.5 * 3600e3);
    const state = k % 3 === 0 ? 'in' : k % 3 === 1 ? 'pre' : 'post';
    const hs = state === 'pre' ? null : 7 * ((k % 4) + 1), as = state === 'pre' ? null : 3 * (k % 5) + 7;
    const st = state === 'in' ? { state: 'in', completed: false, description: 'In Progress', detail: '8:42 - 3rd Quarter', shortDetail: '8:42 - 3rd', name: 'STATUS_IN_PROGRESS' } : state === 'post' ? { state: 'post', completed: true, description: 'Final', detail: 'Final', shortDetail: 'Final', name: 'STATUS_FINAL' } : { state: 'pre', completed: false, description: 'Scheduled', detail: 'Sat, September 5th at 4:30 PM EDT', shortDetail: '9/5 - 4:30 PM EDT', name: 'STATUS_SCHEDULED' };
    const v = VENUES[k % VENUES.length];
    const net = NETS[k % NETS.length];
    const comp = (t, ha, score, rank) => ({ id: t.id, homeAway: ha, winner: state === 'post' && (ha === 'home' ? hs > as : as > hs), score: score == null ? '0' : String(score), team: t, curatedRank: { current: rank }, records: [{ type: 'total', summary: k % 2 ? '1-0' : '0-1' }, { type: 'vsconf', summary: '0-0' }], linescores: state === 'pre' ? [] : [{ value: 7 }, { value: 3 }, { value: 7 }, { value: 0 }] });
    events.push({
      id: '4018' + String(100 + k), uid: 'x', date: start.toISOString(), name: `${away.displayName} at ${home.displayName}`, shortName: `${away.abbreviation} @ ${home.abbreviation}`, week: { number: week },
      status: { period: state === 'in' ? 3 : 4, displayClock: '8:42', type: st },
      competitions: [{ id: 'c', neutralSite: k === 3, venue: { fullName: `${v[0]} (${v[1]}, ${v[2]})`, address: { city: v[1], state: v[2] }, indoor: false },
        broadcasts: [{ market: 'national', names: [net] }], geoBroadcasts: [{ media: { shortName: net }, type: { shortName: 'TV' } }],
        odds: [{ provider: { name: 'Draft Kings' }, details: `${home.abbreviation} -${3 + (k % 7)}.5`, overUnder: 48.5 + k, spread: -(3 + (k % 7)) }],
        competitors: [comp(home, 'home', hs, k < 12 ? k + 1 : 99), comp(away, 'away', as, k < 6 ? k + 13 : 99)],
        situation: state === 'in' ? { possession: home.id, downDistanceText: '2nd & 7 at ' + away.abbreviation + ' 28', lastPlay: { text: 'Rush middle for 3 yards', probability: { homeWinPercentage: 0.71 } } } : undefined,
        status: { type: st }, headlines: state === 'post' ? [{ shortLinkText: `${home.location} rolls past ${away.location}` }] : [],
      }],
    });
  }
  const entries = Array.from({ length: 15 }, (_, i) => ({ label: `Week ${i + 1}`, alternateLabel: `Week ${i + 1}`, detail: 'Sep', value: String(i + 1), startDate: new Date(sat.getTime() + (i - week + 1) * 7 * 86400e3 - 6 * 86400e3).toISOString(), endDate: new Date(sat.getTime() + (i - week + 1) * 7 * 86400e3 + 86400e3).toISOString() }));
  return { leagues: [{ calendar: [{ value: '2', label: 'Regular Season', entries }, { value: '3', label: 'Postseason', entries: [{ label: 'Bowls', value: '1', startDate: '2026-12-13T08:00Z', endDate: '2027-01-20T08:00Z' }] }] }], season: { year: 2026, type: 2 }, week: { number: week }, events };
}

export function rankings() {
  const ranks = TEAMS.slice(0, 25).map((t, i) => ({ current: i + 1, previous: i === 4 ? 7 : i + 1, trend: i === 4 ? '+2' : '-', points: 1600 - i * 55, firstPlaceVotes: i === 0 ? 40 : 0, recordSummary: '1-0', team: { id: t[0], nickname: t[1], name: 'Mascots', abbreviation: t[2], logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t[0]}.png` } }));
  const others = TEAMS.slice(25, 30).map((t, i) => ({ points: 80 - i * 10, team: { id: t[0], nickname: t[1], name: 'Mascots', logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t[0]}.png` } }));
  const base = { occurrence: { displayValue: 'Week 2', number: 2, type: 'week', value: '2' }, date: '2026-09-01T00:00Z', ranks, others };
  return { rankings: [{ id: '1', name: 'AP Top 25', shortName: 'AP Poll', type: 'ap', ...base }, { id: '2', name: 'AFCA Coaches Poll', shortName: 'AFCA Coaches Poll', type: 'usa', ...base }] };
}

export function standings() {
  const children = Object.entries(CONF).map(([id, [abbr, name]]) => ({ id, name, abbreviation: abbr, standings: { entries: TEAMS.filter(t => t[4] === id).map(t => ({ team: { id: t[0], location: t[1], name: 'Mascots', abbreviation: t[2], displayName: t[1] + ' Mascots', shortDisplayName: t[1], logos: [{ href: `https://a.espncdn.com/i/teamlogos/ncaa/500/${t[0]}.png` }] }, stats: [{ name: 'wins', type: 'wins', value: 1, displayValue: '1' }, { name: 'overall', type: 'total', displayValue: '1-0' }, { name: 'overall', type: 'vsconf', displayValue: '0-0' }, { name: 'streak', type: 'streak', displayValue: 'W1' }, { name: 'pointsFor', type: 'pointsfor', value: 42 }, { name: 'pointsAgainst', type: 'pointsagainst', value: 10 }] })) } }));
  return { children };
}

export function teamDetail(id) {
  const t = TEAMS.find(x => x[0] === id) || TEAMS[0];
  return { team: { ...team(t), record: { items: [{ type: 'total', summary: '4-1', stats: [{ name: 'gamesPlayed', value: 5 }, { name: 'wins', value: 4 }, { name: 'losses', value: 1 }, { name: 'pointsFor', value: 190 }, { name: 'pointsAgainst', value: 88 }, { name: 'pointDifferential', value: 102 }] }] }, standingSummary: '1st in Big Ten', groups: { id: t[4] } } };
}

export function schedule(id) {
  const sb = scoreboard();
  const events = sb.events.filter(e => e.competitions[0].competitors.some(c => c.id === id) && e.status.type.state !== 'post').map(e => ({ ...e, competitions: [{ ...e.competitions[0], competitors: e.competitions[0].competitors.map(c => ({ ...c, score: { value: Number(c.score), displayValue: c.score }, team: { ...c.team, logos: c.team.logos } })), broadcasts: [{ media: { shortName: e.competitions[0].broadcasts[0].names[0] } }] }] }));
  // past games with scores
  const me = team(TEAMS.find(x => x[0] === id) || TEAMS[0]);
  [[53, 'BALL'], [7, 'TEX'], [31, 'OHIO'], [-6, 'PSU'], [24, 'MINN']].forEach(([m, ab], i) => { const opp = team(TEAMS.find(x => x[2] === ab) || TEAMS[(i * 5) % TEAMS.length]); const d = new Date(); d.setDate(d.getDate() - (5 - i) * 7);
    events.unshift({ id: 'p' + i, date: d.toISOString(), week: { number: i + 1 }, competitions: [{ status: { type: { state: 'post', shortDetail: 'Final', completed: true } }, competitors: [{ id, homeAway: i % 2 ? 'away' : 'home', winner: m > 0, score: { value: 30 + Math.max(0, m), displayValue: String(30 + Math.max(0, m)) }, team: me }, { id: opp.id, homeAway: i % 2 ? 'home' : 'away', winner: m < 0, score: { value: 30 + Math.max(0, -m), displayValue: String(30 + Math.max(0, -m)) }, team: opp, curatedRank: { current: 99 } }], venue: { fullName: 'Some Stadium', address: { city: 'Town', state: 'ST' } }, broadcasts: [{ media: { shortName: 'FOX' } }] }] }); });
  // pad with future games
  for (let i = 2; i <= 12; i++) { const opp = team(TEAMS[(i * 3) % TEAMS.length]); const d = new Date(); d.setDate(d.getDate() + i * 7); events.push({ id: 'f' + i, date: d.toISOString(), week: { number: i }, timeValid: i % 2 === 0, competitions: [{ status: { type: { state: 'pre', shortDetail: i % 2 ? 'TBD' : '9/26 - 4:30 PM EDT' } }, competitors: [{ id, homeAway: i % 2 ? 'home' : 'away', team: team(TEAMS.find(x => x[0] === id) || TEAMS[0]) }, { id: opp.id, homeAway: i % 2 ? 'away' : 'home', team: opp, curatedRank: { current: i < 5 ? i + 8 : 99 } }], venue: { fullName: 'Some Stadium', address: { city: 'Town', state: 'ST' } }, broadcasts: i % 2 ? [] : [{ media: { shortName: 'FOX' } }] }] }); }
  return { team: team(TEAMS.find(x => x[0] === id) || TEAMS[0]), season: { year: 2026 }, events };
}

export function summary(eventId) {
  const sb = scoreboard();
  const e = sb.events.find(x => x.id === eventId) || sb.events[0];
  const c = e.competitions[0];
  const [h, a] = c.competitors;
  const stat = (n, v) => ({ name: n, displayValue: v });
  return {
    header: { week: 1, competitions: [{ date: e.date, status: e.status, competitors: c.competitors, broadcasts: c.broadcasts }] },
    gameInfo: { venue: { fullName: c.venue.fullName.replace(/\s*\(.*\)$/, ''), address: c.venue.address, capacity: 102780 }, weather: { displayValue: 'Clear', temperature: 74 } },
    boxscore: { teams: [{ team: a.team, statistics: [stat('totalYards', '248'), stat('netPassingYards', '176'), stat('rushingYards', '72'), stat('thirdDownEff', '4-9'), stat('turnovers', '2'), stat('possessionTime', '13:48')] }, { team: h.team, statistics: [stat('totalYards', '312'), stat('netPassingYards', '201'), stat('rushingYards', '111'), stat('thirdDownEff', '6-10'), stat('turnovers', '0'), stat('possessionTime', '17:30')] }] },
    leaders: [{ team: h.team, leaders: [{ name: 'passingYards', displayName: 'Passing Yards', leaders: [{ displayValue: '17/24, 201 YDS, 2 TD', athlete: { shortName: 'J. Sayin' } }] }, { name: 'rushingYards', displayName: 'Rushing Yards', leaders: [{ displayValue: '15 CAR, 94 YDS, 1 TD', athlete: { shortName: 'B. Back' } }] }, { name: 'receivingYards', displayName: 'Receiving Yards', leaders: [{ displayValue: '7 REC, 112 YDS, 1 TD', athlete: { shortName: 'J. Smith' } }] }] }, { team: a.team, leaders: [{ name: 'passingYards', displayName: 'Passing Yards', leaders: [{ displayValue: '14/22, 176 YDS, 1 TD', athlete: { shortName: 'A. Manning' } }] }] }],
    scoringPlays: [{ period: { number: 1 }, clock: { displayValue: '10:08' }, team: h.team, text: 'N. Frazier run for 14 yds, for a TD (P. Woodring KICK)', awayScore: 0, homeScore: 7 }, { period: { number: 2 }, clock: { displayValue: '2:08' }, team: a.team, text: 'P. Hurless 37 yd FG GOOD', awayScore: 3, homeScore: 14 }],
    winprobability: [{ homeWinPercentage: 0.71 }],
  };
}
