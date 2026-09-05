# CFB/26 — College Football 2026 Dashboard

Live scores, kickoff times, venues, TV networks, how-to-watch, rankings, the playoff picture and a
channel-guide TV grid for the 2026 FBS season. Static site, no build step, no backend.

## Run locally
Any static server works, e.g. `npx serve .` or `python3 -m http.server 8080`, then open http://localhost:8080

## Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. In Vercel: Add New → Project → import the repo → Framework "Other" → Deploy. No settings needed.
3. Every push to `main` redeploys automatically.

## How it works
- `js/api.js` — calls ESPN's public scoreboard/rankings/standings/team/summary endpoints from the browser.
- `js/networks.js` — maps a TV network to streaming options (ESPN app, Peacock, Paramount+, FOX One, bundles).
- `js/state.js` — per-device preferences (my teams, services, time zone) in localStorage; `?teams=194,2483` in a
  shared link pre-loads them.
- `js/views/*` — Scores, TV Guide, Rankings, Playoff, Teams, Team page, Game page.
- Auto-refresh: 60s while games are live or about to kick off, otherwise 5 min.

## Data notes
- ESPN's API is unofficial and unauthenticated. If it ever blocks browser calls, put a small proxy
  (Cloudflare Worker / Vercel function) in front and change `SITE`/`V2` in `js/api.js`.
- Team ids are ESPN's (Ohio State = 194, Oregon = 2483, Texas = 251, Alabama = 333).
