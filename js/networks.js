// Network → how to watch. ESPN's feed only names the TV network; this map adds the streaming options.
// Each service: {id, name, url, tag}. tag: 'incl' = included with a subscription, 'free' = no login.

export const SERVICES = {
  espn:      { id: 'espn',      name: 'ESPN app',        url: 'https://www.espn.com/watch/' },
  peacock:   { id: 'peacock',   name: 'Peacock',         url: 'https://www.peacocktv.com/sports' },
  paramount: { id: 'paramount', name: 'Paramount+',      url: 'https://www.paramountplus.com/live-tv/' },
  foxone:    { id: 'foxone',    name: 'FOX One',         url: 'https://www.foxone.com/' },
  cw:        { id: 'cw',        name: 'CW app',          url: 'https://www.cwtv.com/live/' },
  max:       { id: 'max',       name: 'HBO Max',         url: 'https://play.max.com/' },
  b1g:       { id: 'b1g',       name: 'B1G+',            url: 'https://www.bigtenplus.com/' },
  yttv:      { id: 'yttv',      name: 'YouTube TV',      url: 'https://tv.youtube.com/' },
  hulu:      { id: 'hulu',      name: 'Hulu + Live TV',  url: 'https://www.hulu.com/live-tv' },
  fubo:      { id: 'fubo',      name: 'Fubo',            url: 'https://www.fubo.tv/' },
  sling:     { id: 'sling',     name: 'Sling',           url: 'https://www.sling.com/' },
  directv:   { id: 'directv',   name: 'DIRECTV Stream',  url: 'https://stream.directv.com/' },
};

// Live-TV bundles that carry a given network (approximate; bundles change).
const BUNDLES_ALL = ['yttv', 'hulu', 'fubo', 'directv'];
const BUNDLES_ESPN = ['yttv', 'hulu', 'fubo', 'sling', 'directv'];
const BUNDLES_FOX = ['yttv', 'hulu', 'fubo', 'sling', 'directv'];

// Primary streamer first, then bundles.
const MAP = [
  { re: /^(ABC)$/i,                                   primary: ['espn'],    bundles: BUNDLES_ESPN, note: 'ABC games stream in the ESPN app' },
  { re: /^(ESPN\+|ESPN Plus)$/i,                      primary: ['espn'],    bundles: [],           note: 'ESPN+ / streaming only' },
  { re: /^(ESPN|ESPN2|ESPNU|ESPNews|ESPN News|ACCN|ACC Network|ACCNX|SEC Network|SECN|SECN\+|SEC Network\+|Longhorn Network|LHN)$/i, primary: ['espn'], bundles: BUNDLES_ESPN },
  { re: /^(CBS)$/i,                                   primary: ['paramount'], bundles: BUNDLES_ALL },
  { re: /^(CBSSN|CBS Sports Network)$/i,              primary: [],          bundles: BUNDLES_ALL,  note: 'Not on Paramount+' },
  { re: /^(FOX)$/i,                                   primary: ['foxone'],  bundles: BUNDLES_FOX },
  { re: /^(FS1|FS2|FOX Sports 1|FOX Sports 2)$/i,     primary: ['foxone'],  bundles: BUNDLES_FOX },
  { re: /^(BTN|Big Ten Network)$/i,                   primary: ['foxone'],  bundles: BUNDLES_FOX },
  { re: /^(B1G\+|BTN\+|Big Ten Plus)$/i,              primary: ['b1g'],     bundles: [],           note: 'Streaming only' },
  { re: /^(NBC)$/i,                                   primary: ['peacock'], bundles: BUNDLES_ALL },
  { re: /^(USA|USA Net|USA Network)$/i,               primary: ['peacock'], bundles: BUNDLES_ALL },
  { re: /^(Peacock)$/i,                               primary: ['peacock'], bundles: [],           note: 'Streaming only' },
  { re: /^(The CW|CW|CW Sports)$/i,                   primary: ['cw'],      bundles: BUNDLES_ALL,  note: 'Free on the CW app' },
  { re: /^(TNT|TBS|truTV)$/i,                         primary: ['max'],     bundles: ['yttv', 'hulu', 'sling', 'directv'] },
  { re: /^(NFL Network|NFLN)$/i,                      primary: [],          bundles: BUNDLES_ALL },
];

export function watchOptions(networks) {
  const out = [];
  const seen = new Set();
  (networks || []).forEach(n => {
    const m = MAP.find(x => x.re.test(n.trim()));
    if (!m) return;
    m.primary.forEach(id => { if (!seen.has(id)) { seen.add(id); out.push({ ...SERVICES[id], kind: 'primary', via: n }); } });
    m.bundles.forEach(id => { if (!seen.has(id)) { seen.add(id); out.push({ ...SERVICES[id], kind: 'bundle', via: n }); } });
  });
  return out;
}

// Short "Watch: …" string for cards. Prefers the user's own services.
export function watchSummary(networks, myServices) {
  const opts = watchOptions(networks);
  if (!opts.length) {
    if (!networks || !networks.length) return 'TBA';
    // Streaming-only feeds we don't map (MW+, UConn+, school networks) — name them.
    return /\+$/.test(networks[0]) ? `Streams on ${networks[0]}` : 'Check local listings';
  }
  const mine = opts.filter(o => myServices.has(o.id));
  const pick = (mine.length ? mine : opts.filter(o => o.kind === 'primary')).slice(0, 2);
  const list = (pick.length ? pick : opts.slice(0, 2)).map(o => o.name).join(' · ');
  return list;
}

const DISPLAY = [[/^USA Net(work)?$/i, 'USA'], [/^SEC Network$/i, 'SECN'], [/^ACC Network$/i, 'ACCN'], [/^ESPNEWS$/i, 'ESPNews'], [/^Big Ten Network$/i, 'BTN'], [/^CBS Sports Network$/i, 'CBSSN'], [/^The CW$/i, 'CW'], [/^FOX Sports 1$/i, 'FS1'], [/^FOX Sports 2$/i, 'FS2']];
export function displayNetwork(n) { const m = DISPLAY.find(([re]) => re.test(n)); return m ? m[1] : n; }
export function primaryNetwork(networks) {
  if (!networks || !networks.length) return '';
  return displayNetwork(networks[0]);
}

// Ordering + styling for the TV grid rows.
export const NETWORK_ORDER = ['ABC', 'CBS', 'FOX', 'NBC', 'ESPN', 'ESPN2', 'ESPNU', 'FS1', 'FS2', 'The CW', 'CW', 'TNT', 'TBS', 'truTV', 'USA', 'ACCN', 'SECN', 'SEC Network', 'BTN', 'CBSSN', 'ESPN+', 'Peacock', 'B1G+', 'SECN+', 'ACCNX', 'ESPNews'];
export function networkClass(n) {
  if (/^(ESPN|ESPN2|ESPNU|ESPN\+|ESPNews|ACCN|SECN|SEC Network|ACCNX|SECN\+)$/i.test(n)) return 'espn';
  if (/^(ABC|CBS|FOX|NBC|FS1|TNT|The CW|CW|USA)$/i.test(n)) return '';
  return 'minor';
}
