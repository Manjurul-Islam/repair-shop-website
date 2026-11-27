'use strict';
/* Public website ⇄ Benchly workspace bridge.
   The site shares the app's origin, so bookings are written straight into the
   shop's Benchly workspace and appear in Jobs / Dashboard immediately. */
/* Everything below is a LIVE VIEW of the owner's workspace (js/shopcfg.js contract).
   Bridge.reload() refreshes it, so prices, warranty, hours, branches, fees and ratings
   always match what the owner set in the portal. Nothing here is hardcoded. */
let PICKUP_FEE = 150;
const SHOP = { hours: [], branches: [], week: WEEK_DEFAULT, phone: '', email: '', since: '', name: '' };
const SERVICES = [];          // services shown on the website (owner ticked "On website")
const ALL_SERVICES = [];      // every service, so older bookings still resolve
const GRADED = [];            // services that offer a compatible part
const svcById = id => ALL_SERVICES.find(s => s.id === id);
const svcPrice = (svc, dev, q = 'compatible') => priceFor(svc, (dev && dev.tier) || tierOf(dev && dev.brand, dev && dev.model), q);
const fromPrice = (svc, dev) => svcPrice(svc, dev, 'compatible');
const GRADES = { compatible: ['Premium compatible', 'Tested high-grade part, same warranty'], original: ['Original (OEM)', 'Manufacturer part, where available'] };
const fmtBDT = n => n ? '৳' + Math.round(n).toLocaleString('en-US') : 'Free';
const telHref = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const waHref = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '88' + d; return 'https://wa.me/' + d; };
function applyShopConfig(db) {
  const S = db.settings, W = S.web;
  PICKUP_FEE = +W.pickupFee || 0;
  ALL_SERVICES.splice(0, ALL_SERVICES.length, ...S.services.map(s => ({ ...s, re: svcRe(s) })));
  SERVICES.splice(0, SERVICES.length, ...ALL_SERVICES.filter(s => s.web));
  GRADED.splice(0, GRADED.length, ...ALL_SERVICES.filter(s => s.graded).map(s => s.id));
  SHOP.content = webContent(db);
  Object.assign(SHOP, { week: W.week, hours: hoursRows(W.week), since: W.since || '', name: S.shop, email: S.email || '', phone: (branchInfo(S.branches[0], db).phone || S.phone || '') });
  SHOP.branches.splice(0, SHOP.branches.length, ...S.branches.map(id => { const b = branchInfo(id, db); return { id, name: b.label || id, addr: b.addr || '', phone: b.phone || S.phone || '', near: b.near || '' }; }));
  if (typeof META !== 'undefined') ALL_SERVICES.forEach(s => {
    if (!META[s.id]) META[s.id] = { cat: 'rescue', art: 'diag', blurb: s.desc || `${s.name} by a certified technician, tested before handover.`, inc: ['Free check first', s.warranty ? s.warranty + '-day written warranty' : 'Honest advice', 'Pay after the repair'] };
    const r = ratingOf(s.id, db); META[s.id].rating = r.avg; META[s.id].n = r.n;
  });
}
const maxWarranty = () => Math.max(0, ...SERVICES.map(s => +s.warranty || 0));
const priceRange = () => { const p = SERVICES.flatMap(s => s.price.map((x, t) => s.graded ? priceFor(s, t + 1, 'compatible') : x)).filter(x => x > 0); return p.length ? [Math.min(...p), Math.max(...SERVICES.flatMap(s => s.price))] : [0, 0]; };
function hoursToday(d = new Date()) { const h = SHOP.week[d.getDay()]; if (!h) return null; return { from: h[0], to: h[1] }; }
function openState(d = new Date()) {
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), t = hoursToday(d);
  if (t && hm >= t.from && hm < t.to) return { open: true, text: 'Open now · until ' + t.to };
  for (let i = 0; i < 8; i++) { const x = new Date(d); x.setDate(d.getDate() + i); const h = hoursToday(x); if (h && (i > 0 || hm < h.from)) return { open: false, text: 'Closed · opens ' + (i === 0 ? h.from : i === 1 ? 'tomorrow ' + h.from : DAY_S[x.getDay()] + ' ' + h.from) }; }
  return { open: false, text: 'Closed' };
}

/* ---------- appointment slots (follow the owner's opening hours) ---------- */
const DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function slotDays(n = 4) {
  const out = []; const now = new Date();
  for (let i = 0; out.length < n && i < 10; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0);
    const h = SHOP.week[d.getDay()]; if (!h) continue;
    const from = Math.ceil(+h[0].slice(0, 2) + +h[0].slice(3) / 60), to = +h[1].slice(0, 2) + +h[1].slice(3) / 60, hours = [];
    for (let x = from; x <= to - 1; x += 2) hours.push(x);
    const times = hours.filter(x => i > 0 || x > now.getHours() + 1);
    if (times.length) out.push({ date: iso(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYN[d.getDay()] + ' ' + d.getDate(), times: times.map(x => pad(x) + ':00') });
  }
  return out;
}
const fmtSlot = s => { if (!s) return ''; const d = parseD(s.date); const t = todayD(); const n = Math.round((d - t) / DAY); return (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : DAYN[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()]) + ' · ' + s.time; };

/* ---------- workspace access ---------- */
const Bridge = {
  ws: null,
  async open() {
    await ensureDemo();
    const owner = getUsers().find(u => u.email === 'demo@benchly.app');
    this.ws = owner.wsId; this.reload(); return DB;
  },
  reload() { DB = LS.get('qf:ws:' + this.ws, null); if (DB) { if (ensureShopConfig(DB)) saveNow(); applyShopConfig(DB); } return DB; },
  ok: new Set(),
  can(code) { return this.ok.has(code) || (typeof Acc !== 'undefined' && Acc.me() && Acc.bookings(Acc.me()).some(j => j.code === code)); },
  answer(code, yes) { this.reload(); USER = null; if (!this.can(code)) return 'Please look up this repair again.'; const j = DB.jobs.find(x => x.code === code); const er = answerQuote(j, yes, 'website'); if (!er) saveNow(); return er; },
  review(code, rating, text) { this.reload(); USER = null; if (!this.can(code)) return 'Please look up this repair again.'; const j = DB.jobs.find(x => x.code === code); const er = addFeedback(j, rating, text, 'website'); if (!er) saveNow(); return er; },
  stats() {
    this.reload(); const done = DB.jobs.filter(j => j.status === 'delivered');
    const tat = done.map(j => diffDays(j.deliveredAt || j.due, j.createdAt)).filter(n => n >= 0).sort((a, b) => a - b);
    const sameDay = tat.length ? tat.filter(n => n <= 1).length / tat.length : 0;
    const onTime = done.length ? done.filter(j => !j.deliveredAt || j.deliveredAt <= j.due).length / done.length : 0;
    const r = ratingOf(null); return { delivered: done.length, sameDay: Math.round(sameDay * 100), onTime: Math.round(onTime * 100), warranty: maxWarranty(), customers: DB.customers.length, rating: r.avg, reviews: r.n };
  },
  /* Create a real repair job in the shop workspace */
  book(b) {
    this.reload(); USER = null;
    const items = b.items || [{ id: b.service, q: 'tbd' }], dev = b.device;
    const digits = String(b.phone).replace(/\D/g, '');
    let c = DB.customers.find(x => String(x.phone).replace(/\D/g, '').endsWith(digits.slice(-10)));
    if (!c) { c = { id: uid('c'), name: b.name, phone: b.phone, email: b.email || '', address: b.address || '', notes: 'Created from website booking', createdAt: todayS() }; DB.customers.push(c); logAct(`Added customer ${c.name} (website)`, 'customers/' + c.id); }
    else if (b.email && !c.email) c.email = b.email;
    const lines = items.map(it => { const svc = svcById(it.id); const graded = GRADED.includes(svc.id) && it.q !== 'tbd'; return { svc, price: it.q === 'tbd' ? fromPrice(svc, dev) : svcPrice(svc, dev, it.q), label: svc.name + (graded ? ` · ${GRADES[it.q][0]}` : '') }; });
    const fee = b.handoff === 'pickup' ? PICKUP_FEE : 0;
    const labour = sum(lines, l => l.price) + fee;
    const days = Math.max(1, ...lines.map(l => +l.svc.days || 1));
    const j = createJob({ custId: c.id, brand: dev.brand, model: dev.model, issue: lines.map(l => l.label).join(' + ') + (b.details ? ': ' + b.details : ''), priority: b.urgent ? 'high' : 'normal', branch: b.branch || SHOP.branches[0].id, date: todayS(), due: addDays(b.slot.date, days), estimate: labour, svcIds: items.map(i => i.id), grade: (items.find(i => GRADED.includes(i.id) && i.q !== 'tbd') || {}).q || '' });
    j.online = { accountId: b.accountId || null, source: b.source, handoff: b.handoff, slot: b.slot, address: b.address || '', pay: b.pay || 'Pay at collection', items, addons: b.addons || [], bookedAt: Date.now() };
    const br = SHOP.branches.find(x => x.id === j.branch) || SHOP.branches[0];
    j.notes = `Booked online via ${b.source === 'assistant' ? 'the repair assistant' : 'the website checkout'}. ${b.handoff === 'pickup' ? `Courier pickup (${fmtBDT(fee)}) from ` + b.address : 'Customer drop-off at ' + br.name}, ${fmtSlot(b.slot)}.${b.pay ? ' Payment: ' + b.pay + '.' : ''}${b.note ? ' Customer note: ' + b.note : ''}`;
    j.timeline[0].text = `Booked online (${b.source === 'assistant' ? 'assistant' : 'checkout'}): ${b.handoff === 'pickup' ? 'pickup' : 'drop-off'} ${fmtSlot(b.slot)}`;
    const failed = [];
    (b.addons || []).forEach(a => { const it = itemOf(a.itemId); const er = it ? addJobPart(j, it, a.qty) : 'missing'; if (er) failed.push(it ? it.name : a.itemId); });
    saveNow();
    return { code: j.code, job: j, customer: c, total: jobTotals(j).total, failed };
  },
  addons() { this.reload(); return DB.items.filter(i => i.category === 'Accessories').map(i => ({ id: i.id, name: i.name, price: i.price, stock: i.stock, warranty: i.warrantyDays })); },
  /* Look up a job; requires last 4 digits of the phone on file */
  track(code, last4) {
    this.reload();
    const k = 'site:track', t = JSON.parse(sessionStorage.getItem(k) || '[]').filter(x => Date.now() - x < 10 * 60e3);
    if (t.length >= 6) return { error: 'Too many attempts. Please wait a few minutes, or call the shop.' };
    let q = String(code || '').trim().toUpperCase().replace(/\s/g, ''); if (/^\d{3,5}$/.test(q)) q = 'RJ-' + q; if (/^RJ\d/.test(q)) q = 'RJ-' + q.slice(2);
    const j = DB.jobs.find(x => x.code === q); const c = j && custOf(j.custId);
    const ok = j && c && String(c.phone).replace(/\D/g, '').slice(-4) === String(last4).replace(/\D/g, '');
    if (!ok) { t.push(Date.now()); sessionStorage.setItem(k, JSON.stringify(t)); return { error: 'We couldn’t find a repair with that code and phone number. Check your receipt or SMS and try again.' }; }
    sessionStorage.removeItem(k); this.ok.add(j.code);
    return { job: j, customer: c, totals: jobTotals(j) };
  },
  sample() { this.reload(); const j = [...DB.jobs].reverse().find(x => ['repairing', 'ready', 'diagnosing'].includes(x.status) && custOf(x.custId)); return j ? { code: j.code, last4: String(custOf(j.custId).phone).replace(/\D/g, '').slice(-4) } : null; }
};

/* customer-facing status model */
const STAGES = [['received', 'Booked'], ['diagnosing', 'Checking'], ['repairing', 'Repairing'], ['ready', 'Ready'], ['delivered', 'Collected']];
function stageIndex(st) { if (st === 'waiting_parts') return 2; if (st === 'quote') return 1; const i = STAGES.findIndex(s => s[0] === st); return i < 0 ? 0 : i; }
const STATUS_COPY = {
  received: ['We’ve got your booking', 'A technician will check your device when it arrives.'],
  diagnosing: ['Your device is being checked', 'We’ll confirm the price before any work starts.'],
  quote: ['Your quote is ready', 'Nothing happens until you approve it. If you decline, you pay nothing and collect your phone.'],
  waiting_parts: ['Waiting for a part', 'The part is on its way. We’ll update you as soon as it arrives.'],
  repairing: ['Repair in progress', 'Your technician is working on it now.'],
  ready: ['Ready for pickup', 'Bring your receipt or this code. ID not required.'],
  delivered: ['Collected', 'Your warranty is active. Keep the invoice for claims.'],
  cancelled: ['Cancelled', 'This repair was cancelled. Call us if that’s unexpected.']
};

/* live part availability for a service on a given phone (from the shop's inventory) */
const PART_KEY = { screen: /display|lcd|oled/i, battery: /battery/i, port: /charging port/i, back: /back (glass|cover)/i, camera: /camera/i, speaker: /speaker/i };
function partStock(svcId, dev) {
  const key = PART_KEY[svcId]; if (!key) return { none: true }; const items = DB.items.filter(i => key.test(i.name));
  const mdl = dev.model.toLowerCase().replace(/^galaxy /, '');
  const exact = items.find(i => i.name.toLowerCase().includes(mdl));
  const brandish = items.find(i => i.name.toLowerCase().includes(dev.brand.toLowerCase()) || (dev.brand === 'Apple' && /iphone/i.test(i.name)));
  const it = exact || (svcId === 'screen' ? null : brandish || items[0]);
  return it ? { stock: it.stock, exact: !!exact } : { stock: 0 };
}
function stockLabel(svcId, dev) { const s = partStock(svcId, dev); if (s.none) return ['ok', 'No part needed']; if (s.stock >= 5) return ['ok', 'Part in stock']; if (s.stock > 0) return ['low', `Only ${s.stock} part${s.stock > 1 ? 's' : ''} left`]; return ['wait', 'Part in 24 h']; }

/* Live link to the portal: when the owner publishes in another tab, repaint this page in place */
function applyContent() {
  const C = SHOP.content; if (!C) return;
  const set = (sel, v) => { const el = $(sel); if (el && v != null) el.textContent = v; };
  const an = $('.hero .announce'); if (an) { an.hidden = !C.announce; const t = an.childNodes[1]; if (t && t.nodeType === 3) t.textContent = C.announce; }
  const h1 = $('.hero h1'); if (h1) h1.innerHTML = `${esc(tcase(C.h1a))}${C.h1b ? `<br><em>${esc(tcase(C.h1b))}</em>` : ''}`;
  set('.hero .lede', C.lede);
  const map = { track: '#track', reviews: '.nx-voices', guides: 'main > .nx-guides', faq: '#faq' };
  Object.entries(map).forEach(([k, sel]) => { const el = $(sel); const sec = el && (el.closest('main > section') || el); if (sec) sec.hidden = !C.show[k]; });
  $$('a[href$="#track"], a[href$="#faq"]').forEach(a => { const k = a.getAttribute('href').split('#')[1]; a.hidden = !C.show[k]; });
}
const tcase = s => String(s || '').replace(/(^|[\s(“"-])([a-z])/g, (m, a, c) => a + c.toUpperCase());
addEventListener('storage', e => {
  if (e.key && !/^qf:ws:/.test(e.key)) return;
  try { Bridge.reload && Bridge.reload(); } catch (_) {}
  applyContent(); const fs = $('.ft-social'); if (fs && typeof footSocial === 'function') fs.innerHTML = footSocial();
});
document.addEventListener('DOMContentLoaded', () => setTimeout(applyContent, 0));
