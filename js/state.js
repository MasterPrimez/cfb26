// Layer 1 personalization: saved per device (localStorage) and shareable via the URL (?teams=194,2483&tz=pt).
// Layer 2 (sign in to sync) plugs in here later — same shape, different store.

const KEY = 'cfb26.prefs.v1';

const defaults = () => ({
  teams: [],          // ESPN team ids, as strings
  services: [],       // service ids from networks.js
  tz: 'local',        // 'local' | 'pt' | 'et'
  filter: 'all',      // 'all' | 'mine' | 'top25' | 'p4' | conference id
});

let prefs = load();

function load() {
  let p = defaults();
  try { const raw = localStorage.getItem(KEY); if (raw) p = { ...p, ...JSON.parse(raw) }; } catch {}
  // URL overrides (a shared link) win and are then saved.
  const q = new URLSearchParams(location.search);
  if (q.has('teams')) p.teams = q.get('teams').split(',').map(s => s.trim()).filter(Boolean);
  if (q.has('tz')) p.tz = q.get('tz');
  if (q.has('services')) p.services = q.get('services').split(',').filter(Boolean);
  if (q.has('teams') || q.has('tz') || q.has('services')) {
    save(p);
    history.replaceState(null, '', location.pathname + location.hash);
  }
  return p;
}

function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { save(prefs); listeners.forEach(fn => fn(prefs)); }

export const state = {
  get prefs() { return prefs; },
  get myTeams() { return new Set(prefs.teams); },
  get myServices() { return new Set(prefs.services); },
  isMine(teamId) { return prefs.teams.includes(String(teamId)); },
  toggleTeam(id) {
    id = String(id);
    prefs.teams = prefs.teams.includes(id) ? prefs.teams.filter(t => t !== id) : [...prefs.teams, id];
    emit();
  },
  toggleService(id) {
    prefs.services = prefs.services.includes(id) ? prefs.services.filter(s => s !== id) : [...prefs.services, id];
    emit();
  },
  setTz(tz) { prefs.tz = tz; emit(); },
  setFilter(f) { prefs.filter = f; emit(); },
  shareUrl() {
    const q = new URLSearchParams();
    if (prefs.teams.length) q.set('teams', prefs.teams.join(','));
    if (prefs.tz !== 'local') q.set('tz', prefs.tz);
    const base = location.origin + location.pathname;
    return q.toString() ? `${base}?${q}` : base;
  },
};

// ---- Time formatting -------------------------------------------------------

const TZ = { pt: 'America/Los_Angeles', et: 'America/New_York' };
export function tzName() { return prefs.tz === 'local' ? undefined : TZ[prefs.tz]; }
export function tzLabel() {
  if (prefs.tz === 'pt') return 'PT';
  if (prefs.tz === 'et') return 'ET';
  try { return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || ''; } catch { return ''; }
}
export function fmtTime(d) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tzName() }).format(d).replace(' ', ' ');
}
export function fmtDay(d) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: tzName() }).format(d);
}
export function fmtShortDate(d) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: tzName() }).format(d);
}
export function dayKey(d) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tzName() }).format(d);
}
// Hour-of-day (decimal) in the display timezone, for the TV grid.
export function hourOf(d) {
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tzName() }).formatToParts(d);
  const h = Number(parts.find(p => p.type === 'hour').value) % 24;
  const m = Number(parts.find(p => p.type === 'minute').value);
  return h + m / 60;
}
