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

## Phone testing (no ESPN access needed)
`npm install` once, then `node tools/shots.mjs iphone` screenshots every screen on an emulated iPhone 15 using
synthetic ESPN-shaped data from `tools/fixtures.mjs` (ESPN blocks datacenter IPs, so real data can't be used in CI).
Output lands in `shots/iphone/`. `node tools/shots.mjs desktop` does the same at 1440px.

## Home (Story) — added Sep 2026
`#/home` is the default route: a scroll narrative about one favorite team (chips at the top switch teams).
Sections: next game → win probability → matchup → season so far → where they stand → other favorites → dive deeper.
- Win probability: ESPN's live number during a game; before kickoff the betting spread converted with Φ(margin/13.86);
  if there's no line yet, a points-margin model with home field. Labelled in the footer.
- AP rank trend accumulates in localStorage (`cfb26.rankhist.v1`) since ESPN has no history endpoint.
- Theme "Team" derives page colors from the focused team's ESPN colors (`applyTheme` in app.js).
- Motion: pinned hero (scroll-linked), IntersectionObserver reveals, count-ups; respects prefers-reduced-motion.
