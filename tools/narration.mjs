// Script for the explainer video: on-screen caption (HTML) + spoken line (plain text) per cue.
// Keep spoken lines conversational; captions are the short version.
export const NARR = {
  title:    { cap: '', say: 'Welcome to C F B twenty-six. Your college football season, one screen at a time. In the next few minutes, I will show you how to set it up, how to sign in, and everything it can do.' },

  // Setup
  welcome:  { cap: `First visit: a quick intro, then <b>Take me in</b>.`, say: 'The first time you open it, you get a quick intro. Nothing to install and nothing to pay. Tap Take me in.' },
  setup:    { cap: `<b>My Setup</b> — search and star your teams.`, say: 'Everything starts in My Setup. Search for your team and tap the star. You can follow as many as you like.' },
  services: { cap: `Pick your <b>streaming services</b> once.`, say: 'Then tell it which streaming services you subscribe to. You only do this once. From here on, every game shows you the way you can actually watch it.' },
  theme:    { cap: `<b>Team colors</b> reskins the whole app.`, say: 'Switch on team colors, and the whole app takes on your team\'s look.' },

  // Login
  account:  { cap: `<b>Create an account</b> — email and password. No email confirmation.`, say: 'To keep your setup across devices, create an account. Just an email and a password. No confirmation email, no waiting.' },
  synced:   { cap: `<b>Synced</b> — sign in on your phone and your teams are already there.`, say: 'That is it. You are synced. Sign in on your phone or your laptop and your teams and services are already there. Accounts are optional; without one, everything still saves on this device.' },

  // Home story
  home:     { cap: `<b>Home</b> opens on your team's next game.`, say: 'Now the good part. Home opens on your team\'s next game, with the live score, kickoff time, network, and venue.' },
  prob:     { cap: `<b>Win probability</b> — betting line before kickoff, live from ESPN after.`, say: 'Scroll for win probability. Before kickoff it comes from the betting line. Once the game starts, it updates live from ESPN.' },
  matchup:  { cap: `The <b>matchup</b>: rankings, records, offense vs defense.`, say: 'The matchup: rankings, records, and offense versus defense.' },
  season:   { cap: `<b>Season stride</b> — every margin, every week, plus the rank trend.`, say: 'Season stride shows every margin of victory, week by week, and the trend in the polls.' },
  standing: { cap: `Where you sit in the <b>conference</b>.`, say: 'Where your team sits in the conference standings.' },
  others:   { cap: `Your <b>other teams</b> — tap a chip up top to switch.`, say: 'Your other teams are right below. Tap a chip at the top to switch the whole page to a different one.' },
  deeper:   { cap: `Want more? <b>Dive deeper</b> into the full dashboard.`, say: 'And when you want more, dive deeper into the full dashboard.' },

  // Features
  scores:   { cap: `<b>Scores</b> — every FBS game, live, with time, network and how to watch.`, say: 'Scores lists every F B S game, live, with the time, the network, and how to watch. Filter to your teams, the top twenty-five, or the power four.' },
  watch:    { cap: `Open an upcoming game: <b>How to Watch</b>, built around your services.`, say: 'Open an upcoming game and How to Watch takes over: a countdown, the broadcast network, your own services as big one-tap cards, and every other option below.' },
  boxscore: { cap: `Once it kicks off: <b>box score</b>, leaders, scoring plays.`, say: 'Once the game kicks off, the same page becomes the box score, with leaders and every scoring play.' },
  tv:       { cap: `<b>TV Guide</b> — the whole Saturday as a channel grid.`, say: 'The TV guide lays out the whole Saturday as a channel grid, like a cable guide.' },
  tv_phone: { cap: `<b>TV Guide</b> — the whole Saturday by network.`, say: 'The TV guide lays out the whole Saturday by network. Switch to the desktop layout in your setup for the full grid.' },
  rankings: { cap: `<b>Rankings</b> — AP, Coaches and the CFP committee, side by side.`, say: 'Rankings puts the A P poll, the coaches poll, and the playoff committee side by side.' },
  playoff:  { cap: `The <b>12-team playoff</b> bracket — projected until the committee's first ranking.`, say: 'The playoff page shows the twelve-team bracket. Until the committee releases its first ranking in November, it is projected from the polls.' },
  teams:    { cap: `<b>Teams</b> — every FBS program by conference.`, say: 'Teams lists every F B S program by conference.' },
  teampage: { cap: `Every team page: <b>schedule</b>, results, venues, TV, standings.`, say: 'Every team page has the full schedule, results, venues, TV networks, and the conference standings.' },

  // Support / close
  beer:     { cap: `Free to use. The <b>pint</b> up top buys me a beer. <b>Feedback</b> is one tap away.`, say: 'C F B twenty-six is free. If it is useful, the little pint in the top corner buys me a beer. And if you find a bug or have an idea, send feedback from the welcome screen or the footer.' },
  end:      { cap: '', say: 'Pick your teams. Know how to watch. C F B twenty-six.' },
};
