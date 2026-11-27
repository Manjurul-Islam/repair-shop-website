'use strict';
/* =============================================================================
   SHOP CONTRACT — the single source of truth shared by
     • the owner portal  (index.html → Settings, Jobs, Reviews)
     • the customer website (site/ → prices, warranty, branches, hours, ratings)
   Both load this file right after js/domain.js. The website never hardcodes
   anything the owner can change: it reads DB.settings.services / .web /
   .branchInfo and DB.feedback, which the owner edits in the portal.
   ============================================================================= */

/* ---------- device knowledge (model → price tier 1–4) ---------- */
const MODELS = [
  { id: 'ip15', brand: 'Apple', model: 'iPhone 15', tier: 4, re: /i ?phone ?15|\bip ?15\b/ },
  { id: 'ip14', brand: 'Apple', model: 'iPhone 14', tier: 4, re: /i ?phone ?14|\bip ?14\b/ },
  { id: 'ip13', brand: 'Apple', model: 'iPhone 13', tier: 3, re: /i ?phone ?13|\bip ?13\b/ },
  { id: 'ip12', brand: 'Apple', model: 'iPhone 12', tier: 3, re: /i ?phone ?12|\bip ?12\b/ },
  { id: 'ip11', brand: 'Apple', model: 'iPhone 11', tier: 2, re: /i ?phone ?11|\bip ?11\b/ },
  { id: 's23', brand: 'Samsung', model: 'Galaxy S23', tier: 4, re: /\bs ?23\b/ },
  { id: 'a54', brand: 'Samsung', model: 'Galaxy A54', tier: 2, re: /\ba ?54\b/ },
  { id: 'a32', brand: 'Samsung', model: 'Galaxy A32', tier: 1, re: /\ba ?32\b/ },
  { id: 'rn12', brand: 'Xiaomi', model: 'Redmi Note 12', tier: 1, re: /note ?12|redmi ?12/ },
  { id: 'px7', brand: 'Google', model: 'Pixel 7', tier: 3, re: /pixel ?7/ },
  { id: 'op11', brand: 'OnePlus', model: 'OnePlus 11', tier: 3, re: /one ?plus ?11|\bop ?11\b/ },
  { id: 'c55', brand: 'Realme', model: 'Realme C55', tier: 1, re: /\bc ?55\b/ },
  { id: 'y20', brand: 'Vivo', model: 'Vivo Y20', tier: 1, re: /\by ?20\b/ }
];
const BRANDS = [['Apple', /iphone|apple|\bip\b/], ['Samsung', /samsung|galaxy/], ['Xiaomi', /xiaomi|redmi|poco|mi /], ['Google', /pixel|google/], ['OnePlus', /one ?plus/], ['Realme', /realme/], ['Vivo', /vivo/]];
const TIER_NAMES = ['Budget', 'Mid-range', 'Upper mid', 'Flagship'];
const tierModels = n => MODELS.filter(m => m.tier === n).map(m => m.model).join(', ');
function tierOf(brand, model) {
  const t = `${brand || ''} ${model || ''}`.toLowerCase();
  const m = MODELS.find(x => x.model.toLowerCase() === String(model || '').toLowerCase()) || MODELS.find(x => x.re.test(t));
  return m ? m.tier : 2;
}

/* ---------- service catalogue defaults (owner edits these in Settings) ---------- */
const SVC_DEFAULTS = [
  { id: 'screen', name: 'Screen replacement', icon: 'glass', time: '1–2 hours', days: 1, warranty: 90, price: [3600, 7500, 15500, 21000], graded: true, web: true },
  { id: 'battery', name: 'Battery replacement', icon: 'battery', time: '45 minutes', days: 1, warranty: 180, price: [1200, 1900, 2600, 3400], graded: true, web: true },
  { id: 'port', name: 'Charging port repair', icon: 'plug', time: '1 hour', days: 1, warranty: 60, price: [600, 800, 1200, 1500], graded: false, web: true },
  { id: 'back', name: 'Back glass replacement', icon: 'phoneDev', time: '2 hours', days: 1, warranty: 30, price: [900, 1600, 3200, 4800], graded: true, web: true },
  { id: 'camera', name: 'Camera repair', icon: 'camera', time: '1–2 hours', days: 1, warranty: 90, price: [1500, 1800, 3800, 5200], graded: true, web: true },
  { id: 'speaker', name: 'Speaker & mic repair', icon: 'speaker', time: '45 minutes', days: 1, warranty: 60, price: [450, 600, 900, 1200], graded: false, web: true },
  { id: 'water', name: 'Water damage treatment', icon: 'drop', time: '24 hours', days: 2, warranty: 30, price: [1500, 2000, 2800, 3500], graded: false, web: true },
  { id: 'software', name: 'Software & data rescue', icon: 'cpu', time: '1 hour', days: 1, warranty: 30, price: [600, 700, 900, 1000], graded: false, web: true },
  { id: 'diag', name: 'Free diagnosis', icon: 'diag', time: '30 minutes', days: 1, warranty: 0, price: [0, 0, 0, 0], graded: false, web: true }
];
/* how a free-text issue maps to a service (counter jobs, assistant) */
const SVC_RE = {
  screen: /screen|display|crack|broke|shatter|touch|lcd|oled|lines on|black screen/, battery: /battery|drain|swollen|swell|dies fast|health|shuts? (off|down)/,
  port: /charg|port|cable|lightning|type.?c/, back: /back (glass|cover|panel)|rear glass/, camera: /camera|blurry|lens|photo/,
  speaker: /speaker|mic|sound|can.?t hear|audio|volume/, water: /water|\bwet\b|\brain\b|liquid|drop(ped)? (it )?in|toilet|\bpool\b|\bsea\b/,
  software: /software|stuck|logo|boot ?loop|\bboot|\bhang|slow|virus|update|\bdata\b|restart/, diag: /not sure|don.?t know|no idea|something wrong|check/
};
const svcRe = s => SVC_RE[s.id] || new RegExp(s.name.toLowerCase().split(/\W+/).filter(w => w.length > 3).join('|') || '^$');

/* ---------- website + branch defaults ---------- */
// opening hours per weekday, index = Date#getDay() (0 = Sunday); null = closed
const WEEK_DEFAULT = [['10:00', '21:00'], ['10:00', '21:00'], ['10:00', '21:00'], ['10:00', '21:00'], ['10:00', '21:00'], ['15:00', '21:00'], ['10:00', '21:00']];
const WEB_DEFAULTS = { pickupFee: 150, compatPct: 68, since: '', week: WEEK_DEFAULT };
const DEMO_SHOP = 'Dhanmondi Mobile Care';
/* Website copy the owner edits in Settings → Website. The public site reads these live. */
const CONTENT_DEFAULTS = {
  announce: 'Book your repair in one message', h1a: 'Phone repairs,', h1b: 'handled with care.',
  lede: 'Tell us what’s wrong. You’ll see the price for your phone, pick a time that suits you and get updates until it’s back in your hand.',
  socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', youtube: 'https://youtube.com', whatsapp: true },
  show: { reviews: true, guides: true, faq: true, track: true }
};
const webContent = (db = DB) => { const c = (db.settings.web || {}).content || {}; return { ...CONTENT_DEFAULTS, ...c, socials: { ...CONTENT_DEFAULTS.socials, ...(c.socials || {}) }, show: { ...CONTENT_DEFAULTS.show, ...(c.show || {}) } }; };
const DEMO_BRANCHES = {
  'Main branch': { label: 'Elephant Road', addr: '42/B Elephant Road, Dhaka 1205', phone: '01711-482091', near: 'Opposite Bata showroom' },
  'Mirpur branch': { label: 'Mirpur 10', addr: 'Shop 14, Shah Ali Plaza, Mirpur 10, Dhaka 1216', phone: '01711-482092', near: 'Level 2, beside the escalator' }
};
const DAY_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAY_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
/* group the week into rows like ['Sat – Thu', '10:00 – 21:00'] */
function hoursRows(week) {
  const rows = [];
  WEEK_ORDER.forEach(d => { const h = week[d], key = h ? h.join('-') : 'closed', last = rows[rows.length - 1]; if (last && last.key === key) last.days.push(d); else rows.push({ key, days: [d], h }); });
  return rows.map(r => [r.days.length === 1 ? DAY_L[r.days[0]] : DAY_S[r.days[0]] + ' – ' + DAY_S[r.days[r.days.length - 1]], r.h ? r.h[0] + ' – ' + r.h[1] : 'Closed']);
}
const branchInfo = (name, db = DB) => (db.settings.branchInfo || {})[name] || { label: name, addr: '', phone: db.settings.phone || '', near: '' };

/* ---------- migration: make any workspace satisfy the contract ---------- */
function ensureShopConfig(db) {
  if (!db || !db.settings) return false; const S = db.settings; let ch = false;
  if (!Array.isArray(S.services)) { S.services = JSON.parse(JSON.stringify(SVC_DEFAULTS)); ch = true; }
  if (!S.web) { S.web = JSON.parse(JSON.stringify(WEB_DEFAULTS)); if (S.shop === DEMO_SHOP) S.web.since = '2016'; ch = true; }
  if (!S.web.content) { S.web.content = JSON.parse(JSON.stringify(CONTENT_DEFAULTS)); ch = true; }
  const RVFIX = {'Chose the compatible screen to save money — honestly can’t tell the difference.': 'Went with the compatible screen to save money. I can’t tell the difference.', 'They cleaned the port first and it worked — no part needed.': 'They cleaned the port first and it worked. No part needed.', 'Stuck on the logo for days — fixed without losing my data.': 'It was stuck on the logo for days. Fixed, and I didn’t lose any data.'}; (db.feedback || []).forEach(f => { if (RVFIX[f.text]) { f.text = RVFIX[f.text]; ch = true; } });
  const WC = S.web.content; if (/^Tell us what happened\. Get an honest price/.test(WC.lede || '')) { WC.lede = CONTENT_DEFAULTS.lede; ch = true; } if (WC.announce === 'Book your repair in a single message') { WC.announce = CONTENT_DEFAULTS.announce; ch = true; }
  if (!S.branchInfo) { S.branchInfo = {}; ch = true; }
  S.branches.forEach(b => { if (!S.branchInfo[b]) { S.branchInfo[b] = { ...(S.shop === DEMO_SHOP && DEMO_BRANCHES[b] || { label: b, addr: S.address || '', phone: S.phone || '', near: '' }) }; ch = true; } });
  if (!db.counters) db.counters = {};
  db.jobs.forEach(j => { if (!j.tag) { j.tag = bagTag(db); ch = true; } });
  if (!Array.isArray(db.feedback)) { db.feedback = []; ch = true; if (S.shop === DEMO_SHOP) seedFeedback(db); }
  if ((db.counters.cfgv || 0) < 2) { db.feedback.forEach(f => { const j = db.jobs.find(x => x.id === f.jobId); if (j) f.svcIds = jobSvcIds(j, db); }); db.counters.cfgv = 2; ch = true; }
  return ch;
}
function bagTag(db = DB) { db.counters.bag = (db.counters.bag || 2200) + 1; return 'A-' + db.counters.bag; }

/* ---------- services, prices, warranty ---------- */
const svcCfg = (id, db = DB) => db.settings.services.find(s => s.id === id);
function svcGuess(text, db = DB) { const t = String(text || '').toLowerCase(); return db.settings.services.filter(s => s.id !== 'diag' && svcRe(s).test(t)).map(s => s.id); }
function jobSvcIds(j, db = DB) { if (j.svcIds && j.svcIds.length) return j.svcIds; if (j.online && (j.online.items || []).length) return j.online.items.map(i => i.id); return svcGuess(j.issue, db); }
function priceFor(s, tier, q = 'compatible', db = DB) {
  const p = +s.price[(tier || 2) - 1] || 0;
  return s.graded && q !== 'original' ? Math.round(p * (db.settings.web.compatPct / 100) / 50) * 50 : p;
}
/* the warranty a job earns at delivery = the longest warranty among its services */
function jobWarrantyDays(j, db = DB) {
  if (j.isWarranty) return 0;
  const ws = jobSvcIds(j, db).map(id => svcCfg(id, db)).filter(s => s && s.id !== 'diag').map(s => +s.warranty || 0);
  return ws.length ? Math.max(...ws) : (+db.settings.warrantyDays || 0);
}

/* ---------- customer quote approval (portal sends, website or staff answers) ---------- */
function sendQuote(j, note) {
  const amount = jobTotals(j).total;
  j.quote = { amount, note: note || '', state: 'pending', sentAt: Date.now(), at: null, via: '' };
  setJobStatus(j, 'quote', `quote ${money(amount)} sent to customer`);
}
function answerQuote(j, yes, via) {
  if (!j || j.status !== 'quote' || !j.quote || j.quote.state !== 'pending') return 'This quote is no longer waiting for an answer.';
  Object.assign(j.quote, { state: yes ? 'approved' : 'declined', at: Date.now(), via });
  if (yes) setJobStatus(j, 'repairing', `customer approved ${money(j.quote.amount)} (${via})`);
  else cancelJob(j, `Customer declined quote (${via})`, true);
  return null;
}

/* ---------- customer feedback ---------- */
const shortName = n => { const p = String(n || 'Customer').trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
function ratingOf(svcId, db = DB) {
  const l = (db.feedback || []).filter(f => !f.hidden && (!svcId || (f.svcIds || []).includes(svcId)));
  return { n: l.length, avg: l.length ? Math.round(sum(l, f => f.rating) / l.length * 10) / 10 : 0, dist: [5, 4, 3, 2, 1].map(r => l.length ? Math.round(l.filter(f => f.rating === r).length / l.length * 100) : 0) };
}
function addFeedback(j, rating, text, via, ts) {
  if (!j || j.status !== 'delivered') return 'Only collected repairs can be reviewed.';
  if (DB.feedback.some(f => f.jobId === j.id)) return 'This repair already has a review.';
  const r = Math.round(+rating); if (!(r >= 1 && r <= 5)) return 'Choose a rating from 1 to 5.';
  const c = custOf(j.custId) || {};
  const f = { id: uid('fb'), jobId: j.id, code: j.code, custId: j.custId, name: c.name || 'Customer', rating: r, text: String(text || '').trim().slice(0, 600), svcIds: jobSvcIds(j), model: `${j.brand} ${j.model}`, branch: j.branch, at: ts || Date.now(), hidden: false, via: via || 'website' };
  DB.feedback.unshift(f); DB.feedback.sort((a, b) => b.at - a.at);
  logJob(j, `Customer rated the repair ${r}/5 (${f.via})`, ts); logAct(`New ${r}★ review on ${j.code}`, 'reviews', ts);
  return null;
}
/* demo workspaces get feedback on past repairs so ratings are computed, not typed */
function seedFeedback(db) {
  const prev = DB, prevU = typeof USER !== 'undefined' ? USER : null; DB = db; USER = null;
  const R = rng(20261122), pick = a => a[Math.floor(R() * a.length)];
  const T = {
    screen: ['Colours look exactly like before and Face ID still works.', 'Done in under two hours, price was what the website said.', 'Went with the compatible screen to save money. I can’t tell the difference.'],
    battery: ['Waited 45 minutes with a cup of tea. Battery health back to 100%.', 'They printed the battery health on the invoice. Nice touch.', 'Phone lasts the whole day again.'],
    port: ['They cleaned the port first and it worked. No part needed.', 'Charging fast again, fair price.'],
    back: ['Back glass looks factory new and the frame has no scratches.'],
    camera: ['Photos are sharp again, they tested it with me at the counter.'],
    speaker: ['Calls are loud and clear now. Quick job.'],
    water: ['Dropped it in the rain. Got my photos back and the phone works.', 'They were honest about the chances and it worked out.'],
    software: ['It was stuck on the logo for days. Fixed, and I didn’t lose any data.'],
    _: ['Clear price, written warranty, and I could check the status instead of calling.', 'They told me the real problem before replacing anything.', 'Straightforward people. Would come back.', 'Booked online, dropped it off, collected the same evening.']
  };
  db.jobs.filter(j => j.status === 'delivered' && !j.isWarranty && j.deliveredAt).sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt)).forEach(j => {
    if (R() > .62) return;
    const roll = R(), r = roll < .74 ? 5 : roll < .94 ? 4 : 3, ids = jobSvcIds(j, db), pool = T[ids[0]] || T._;
    const text = R() < .7 ? (r === 3 ? 'Good repair, but it took longer than promised.' : pick(pool)) : '';
    addFeedback(j, r, text, R() < .5 ? 'website' : 'SMS link', parseD(j.deliveredAt).getTime() + (18 + Math.floor(R() * 40)) * 3600e3);
  });
  DB = prev; USER = prevU;
}
