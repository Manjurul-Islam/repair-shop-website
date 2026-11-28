'use strict';
/* Repair store: catalog → product view → booking bag → checkout → confirmation.
   The manual booking path. Shares pricing, slots and Bridge.book with the assistant. */

/* ---------- product art (inline SVG, one visual language) ---------- */
let ART_N = 0;
function art(kind) {
  const n = ++ART_N, g = `g${n}`, sc = `s${n}`;
  const defs = `<defs><radialGradient id="${g}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E3EBF8"/></radialGradient><linearGradient id="${sc}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3C76E8"/><stop offset=".55" stop-color="#1D46A8"/><stop offset="1" stop-color="#0E2765"/></linearGradient></defs>`;
  const bg = `<rect width="240" height="180" fill="url(#${g})"/><ellipse cx="120" cy="166" rx="54" ry="5" fill="#0B1324" opacity=".08"/>`;
  const front = (screen = '') => `<rect x="86" y="18" width="68" height="142" rx="13" fill="#0B1324"/><rect x="90" y="22" width="60" height="134" rx="10" fill="url(#${sc})"/><rect x="110" y="27" width="20" height="5" rx="2.5" fill="#050B1D"/>${screen}`;
  const rear = (extra = '') => `<rect x="86" y="18" width="68" height="142" rx="13" fill="#1A2747"/><rect x="88" y="20" width="64" height="138" rx="11" fill="#223460"/><rect x="94" y="26" width="28" height="28" rx="8" fill="#152241" stroke="#2E4478"/><circle cx="102" cy="34" r="5" fill="#0B1324" stroke="#4F86F0" stroke-width="1.4"/><circle cx="114" cy="46" r="5" fill="#0B1324" stroke="#4F86F0" stroke-width="1.4"/><circle cx="114" cy="34" r="2" fill="#9FC0FF"/>${extra}`;
  const W = '#FFFFFF';
  const K = {
    screen: front(`<path d="M128 70l-9 14 7 6-12 22M119 84l-14 4M126 90l14 10M114 112l-6 14" stroke="${W}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".85"/><circle cx="128" cy="70" r="3" fill="${W}" opacity=".9"/>`),
    battery: front(`<rect x="106" y="70" width="28" height="48" rx="5" fill="none" stroke="${W}" stroke-width="2"/><rect x="114" y="65" width="12" height="5" rx="1.5" fill="${W}"/><rect x="110" y="96" width="20" height="18" rx="2" fill="#7DF0A8"/><path d="M121 76l-6 11h6l-3 9" stroke="${W}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    port: front(`<rect x="112" y="150" width="16" height="4" rx="2" fill="#9FC0FF"/><circle cx="120" cy="152" r="14" fill="#4F86F0" opacity=".25"/><rect x="113" y="164" width="14" height="10" rx="2" fill="#0B1324"/><path d="M120 174v8" stroke="#0B1324" stroke-width="4" stroke-linecap="round"/><path d="M122 80l-8 14h8l-4 12" stroke="${W}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    back: rear(`<path d="M138 96l-10 12 8 6-10 20M128 108l-14-2M136 114l10 10" stroke="#C9D8F5" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".9"/>`),
    camera: `<rect x="70" y="30" width="100" height="120" rx="22" fill="#1A2747"/><rect x="78" y="38" width="84" height="84" rx="20" fill="#152241" stroke="#2E4478"/><circle cx="102" cy="62" r="15" fill="#0B1324" stroke="#4F86F0" stroke-width="2"/><circle cx="102" cy="62" r="7" fill="#1D46A8"/><circle cx="99" cy="59" r="2.2" fill="${W}" opacity=".8"/><circle cx="138" cy="98" r="15" fill="#0B1324" stroke="#4F86F0" stroke-width="2"/><circle cx="138" cy="98" r="7" fill="#1D46A8"/><circle cx="135" cy="95" r="2.2" fill="${W}" opacity=".8"/><circle cx="138" cy="62" r="6" fill="#FFF3C4"/><circle cx="102" cy="98" r="4" fill="#0B1324" stroke="#2E4478"/>`,
    speaker: front(`<path d="M114 80h-6v18h6l10 8V72z" fill="${W}"/><path d="M130 80c4 3 4 15 0 18M135 75c8 6 8 22 0 28" stroke="${W}" stroke-width="2" fill="none" stroke-linecap="round"/>`) + `<path d="M162 70c6 6 6 30 0 36M170 62c10 10 10 42 0 52" stroke="#4F86F0" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>`,
    water: front(`<path d="M120 72c-8 11-12 17-12 23a12 12 0 0 0 24 0c0-6-4-12-12-23z" fill="${W}" opacity=".92"/><path d="M114 96a6 6 0 0 0 6 6" stroke="#1D46A8" stroke-width="2" fill="none" stroke-linecap="round"/>`) + `<path d="M60 64c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12zM180 104c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12zM170 40c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" fill="#4F86F0" opacity=".55"/>`,
    software: front(`<circle cx="120" cy="88" r="17" fill="none" stroke="${W}" stroke-opacity=".25" stroke-width="4"/><path d="M120 71a17 17 0 0 1 16 22" stroke="${W}" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="100" y="118" width="40" height="4" rx="2" fill="${W}" opacity=".35"/><rect x="100" y="118" width="26" height="4" rx="2" fill="#7DF0A8"/><rect x="106" y="128" width="28" height="3" rx="1.5" fill="${W}" opacity=".25"/>`),
    diag: front(`<path d="M94 92h12l5-12 8 26 6-18 4 8h17" stroke="#7DF0A8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="100" y="120" width="40" height="14" rx="7" fill="${W}" opacity=".16"/><circle cx="108" cy="127" r="3" fill="#7DF0A8"/>`),
    glass: `<rect x="96" y="24" width="68" height="138" rx="14" fill="#DCE8FF" stroke="#9FC0FF"/><rect x="80" y="16" width="68" height="138" rx="14" fill="#fff" fill-opacity=".72" stroke="#4F86F0" stroke-width="1.5"/><path d="M92 40l30-14M92 62l46-22" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/><rect x="104" y="22" width="20" height="5" rx="2.5" fill="#9FC0FF"/>`,
    case: `<rect x="84" y="16" width="72" height="146" rx="16" fill="#1D46A8"/><rect x="90" y="22" width="60" height="134" rx="11" fill="#2A5FD0"/><rect x="94" y="26" width="30" height="30" rx="9" fill="#173B8F"/><circle cx="103" cy="35" r="5" fill="#0E2765"/><circle cx="115" cy="47" r="5" fill="#0E2765"/><rect x="154" y="52" width="3" height="18" rx="1.5" fill="#173B8F"/><path d="M120 104h0" stroke="#9FC0FF" stroke-width="10" stroke-linecap="round"/>`,
    charger: `<rect x="82" y="56" width="76" height="76" rx="18" fill="#fff" stroke="#C9D8F5" stroke-width="1.5"/><rect x="104" y="36" width="8" height="22" rx="2" fill="#7A869C"/><rect x="128" y="36" width="8" height="22" rx="2" fill="#7A869C"/><rect x="110" y="110" width="20" height="6" rx="3" fill="#0B1324"/><path d="M122 76l-8 13h8l-4 11" stroke="#275FCE" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    cable: `<path d="M70 40c60 0 20 60 60 60s30 40 40 46" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M70 40c60 0 20 60 60 60s30 40 40 46" stroke="#C9D8F5" stroke-width="1.2" fill="none"/><rect x="48" y="30" width="26" height="20" rx="5" fill="#fff" stroke="#C9D8F5"/><rect x="40" y="36" width="10" height="8" rx="2" fill="#7A869C"/><rect x="164" y="138" width="20" height="26" rx="5" fill="#fff" stroke="#C9D8F5"/><rect x="169" y="162" width="10" height="8" rx="2" fill="#7A869C"/>`,
    buds: `<rect x="78" y="70" width="84" height="64" rx="30" fill="#fff" stroke="#C9D8F5" stroke-width="1.5"/><path d="M78 98h84" stroke="#C9D8F5"/><circle cx="120" cy="114" r="2.5" fill="#7DF0A8"/><path d="M96 30a12 12 0 1 1 4 23l-2 18" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M146 30a12 12 0 1 0-4 23l2 18" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M96 30a12 12 0 1 1 4 23l-2 18M146 30a12 12 0 1 0-4 23l2 18" stroke="#C9D8F5" stroke-width="1" fill="none"/>`,
    bank: `<rect x="74" y="44" width="92" height="108" rx="18" fill="#0B1324"/><rect x="80" y="50" width="80" height="96" rx="13" fill="#1A2747"/><circle cx="104" cy="126" r="3" fill="#4F86F0"/><circle cx="114" cy="126" r="3" fill="#4F86F0"/><circle cx="124" cy="126" r="3" fill="#4F86F0"/><circle cx="134" cy="126" r="3" fill="#2E4478"/><path d="M122 70l-9 15h9l-5 14" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  };
  return `<svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice" class="art" role="img" aria-hidden="true">${defs}${bg}${K[kind] || K.diag}</svg>`;
}
const addonArt = name => /glass/i.test(name) ? 'glass' : /case/i.test(name) ? 'case' : /charger/i.test(name) ? 'charger' : /cable/i.test(name) ? 'cable' : /earbud/i.test(name) ? 'buds' : /power ?bank/i.test(name) ? 'bank' : 'glass';

/* ---------- catalog meta ---------- */
const CATS = [['all', 'All repairs'], ['display', 'Screen & glass'], ['power', 'Battery & charging'], ['media', 'Camera & audio'], ['rescue', 'Water & software'], ['addons', 'Add-ons']];
const META = {
  screen: { cat: 'display', art: 'screen', badge: 'Most booked', blurb: 'For cracks, lines, dead touch or a black screen. We fit and calibrate a new display.', inc: ['Display panel and adhesive seal', 'Face ID / Touch ID kept working', 'Screen protector fitted free'] },
  back: { cat: 'display', art: 'back', blurb: 'Shattered rear glass replaced cleanly, without scratching the frame.', inc: ['Laser-removed old glass', 'New back panel and seal', 'Camera lens cover included'] },
  battery: { cat: 'power', art: 'battery', badge: 'Same day', blurb: 'Drains fast, shuts down at 20% or swollen? New cell with full health.', inc: ['New battery with 100% health', 'Old battery disposed of safely', 'Health report on your invoice'] },
  port: { cat: 'power', art: 'port', badge: 'Same day', blurb: 'For a loose cable, slow charging or no charging. We clean or replace the port.', inc: ['Free port clean first', 'Replacement port if needed', 'Fast-charge tested before handover'] },
  camera: { cat: 'media', art: 'camera', blurb: 'For a blurry, shaky or black camera. We fix the module and lens.', inc: ['Rear camera module', 'Focus and stabiliser test', 'Lens glass included'] },
  speaker: { cat: 'media', art: 'speaker', blurb: 'Quiet calls, crackling speaker or a mic nobody can hear.', inc: ['Speaker or mic module', 'Mesh cleaned', 'Call test with you'] },
  water: { cat: 'rescue', art: 'water', blurb: 'Dropped in water? Bring it fast. Ultrasonic clean and board treatment.', inc: ['Ultrasonic board clean', 'Corrosion treatment', 'Data rescue attempt included'] },
  software: { cat: 'rescue', art: 'software', blurb: 'For a phone stuck on the logo, restarting, slow or full. We keep your data wherever we can.', inc: ['Backup before any reset', 'Firmware repair or reinstall', 'Setup help at handover'] },
  diag: { cat: 'rescue', art: 'diag', badge: 'Free', blurb: 'Not sure what’s wrong? A technician checks it and tells you the fix and price.', inc: ['Full hardware check', 'Written quote', 'No obligation to repair'] }
};
const STARS = r => r ? `<span class="stars" aria-label="Rated ${r} out of 5">${ic('star', 14)}<b>${r.toFixed(1)}</b></span>` : `<span class="stars none">New</span>`;

/* ---------- layers (modal / drawer) ---------- */
const LAYERS = [];
function openLayer(name, html, after, kind = 'modal') {
  closeLayer(true);
  const w = document.createElement('div'); w.className = 'layer ' + kind; w.id = 'layer-' + name;
  w.innerHTML = `<div class="layer-scrim" data-close-layer></div>${html}`; document.body.appendChild(w);
  LAYERS.push({ w, from: document.activeElement }); document.body.classList.add('locked');
  after && after(w); requestAnimationFrame(() => { w.classList.add('on'); const f = w.querySelector('h2'); if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); } });
  w.addEventListener('click', e => { if (e.target.closest('[data-close-layer]')) closeLayer(); });
  w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeLayer(); } if (e.key === 'Tab') trapTab(e, w); });
}
function closeLayer(instant) {
  const l = LAYERS.pop(); if (!l) return; document.body.classList.remove('locked');
  l.w.classList.remove('on'); setTimeout(() => l.w.remove(), instant ? 0 : 260);
  if (!instant && l.from && l.from.isConnected) l.from.focus({ preventScroll: true });
}
function trapTab(e, w) { const f = $$('button:not([disabled]),a[href],input:not([type=hidden]),select,textarea', w).filter(x => x.offsetParent !== null); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }

/* ---------- state ---------- */
const Shop = {
  dev: null, cat: 'all', sort: 'popular', q: '', cart: { items: [], addons: [] },
  load() {
    try { const d = JSON.parse(localStorage.getItem('site:dev') || 'null'); this.dev = d && (MODELS.find(m => m.id === d.id) || d); } catch (e) { }
    if (!this.dev) { const me = Acc.me(); const p = me && (me.devices.find(d => d.primary) || me.devices[0]); this.dev = p ? devFrom(p) : MODELS.find(m => m.id === 'ip13'); }
    try { const c = JSON.parse(localStorage.getItem('site:cart') || 'null'); if (c && Array.isArray(c.items)) this.cart = c; } catch (e) { }
  },
  save() { localStorage.setItem('site:dev', JSON.stringify(this.dev)); localStorage.setItem('site:cart', JSON.stringify(this.cart)); this.badge(); },
  setDevice(d) { if (!d) return; const changed = !this.dev || this.dev.model !== d.model; this.dev = d; this.save(); if (changed) { document.dispatchEvent(new CustomEvent('site:device')); if (this.cart.items.length) say(`${ic('info', 18)}<span>Prices updated for <b>${esc(d.model)}</b></span>`); } },
  count() { return this.cart.items.length + sum(this.cart.addons, a => a.qty); },
  has(id) { return this.cart.items.some(i => i.id === id); },
  changed() { this.save(); document.dispatchEvent(new CustomEvent('site:cart')); if ($('#cartDrawer')) this.drawCart(); },
  add(id, q = 'compatible', silent) {
    const ex = this.cart.items.find(i => i.id === id); const qq = GRADED.includes(id) ? (q === 'std' ? 'compatible' : q) : 'std';
    if (ex) ex.q = qq; else this.cart.items.push({ id, q: qq });
    this.changed(); if (!silent) say(`${ic('okCircle', 18)}<span><b>${svcById(id).name}</b> added</span><button type="button" class="t-act" data-open-cart>View booking</button>`);
  },
  remove(id) { this.cart.items = this.cart.items.filter(i => i.id !== id); this.changed(); },
  addAddon(itemId, qty = 1, silent) { const ex = this.cart.addons.find(a => a.itemId === itemId); const it = Bridge.addons().find(a => a.id === itemId); if (!it) return; const want = (ex ? ex.qty : 0) + qty; if (want > it.stock) return say(`${ic('alert', 18)}<span>Only ${it.stock} left in stock</span>`); if (ex) ex.qty = want; else this.cart.addons.push({ itemId, qty }); this.changed(); if (!silent && !ex) say(`${ic('okCircle', 18)}<span><b>${esc(it.name)}</b> added</span><button type="button" class="t-act" data-open-cart>View booking</button>`); },
  setAddon(itemId, qty) { if (qty <= 0) this.cart.addons = this.cart.addons.filter(a => a.itemId !== itemId); else { const ex = this.cart.addons.find(a => a.itemId === itemId); if (ex) ex.qty = qty; } this.changed(); },
  lines() {
    const ad = Bridge.addons();
    const svc = this.cart.items.map(i => { const s = svcById(i.id); return { kind: 'svc', id: i.id, q: i.q, name: s.name, sub: GRADED.includes(i.id) ? GRADES[i.q][0] : s.time, price: svcPrice(s, this.dev, i.q), art: META[i.id].art }; });
    const adds = this.cart.addons.map(a => { const it = ad.find(x => x.id === a.itemId); return it && { kind: 'addon', id: a.itemId, qty: a.qty, name: it.name, sub: it.stock < 10 ? `Only ${it.stock} left` : 'In stock', price: it.price * a.qty, unit: it.price, stock: it.stock, art: addonArt(it.name) }; }).filter(Boolean);
    return { svc, adds, sub: sum(svc, l => l.price) + sum(adds, l => l.price) };
  },
  badge() { const n = this.count(); $$('[data-cart-count]').forEach(b => { b.textContent = n; b.hidden = !n; }); },

  /* ---------- product cards ---------- */
  products(cat = this.cat) {
    const d = this.dev; let list;
    if (cat === 'addons') list = Bridge.addons().map(a => ({ type: 'addon', id: a.id, name: a.name, price: a.price, stock: a.stock, warranty: a.warranty, art: addonArt(a.name) }));
    else list = SERVICES.filter(s => cat === 'all' || META[s.id].cat === cat).map(s => ({ type: 'svc', id: s.id, s, name: s.name, price: fromPrice(s, d), art: META[s.id].art, m: META[s.id] }));
    const F = this.f || {};
    if (cat !== 'addons') {
      if (F.price) { const [lo, hi] = F.price.split('-').map(Number); list = list.filter(p => p.price >= lo && (!hi || p.price <= hi)); }
      if (F.same) list = list.filter(p => (p.s.days || 1) <= 1 && !/24/.test(p.s.time));
      if (F.stock) list = list.filter(p => stockLabel(p.id, d)[0] === 'ok');
      if (F.rate) list = list.filter(p => p.m.n && p.m.rating >= F.rate);
    }
    if (this.q) { const q = this.q.toLowerCase(); list = list.filter(p => (p.name + ' ' + (p.m ? p.m.blurb + ' ' + p.s.re.source : '')).toLowerCase().includes(q) || (p.s && p.s.re.test(q))); }
    if (this.sort === 'low') list.sort((a, b) => a.price - b.price);
    if (this.sort === 'high') list.sort((a, b) => b.price - a.price);
    if (this.sort === 'fast' && cat !== 'addons') { const mins = s => /24 h/.test(s.time) ? 1440 : /45/.test(s.time) ? 45 : /30/.test(s.time) ? 30 : parseInt(s.time) * 60; list.sort((a, b) => mins(a.s) - mins(b.s)); }
    if (this.sort === 'popular' && cat !== 'addons') list.sort((a, b) => (a.id === 'diag') - (b.id === 'diag') || b.m.n - a.m.n);
    return list;
  },
  card(p) {
    if (p.type === 'addon') { const inC = this.cart.addons.find(a => a.itemId === p.id);
      return `<article class="pcard" data-pid="addon:${p.id}"><a class="p-vis" href="repair.html?addon=${p.id}" tabindex="-1" aria-hidden="true">${art(p.art)}${p.stock < 10 ? `<span class="p-badge warn">Only ${p.stock} left</span>` : ''}</a>
        <div class="p-body"><span class="p-cat">Add-on · collect with your repair</span><h3><a href="repair.html?addon=${p.id}">${esc(p.name)}</a></h3><p class="p-meta">${p.warranty ? p.warranty + '-day warranty' : 'Checked before handover'} <span class="sep"></span> ${p.stock > 0 ? 'In stock' : 'Out of stock'}</p>
        <div class="p-foot"><span class="p-price">${fmtBDT(p.price)}</span>${inC ? `<div class="qty" aria-label="Quantity"><button type="button" data-addon-dec="${p.id}" aria-label="Remove one">${ic('minus', 16)}</button><b>${inC.qty}</b><button type="button" data-addon-inc="${p.id}" aria-label="Add one">${ic('plus', 16)}</button></div>` : `<button type="button" class="s-btn sm add" data-addon-add="${p.id}" ${p.stock ? '' : 'disabled'}>${ic('plus', 16)}Add</button>`}</div></div></article>`; }
    const inC = this.has(p.id), m = p.m, s = p.s, d = this.dev, free = s.id === 'diag';
    const lo = svcPrice(s, d, 'compatible'), hi = svcPrice(s, d, 'original'), range = GRADED.includes(s.id) && hi > lo;
    const btn = inC ? `<button type="button" class="s-btn sm added" data-remove="${p.id}" aria-label="Remove ${p.name} from booking">${ic('check', 16)}<span>Added</span></button>` : `<button type="button" class="s-btn sm" data-add="${p.id}" aria-label="Add ${p.name} to booking">${ic('plus', 16)}<span>Add</span></button>`;
    return `<article class="pcard rc ${inC ? 'incart' : ''}" data-pid="svc:${p.id}"><a class="p-vis" href="repair.html?id=${p.id}" tabindex="-1" aria-hidden="true">${art(p.art)}${m.badge ? `<span class="p-badge">${m.badge}</span>` : ''}</a>
      <div class="p-body"><div class="rc-top">${this.cat === 'all' ? `<span class="p-cat">${CATS.find(c => c[0] === m.cat)[1]}</span>` : '<span></span>'}${m.n ? `<span class="rc-rate">${ic('star', 13)}<b>${m.rating.toFixed(1)}</b><small>(${m.n})</small></span>` : ''}</div>
      <h3><a href="repair.html?id=${p.id}">${p.name}</a></h3>${(sl => `<span class="rc-st ${sl[0]}"><i></i>${sl[1]}</span>`)(stockLabel(s.id, d))}<p class="p-desc">${m.blurb}</p>
      <dl class="rc-facts"><div><dt>Time</dt><dd>${s.time}</dd></div><div><dt>Warranty</dt><dd>${s.warranty ? s.warranty + ' days' : 'None'}</dd></div><div><dt>Parts</dt><dd>${GRADED.includes(s.id) ? '2 grades' : free ? 'None' : '1 grade'}</dd></div></dl>
      <div class="p-foot"><span class="p-price">${free ? '<b>Free</b><small>no obligation</small>' : range ? `<b>${fmtBDT(lo)}</b><small>up to ${fmtBDT(hi)} original</small>` : `<b>${fmtBDT(lo)}</b><small>one price</small>`}</span>${btn}</div></div></article>`;
  },
  devPicker(id) {
    const brands = [...new Set(MODELS.map(m => m.brand))], d = this.dev, custom = !MODELS.some(m => m.model === d.model);
    return `<div class="dev-pick" role="group" aria-label="Your device"><span class="dp-ic">${ic('phoneDev', 20)}</span>
      <div class="dp-f"><label for="${id}B">Brand</label><div class="sel"><select id="${id}B" data-dev-brand>${brands.map(b => `<option ${b === d.brand ? 'selected' : ''}>${b}</option>`).join('')}${custom && !brands.includes(d.brand) ? `<option selected>${esc(d.brand)}</option>` : ''}</select>${ic('down', 18)}</div></div>
      <div class="dp-f"><label for="${id}M">Model</label><div class="sel"><select id="${id}M" data-dev-model>${custom ? `<option value="custom" selected>${esc(d.model)}</option>` : ''}${MODELS.filter(m => m.brand === d.brand).map(m => `<option value="${m.id}" ${m.model === d.model ? 'selected' : ''}>${m.model}</option>`).join('')}</select>${ic('down', 18)}</div></div></div>`;
  },

  /* ---------- home: featured ---------- */
  featured() {
    const el = $('#featGrid'); if (!el) return; const list = this.products('all').filter(p => p.id !== 'diag');
    el.innerHTML = list.map(p => this.card(p).replace('<article class="pcard', '<article role="listitem" class="pcard')).join(''); $$('[data-dev-name]').forEach(e => e.textContent = this.dev.model);
    if (el._car) { el._car(); return; }
    const dots = $('#featDots'), prev = $('[data-car="-1"]'), next = $('[data-car="1"]');
    const step = () => { const c = el.querySelector('.pcard'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || 20) : el.clientWidth; };
    const pages = () => Math.max(1, Math.round((el.scrollWidth - el.clientWidth) / step()) + 1);
    const sync = () => { const max = el.scrollWidth - el.clientWidth - 2; prev.disabled = el.scrollLeft <= 2; next.disabled = el.scrollLeft >= max;
      const n = pages(), i = Math.min(n - 1, Math.round(el.scrollLeft / step())); if (dots.children.length !== n) dots.innerHTML = '<i></i>'.repeat(n); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i)); };
    $$('[data-car]').forEach(b => b.addEventListener('click', () => el.scrollBy({ left: +b.dataset.car * step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })));
    el.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); (e.key === 'ArrowRight' ? next : prev).click(); } });
    let raf = 0; el.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    addEventListener('resize', sync); el._car = sync; requestAnimationFrame(sync);
  },

  /* ---------- catalog page ---------- */
  catalog() {
    const grid = $('#pGrid'); if (!grid) return; const list = this.products();
    $('#catTabs').innerHTML = CATS.map(([k, l]) => { const n = k === 'addons' ? Bridge.addons().length : SERVICES.filter(s => k === 'all' || META[s.id].cat === k).length; return `<button type="button" role="tab" aria-selected="${k === this.cat}" data-cat="${k}">${l}<span>${n}</span></button>`; }).join('');
    this.drawFilters && this.drawFilters();
    $('#pCount').innerHTML = `<b>${list.length}</b> ${this.cat === 'addons' ? (list.length === 1 ? 'add-on' : 'add-ons') : (list.length === 1 ? 'repair' : 'repairs')} for <b>${esc(this.dev.model)}</b>${this.q ? ` matching “${esc(this.q)}”` : ''}`;
    const board = this.view === 'board' && this.cat !== 'addons';
    grid.classList.toggle('as-board', board); $$('[data-view]').forEach(b => { b.setAttribute('aria-checked', String((b.dataset.view === 'board') === board)); b.disabled = this.cat === 'addons' && b.dataset.view === 'board'; });
    grid.innerHTML = list.length ? (board ? this.board(list) : list.map(p => this.card(p)).join('')) : `<div class="p-empty">${ic('search', 24)}<h3>${this.q ? `No repairs match “${esc(this.q)}”` : 'No repairs match these filters'}</h3><p>Or describe the problem, and the assistant will find the right repair.</p><div><button class="s-btn primary sm" type="button" data-ai-open data-ai-say="${esc(this.q)}">Ask the assistant</button><button class="s-btn sm" type="button" data-clear-q data-fx="all">Clear search & filters</button></div></div>`;
    $('#shopNote').hidden = this.cat !== 'addons'; $('#catDev').innerHTML = this.devPicker('cd'); $$('[data-svc-count]').forEach(e => e.textContent = SERVICES.length); $$('[data-dev-name]').forEach(e => e.textContent = this.dev.model);
  },
  board(list) {
    const d = this.dev, price = (p, s, q, cq) => `<button type="button" class="pb-p ${cq === q ? 'on' : ''}" aria-pressed="${cq === q}" data-add="${p.id}" data-q="${q}" aria-label="Add ${p.name}, ${q === 'original' ? 'original part' : 'premium compatible'}, ${fmtBDT(svcPrice(s, d, q))}">${fmtBDT(svcPrice(s, d, q))}</button>`;
    return `<div class="pb2" role="region" aria-label="Price board for ${esc(d.model)}" tabindex="0"><table class="pb2-t"><caption class="sr">Repair prices for ${esc(d.model)}</caption>
      <colgroup><col><col class="c-time"><col class="c-war"><col class="c-pr"><col class="c-pr"><col class="c-act"></colgroup>
      <thead><tr><th scope="col">Repair</th><th scope="col">Time</th><th scope="col">Warranty</th><th scope="col" class="r">Compatible</th><th scope="col" class="r">Original</th><th scope="col"><span class="sr">Book</span></th></tr></thead>
      <tbody>${list.map(p => { const s = p.s, inC = this.has(p.id), g = GRADED.includes(s.id), free = s.id === 'diag', cq = (this.cart.items.find(i => i.id === p.id) || {}).q;
      return `<tr class="${inC ? 'incart' : ''}"><th scope="row"><a href="repair.html?id=${p.id}"><span class="pb-ic">${ic(s.icon || 'wrench', 18)}</span><span class="pb-n"><b>${p.name}</b><small>${p.m.n ? `${ic('star', 12)}${p.m.rating.toFixed(1)} <i>·</i> ${p.m.n} review${p.m.n === 1 ? '' : 's'}` : 'No reviews yet'}</small></span></a></th>
        <td class="pb-tm" data-l="Time">${s.time}</td><td class="pb-wr" data-l="Warranty">${s.warranty ? s.warranty + ' days' : 'None'}</td>
        ${g ? `<td class="r pb-pc" data-l="Compatible">${price(p, s, 'compatible', cq)}</td><td class="r pb-pc" data-l="Original">${price(p, s, 'original', cq)}</td>`
          : `<td class="r pb-pc pb-1p" colspan="2" data-l="Price"><span class="pb-tag">${free ? 'No charge' : 'One price'}</span>${free ? '<span class="pb-p pb-free">Free</span>' : price(p, s, 'compatible', cq)}</td>`}
        <td class="r pb-act">${inC ? `<button type="button" class="s-btn sm added" data-remove="${p.id}" aria-label="Remove ${p.name}">${ic('check', 16)}<span>Added</span></button>` : `<button type="button" class="s-btn sm" data-add="${p.id}" aria-label="Add ${p.name}">${ic('plus', 16)}<span>Add</span></button>`}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="pb-note">${ic('info', 14)}Click a price to add that part. Prices are for <b>${esc(d.model)}</b>, parts and labour included.</p>`;
  },
  drawFilters() {
    const F = this.f = this.f || {}, add = this.cat === 'addons'; if (!$('#fPrice')) return;
    const PR = [['', 'Any'], ['0-1000', 'Under ৳1,000'], ['1000-3000', '৳1,000 – 3,000'], ['3000-8000', '৳3,000 – 8,000'], ['8000-', '৳8,000+']];
    $('#fPrice').innerHTML = PR.map(([v, l]) => `<button type="button" role="radio" aria-checked="${(F.price || '') === v}" data-fprice="${v}">${l}</button>`).join('');
    const rated = SERVICES.filter(x => META[x.id] && META[x.id].n), rn = r => r ? rated.filter(x => META[x.id].rating >= r).length : SERVICES.length;
    const stars = r => `<span class="rl-st" aria-hidden="true"><i>★★★★★</i><b style="width:${r / 5 * 100}%">★★★★★</b></span>`;
    $('#fRate').innerHTML = [0, 4.5, 4].map(r => `<button type="button" role="radio" aria-checked="${(F.rate || 0) === r}" data-frate="${r}" ${r && !rn(r) ? 'disabled' : ''}><span class="rl-r" aria-hidden="true"></span>${r ? `${stars(r)}<span class="rl-t">${r} & up</span>` : '<span class="rl-t">Any rating</span>'}<span class="rl-n">${rn(r)}</span></button>`).join('');
    $('#fSame').checked = !!F.same; $('#fStock').checked = !!F.stock;
    $$('.plp-side .ps-box').forEach((b, i) => { if (i > 1) b.classList.toggle('off', add); });
    const chips = []; if (F.price) chips.push(['price', PR.find(p => p[0] === F.price)[1]]); if (F.same) chips.push(['same', 'Same day']); if (F.stock) chips.push(['stock', 'In stock']); if (F.rate) chips.push(['rate', F.rate + '★ & up']);
    $('#fChips').innerHTML = chips.length && !add ? chips.map(([k, l]) => `<button type="button" data-fx="${k}">${l}${ic('x', 14)}</button>`).join('') + `<button type="button" class="fc-all" data-fx="all">Clear all</button>` : '';
    $('#fClear').hidden = !chips.length || add;
    const tg = $('#tipGrid'); if (tg && !tg.dataset.on && typeof GUIDES !== 'undefined') { tg.dataset.on = 1; tg.innerHTML = GUIDES.map(guideCard).join(''); }
  },
  initCatalog() {
    if (location.hash === '#addons') this.cat = 'addons';
    this.f = {};
    document.addEventListener('click', e => { const t = e.target; let hit = false;
      const p = t.closest('[data-fprice]'); if (p) { this.f.price = p.dataset.fprice; hit = true; }
      const r = t.closest('[data-frate]'); if (r) { this.f.rate = +r.dataset.frate; hit = true; }
      const x = t.closest('[data-fx]'); if (x) { if (x.dataset.fx === 'all') this.f = {}; else delete this.f[x.dataset.fx]; hit = true; }
      if (t.closest('#fClear')) { this.f = {}; hit = true; }
      if (t.closest('#fOpen')) { const sd = $('.plp-side'), on = !sd.classList.contains('open'); sd.classList.toggle('open', on); $('#fOpen').setAttribute('aria-expanded', String(on)); }
      if (hit) this.catalog(); });
    document.addEventListener('change', e => { if (e.target.id === 'fSame') { this.f.same = e.target.checked; this.catalog(); } if (e.target.id === 'fStock') { this.f.stock = e.target.checked; this.catalog(); } });
    this.view = sessionStorage.getItem('site:view') || 'grid';
    document.addEventListener('click', e => { const v = e.target.closest('[data-view]'); if (v && !v.disabled) { this.view = v.dataset.view; sessionStorage.setItem('site:view', this.view); this.catalog(); } });
    const s = $('#pSearch'); s.addEventListener('input', debounce(() => { this.q = s.value.trim(); this.catalog(); }, 160));
    $('#sortBy').onchange = e => { this.sort = e.target.value; this.catalog(); };
    $('#catTabs').addEventListener('keydown', e => { if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return; const i = CATS.findIndex(c => c[0] === this.cat) + (e.key === 'ArrowRight' ? 1 : -1); this.cat = CATS[(i + CATS.length) % CATS.length][0]; this.catalog(); $(`#catTabs [data-cat="${this.cat}"]`).focus(); });
    document.addEventListener('click', e => { const c = e.target.closest('[data-cat]'); if (c) { this.cat = c.dataset.cat; history.replaceState(null, '', this.cat === 'addons' ? '#addons' : location.pathname + location.search); this.catalog(); } if (e.target.closest('[data-clear-q]')) { s.value = ''; this.q = ''; this.catalog(); s.focus(); } });
    ['site:cart', 'site:device'].forEach(ev => document.addEventListener(ev, () => this.catalog()));
    this.catalog();
  },

  /* ---------- product page ---------- */
  initProduct() {
    const root = $('#pdp'); const id = qs('id'), aid = qs('addon');
    const draw = () => {
      if (aid) { const a = Bridge.addons().find(x => x.id === aid); if (!a) return root.innerHTML = this.notFound(); const inC = this.cart.addons.find(x => x.itemId === a.id);
        document.title = a.name + ' | Dhanmondi Mobile Care';
        root.innerHTML = `${this.crumbs('Add-ons', 'repairs.html#addons', a.name)}<div class="pdp-grid"><div class="pdp-vis"><div class="pv-main">${art(addonArt(a.name))}</div></div>
          <div class="pdp-info"><span class="p-cat">Add-on · collect with your repair</span><h1>${esc(a.name)}</h1><p class="pdp-price"><b>${fmtBDT(a.price)}</b><small>${a.stock} in stock</small></p>
          <p class="pdp-desc">Reserved from our shelf when you book and handed over with your phone. Pay for both when you collect. You can remove it any time before your visit.</p>
          <ul class="pdp-inc"><li>${ic('okCircle', 16)}${a.warranty ? a.warranty + '-day replacement warranty' : 'Checked before handover'}</li><li>${ic('okCircle', 16)}Fitted free if it’s a protector or case</li><li>${ic('okCircle', 16)}Live stock from our ${esc(SHOP.branches[0].name)} shelf</li></ul>
          <div class="pdp-act">${inC ? `<div class="qty lg"><button type="button" data-addon-dec="${a.id}" aria-label="Remove one">${ic('minus', 18)}</button><b>${inC.qty}</b><button type="button" data-addon-inc="${a.id}" aria-label="Add one">${ic('plus', 18)}</button></div><button class="s-btn primary lg" type="button" data-open-cart>View booking</button>` : `<button class="s-btn primary lg" type="button" data-addon-add="${a.id}" ${a.stock ? '' : 'disabled'}>${ic('plus', 18)}Add to booking</button>`}</div>
          <p class="pdp-note">${ic('info', 16)}Add-ons are collected with a repair or a free check.</p></div></div>`;
        return this.related(null); }
      const s = svcById(id); if (!s) return root.innerHTML = this.notFound(); const m = META[id], d = this.dev, cur = (this.cart.items.find(i => i.id === id) || {}).q || this.pq || 'compatible', graded = GRADED.includes(id), inC = this.has(id);
      document.title = `${s.name} for ${d.model} | Dhanmondi Mobile Care`;
      root.innerHTML = `${this.crumbs(CATS.find(c => c[0] === m.cat)[1], 'repairs.html', s.name)}<div class="pdp-grid"><div class="pdp-vis"><div class="pv-main">${art(m.art)}${m.badge ? `<span class="p-badge">${m.badge}</span>` : ''}</div>
          <div class="pv-trust"><span>${ic('diag', 18)}Free check first</span><span>${ic('wallet', 18)}Pay after repair</span><span>${ic('shield', 18)}${s.warranty ? s.warranty + '-day warranty' : 'No-fix, no-fee'}</span></div></div>
        <div class="pdp-info"><span class="p-cat">${CATS.find(c => c[0] === m.cat)[1]}</span><h1>${s.name}</h1><p class="pdp-rate">${STARS(m.rating)}<span>${m.n ? m.n + ' reviews' : 'No reviews yet'}</span><span class="sep"></span>${ic('clock', 14)}<span>${s.time}</span></p>
          <p class="pdp-price"><b id="pdpPrice">${s.id === 'diag' ? 'Free' : fmtBDT(svcPrice(s, d, cur))}</b>${s.id === 'diag' ? '' : '<small>parts + labour, for your model</small>'}</p>
          <p class="pdp-desc">${m.blurb}</p>
          <div class="pdp-dev">${this.devPicker('pd')}</div>
          ${graded ? `<fieldset class="pv-opts"><legend>Choose your part</legend>${['compatible', 'original'].map(q => `<label class="opt ${q === cur ? 'on' : ''}"><input type="radio" name="pvq" value="${q}" ${q === cur ? 'checked' : ''}><span class="o-t"><b>${GRADES[q][0]}</b><small>${GRADES[q][1]}</small></span><span class="o-p">${fmtBDT(svcPrice(s, d, q))}</span></label>`).join('')}</fieldset>` : ''}
          <div class="pdp-act"><button class="s-btn primary lg" type="button" data-pd-add>${inC ? ic('check', 18) + 'Update booking' : ic('plus', 18) + 'Add to booking'}</button><button class="s-btn lg" type="button" data-pd-now>Book now</button></div>
          <p class="pdp-note">Not sure it’s the right fix? <button type="button" class="lnk" data-ai-open data-ai-say="${esc(d.model + ' ' + s.name.toLowerCase())}">Ask the assistant</button></p></div></div>
        <div class="pdp-more"><section><h2>What’s included</h2><ul class="pdp-inc">${m.inc.map(x => `<li>${ic('okCircle', 16)}${x}</li>`).join('')}<li>${ic('okCircle', 16)}Your data stays on the device</li></ul></section>
          <section><h2>How it works</h2><ol class="pdp-steps"><li><i>1</i><div><b>Book online</b><small>Pick a time, drop off or courier pickup</small></div></li><li><i>2</i><div><b>Free check</b><small>We confirm the fault and the final price</small></div></li><li><i>3</i><div><b>Repair & test</b><small>Usually ${s.time.toLowerCase()}</small></div></li><li><i>4</i><div><b>Collect & pay</b><small>${s.warranty ? s.warranty + '-day written warranty' : 'Pay nothing if we can’t fix it'}</small></div></li></ol></section>
          <section><h2>Good to know</h2><details><summary>Will I lose my data?${ic('plus', 18)}</summary><p>No. ${s.id === 'software' ? 'we back up before any reset whenever the phone allows it.' : 'this repair doesn’t touch your storage. We never need your account passwords.'}</p></details><details><summary>What if the price changes?${ic('plus', 18)}</summary><p>We call you before any extra work. If you say no, you pay nothing and take your phone back.</p></details><details><summary>Can I wait in the shop?${ic('plus', 18)}</summary><p>Yes, for repairs under two hours. There’s seating and Wi-Fi at both branches.</p></details></section></div>
        <div class="pdp-bar" aria-hidden="true"><div><small>${esc(d.model)}</small><b id="pdpBarPrice">${s.id === 'diag' ? 'Free' : fmtBDT(svcPrice(s, d, cur))}</b></div><button class="s-btn primary" type="button" data-pd-add tabindex="-1">${inC ? 'Update' : 'Add to booking'}</button></div>`;
      this.related(id);
    };
    root.addEventListener('change', e => { if (e.target.name !== 'pvq') return; this.pq = e.target.value; const s = svcById(id); $$('.pv-opts .opt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); $('#pdpPrice').textContent = $('#pdpBarPrice').textContent = fmtBDT(svcPrice(s, this.dev, e.target.value)); });
    root.addEventListener('click', e => { const q = () => (root.querySelector('[name=pvq]:checked') || {}).value || 'std';
      if (e.target.closest('[data-pd-add]')) { this.add(id, q()); draw(); }
      if (e.target.closest('[data-pd-now]')) { this.add(id, q(), true); location.href = 'checkout.html'; } });
    ['site:cart', 'site:device'].forEach(ev => document.addEventListener(ev, draw)); draw();
  },
  crumbs(cat, href, name) { return `<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a>${ic('right', 14)}<a href="repairs.html">Repairs</a>${ic('right', 14)}<a href="${href}">${cat}</a>${ic('right', 14)}<span aria-current="page">${esc(name)}</span></nav>`; },
  notFound() { return `<div class="p-empty">${ic('search', 24)}<h3>We couldn’t find that repair</h3><p>It may have moved. Browse all repairs instead.</p><div><a class="s-btn primary sm" href="repairs.html">Browse repairs</a></div></div>`; },
  related(id) { const el = $('#related'); if (!el) return; const list = this.products('all').filter(p => p.id !== id && p.id !== 'diag').slice(0, 3); el.innerHTML = list.map(p => this.card(p)).join(''); },

  /* ---------- booking bag ---------- */
  openCart() { openLayer('cart', `<aside class="drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-labelledby="cartTitle"></aside>`, () => this.drawCart(), 'side'); },
  drawCart() {
    const el = $('#cartDrawer'); if (!el) return; const L = this.lines(), d = this.dev;
    const sugg = Bridge.addons().filter(a => a.stock > 0 && !this.cart.addons.some(x => x.itemId === a.id) && (this.has('screen') ? /glass/i.test(a.name) : true)).slice(0, 2);
    el.innerHTML = `<header class="dr-h"><div><h2 id="cartTitle">Your booking</h2><p>${ic('phoneDev', 14)}<span>${esc(d.model)}</span> · one device per booking</p></div><button class="x" type="button" data-close-layer aria-label="Close">${ic('x', 20)}</button></header>
      <div class="dr-b">${!L.svc.length && !L.adds.length ? `<div class="dr-empty"><span>${ic('cart', 24)}</span><h3>Nothing added yet</h3><p>Pick a repair for your ${esc(d.model)}, or describe the problem and the assistant will choose for you.</p><div><a class="s-btn primary sm" href="repairs.html">Browse repairs</a><button class="s-btn sm" type="button" data-cart-ai>Ask the assistant</button></div></div>` :
      `<ul class="lines">${L.svc.concat(L.adds).map(l => `<li><span class="l-art">${art(l.art)}</span><div class="l-t"><b>${esc(l.name)}</b><small class="${/Only/.test(l.sub) ? 'warn' : ''}">${esc(l.sub)}</small>${l.kind === 'svc' && GRADED.includes(l.id) ? `<a class="lnk sm" href="repair.html?id=${l.id}">Change part</a>` : ''}</div><div class="l-r"><b>${l.price ? fmtBDT(l.price) : 'Free'}</b>${l.kind === 'addon' ? `<div class="qty sm"><button type="button" data-addon-dec="${l.id}" aria-label="Remove one">${ic('minus', 14)}</button><b>${l.qty}</b><button type="button" data-addon-inc="${l.id}" aria-label="Add one">${ic('plus', 14)}</button></div>` : `<button type="button" class="rm" data-remove="${l.id}" aria-label="Remove ${esc(l.name)}">Remove</button>`}</div></li>`).join('')}</ul>
      ${!L.svc.length ? `<div class="dr-need">${ic('info', 16)}<p>Add-ons are collected with a repair. <button type="button" class="lnk" data-add-free>Add a free check</button> or pick a repair.</p></div>` : ''}
      ${sugg.length ? `<div class="dr-sugg"><h4>Often added</h4>${sugg.map(a => `<div class="sg-i"><span class="l-art">${art(addonArt(a.name))}</span><div><b>${esc(a.name)}</b><small>${fmtBDT(a.price)}</small></div><button type="button" class="s-btn sm" data-addon-add="${a.id}" data-silent>${ic('plus', 16)}Add</button></div>`).join('')}</div>` : ''}`}</div>
      ${L.svc.length || L.adds.length ? `<footer class="dr-f"><div class="tot"><span>Estimated total</span><b>${fmtBDT(L.sub)}</b></div><p>Final price confirmed after a free check. Pay at collection.</p>${L.svc.length ? `<a class="s-btn primary block lg" href="checkout.html">Continue to booking${ic('right', 18)}</a>` : `<button class="s-btn primary block lg" type="button" disabled>Continue to booking</button>`}</footer>` : ''}`;
  },

  /* ---------- global wiring ---------- */
  wire() {
    document.addEventListener('change', e => { const t = e.target;
      if (t.matches('[data-dev-brand]')) { const m = MODELS.find(x => x.brand === t.value); this.setDevice(m); }
      if (t.matches('[data-dev-model]')) { const m = MODELS.find(x => x.id === t.value); if (m) this.setDevice(m); } });
    document.addEventListener('click', e => { const t = e.target;
      const a = t.closest('[data-add]'); if (a) return this.add(a.dataset.add, a.dataset.q || 'compatible');
      const r = t.closest('[data-remove]'); if (r) return this.remove(r.dataset.remove);
      const aa = t.closest('[data-addon-add]'); if (aa) return this.addAddon(aa.dataset.addonAdd, 1, aa.hasAttribute('data-silent'));
      const ai = t.closest('[data-addon-inc]'); if (ai) return this.addAddon(ai.dataset.addonInc);
      const ad = t.closest('[data-addon-dec]'); if (ad) { const x = this.cart.addons.find(q => q.itemId === ad.dataset.addonDec); return this.setAddon(ad.dataset.addonDec, x ? x.qty - 1 : 0); }
      if (t.closest('[data-open-cart]')) { $('#toast') && $('#toast').classList.remove('on'); return this.openCart(); }
      if (t.closest('[data-add-free]')) return this.add('diag', 'std', true);
      if (t.closest('[data-cart-ai]')) { closeLayer(); return AI.open(); } });
    document.addEventListener('site:device', () => this.featured()); document.addEventListener('site:cart', () => this.featured());
  }
};

/* ================= CHECKOUT PAGE ================= */
const PAYS = [['Cash', 'wallet', 'Pay at the counter'], ['bKash', 'phoneDev', 'Scan or send at collection'], ['Nagad', 'phoneDev', 'Scan or send at collection'], ['Card', 'card', 'Visa, Mastercard, Amex']];
const Checkout = {
  st: null, done: null,
  init() {
    const me = Acc.me(); const saved = JSON.parse(sessionStorage.getItem('site:ck') || 'null');
    const addr = me && (me.addresses.find(a => a.primary) || me.addresses[0]);
    this.st = Object.assign({ step: 1, handoff: 'dropoff', branch: 'Main branch', addrId: addr ? addr.id : 'new', address: '', saveAddr: true, slot: null, name: me ? me.name : '', phone: me ? me.phone : '', email: me ? me.email : '', note: '', sms: true, pay: 'Cash', agree: false }, saved || {}, { step: 1 });
    if (me) Object.assign(this.st, { name: me.name, phone: me.phone, email: me.email });
    const m = $('#ckMain'); m.addEventListener('click', e => this.click(e)); m.addEventListener('change', e => this.change(e)); m.addEventListener('submit', e => this.submit(e));
    m.addEventListener('input', e => { const f = e.target.closest('.f'); f && f.classList.remove('bad'); this.read(); });
    m.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('cs-d')) this.sumOpen = e.target.open; }, true);
    ['site:cart', 'site:device'].forEach(ev => document.addEventListener(ev, () => { if (!this.done) this.draw(); }));
    this.draw();
  },
  persist() { const { step, ...rest } = this.st; sessionStorage.setItem('site:ck', JSON.stringify(rest)); },
  read() { const w = $('#ckMain'); if (!w || this.done) return; const v = n => { const el = w.querySelector(`[name="${n}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    ['address', 'name', 'phone', 'email', 'note'].forEach(k => { const x = v(k); if (x !== undefined) this.st[k] = typeof x === 'string' ? x.trimStart() : x; }); ['sms', 'agree', 'saveAddr'].forEach(k => { const x = v(k); if (x !== undefined) this.st[k] = x; }); this.persist(); },
  pickupAddr() { const me = Acc.me(), st = this.st; if (me && st.addrId !== 'new') { const a = me.addresses.find(x => x.id === st.addrId); if (a) return a.line + ', ' + a.area; } return st.address.trim(); },
  summary() {
    const L = this.done ? this.receipt.lines : Shop.lines(), fee = this.st.handoff === 'pickup' ? PICKUP_FEE : 0, d = this.done ? this.receipt.dev : Shop.dev;
    const wide = matchMedia('(min-width: 961px)').matches, tk = n => fmtBDT(n) === 'Free' ? '৳0' : fmtBDT(n), grand = tk(L.sub + fee);
    return `<aside class="ck-sum" aria-label="Order summary"><details class="cs-d" ${wide || this.sumOpen ? 'open' : ''}><summary>${ic('cart', 18)}<span>Booking summary</span><b>${grand}</b>${ic('down', 16)}</summary><div class="cs-in"><div class="cs-dev"><span class="l-art">${art('screen')}</span><div><small>Device</small><b>${esc(d.model)}</b></div></div>
      <ul class="cs-lines">${L.svc.concat(L.adds).map(l => `<li><span class="l-art">${art(l.art)}${l.qty > 1 ? `<i>${l.qty}</i>` : ''}</span><div><b>${esc(l.name)}</b><small>${esc(l.kind === 'svc' ? l.sub : 'Add-on')}</small></div><span>${l.price ? fmtBDT(l.price) : 'Free'}</span></li>`).join('')}</ul>
      <dl class="cs-tot"><div><dt>Repairs & add-ons</dt><dd>${tk(L.sub)}</dd></div><div><dt>${this.st.handoff === 'pickup' ? 'Courier pickup & return' : 'Drop-off'}</dt><dd>${fee ? fmtBDT(fee) : 'Free'}</dd></div><div><dt>Diagnosis</dt><dd>Free</dd></div><div class="grand"><dt>Estimated total</dt><dd>${grand}</dd></div></dl>
      <p class="cs-note">${ic('secure', 16)}<span>Pay nothing now. If the check finds a different fault, we call you first. You can say no and pay nothing.</span></p></div></details></aside>`;
  },
  sec(n, title, body, sumLine) {
    const s = this.st.step, state = n < s ? 'done' : n === s ? 'open' : 'next';
    return `<section class="ck-sec ${state}" aria-labelledby="ckS${n}"><header><span class="n">${n < s ? ic('check', 14) : n}</span><h2 id="ckS${n}">${title}</h2>${state === 'done' ? `<button type="button" class="lnk sm" data-ck-go="${n}" aria-label="Edit ${title}">Edit</button>` : ''}</header>${state === 'done' ? `<p class="ck-line">${sumLine}</p>` : state === 'open' ? `<form class="ck-body" novalidate data-ck-step="${n}">${body}<div class="ck-nav">${n === 4 ? '' : `<button class="s-btn primary" type="submit">Continue${ic('right', 18)}</button>`}</div></form>` : ''}</section>`;
  },
  draw(focus) {
    const m = $('#ckMain'); if (this.done) return this.drawDone();
    const L = Shop.lines(); if (!L.svc.length) { m.innerHTML = `<div class="ck-empty">${ic('cart', 28)}<h1>Your booking is empty</h1><p>Add a repair to continue, or describe the problem and the assistant will set it up.</p><div><a class="s-btn primary" href="repairs.html">Browse repairs</a><button class="s-btn" type="button" data-ai-open>Ask the assistant</button></div></div>`; return; }
    const st = this.st, me = Acc.me(), days = slotDays(5), day = (st.slot && days.find(x => x.date === st.slot.date)) || days[0], br = SHOP.branches.find(b => b.id === st.branch);
    const s1 = `<div class="ck-dev">${Shop.devPicker('ck')}</div><ul class="ck-items">${L.svc.map(l => `<li><span class="l-art">${art(l.art)}</span><div><b>${l.name}</b><small>${l.sub}</small></div><span>${l.price ? fmtBDT(l.price) : 'Free'}</span><button type="button" class="rm" data-remove="${l.id}">Remove</button></li>`).join('')}</ul><a class="lnk sm add-more" href="repairs.html">${ic('plus', 14)}Add another repair or add-on</a>
      <div class="f"><label for="ckNote">What’s happening with your phone? <span class="opt-l">Optional</span></label><textarea id="ckNote" name="note" rows="3" maxlength="200" placeholder="e.g. Dropped it on Tuesday. Touch still works but there are green lines on the left.">${esc(st.note)}</textarea><p class="f-h">Helps your technician prepare the right part before you arrive.</p></div>`;
    const addrBlock = st.handoff !== 'pickup' ? '' : me && me.addresses.length ? `<fieldset class="ck-addrs"><legend class="f-lab">Pickup address</legend>${me.addresses.map(a => `<label class="opt ${st.addrId === a.id ? 'on' : ''}"><input type="radio" name="addr" value="${a.id}" ${st.addrId === a.id ? 'checked' : ''}><span class="o-ic">${ic('mapPin', 18)}</span><span class="o-t"><b>${esc(a.label)}</b><small>${esc(a.line)}, ${esc(a.area)}</small></span></label>`).join('')}<label class="opt ${st.addrId === 'new' ? 'on' : ''}"><input type="radio" name="addr" value="new" ${st.addrId === 'new' ? 'checked' : ''}><span class="o-ic">${ic('plus', 18)}</span><span class="o-t"><b>A different address</b></span></label></fieldset>${st.addrId === 'new' ? `<div class="f"><label for="ckAddr">New address</label><input id="ckAddr" name="address" autocomplete="street-address" value="${esc(st.address)}" placeholder="House, road, area"><p class="f-e"></p></div><label class="check"><input type="checkbox" name="saveAddr" ${st.saveAddr ? 'checked' : ''}><span>Save to my account</span></label>` : ''}`
      : `<div class="f"><label for="ckAddr">Pickup address</label><input id="ckAddr" name="address" autocomplete="street-address" value="${esc(st.address)}" placeholder="House, road, area"><p class="f-e"></p></div>`;
    const s2 = `<fieldset class="ck-hand"><legend class="sr">How we get your phone</legend>${SHOP.branches.map(b => `<label class="opt ${st.handoff === 'dropoff' && st.branch === b.id ? 'on' : ''}"><input type="radio" name="hand" value="drop|${b.id}" ${st.handoff === 'dropoff' && st.branch === b.id ? 'checked' : ''}><span class="o-ic">${ic('building', 18)}</span><span class="o-t"><b>Drop off at ${b.name}</b><small>${b.addr}</small></span><span class="o-p">Free</span></label>`).join('')}<label class="opt ${st.handoff === 'pickup' ? 'on' : ''}"><input type="radio" name="hand" value="pickup" ${st.handoff === 'pickup' ? 'checked' : ''}><span class="o-ic">${ic('truck', 18)}</span><span class="o-t"><b>Courier pickup & return</b><small>Anywhere inside Dhaka · sealed, tagged bag</small></span><span class="o-p">${fmtBDT(PICKUP_FEE)}</span></label></fieldset>${addrBlock}
      <div class="ck-time"><p class="f-lab">${st.handoff === 'pickup' ? 'Pickup time' : 'Drop-off time'}</p><div class="seg days" role="radiogroup" aria-label="Day">${days.map(x => `<button type="button" role="radio" aria-checked="${x.date === day.date}" data-ckday="${x.date}">${x.label}</button>`).join('')}</div><div class="times">${day.times.map(t => `<button type="button" data-cktime="${day.date}|${t}" aria-pressed="${!!(st.slot && st.slot.date === day.date && st.slot.time === t)}">${t}</button>`).join('')}</div><p class="f-e" id="ckSlotErr"></p></div>`;
    const s3 = `${me ? `<div class="ck-me">${avatarHtml(me.name, 36)}<div><b>Booking as ${esc(me.name)}</b><small>Filled in from your account. Edit them for this booking if needed.</small></div></div>` : `<div class="ck-me guest">${ic('user', 20)}<div><b>Have an account?</b><small><a class="lnk" href="signin.html?next=checkout.html">Sign in</a> to use your saved details, or continue as a guest.</small></div></div>`}
      <div class="f-2"><div class="f"><label for="ckName">Full name</label><input id="ckName" name="name" autocomplete="name" value="${esc(st.name)}" placeholder="Rafiq Ahmed"><p class="f-e"></p></div><div class="f"><label for="ckPhone">Mobile number</label><input id="ckPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(st.phone)}" placeholder="01XXXXXXXXX"><p class="f-e"></p></div></div>
      <div class="f"><label for="ckEmail">Email <span class="opt-l">Optional, for your receipt</span></label><input id="ckEmail" name="email" type="email" autocomplete="email" value="${esc(st.email)}" placeholder="you@example.com"><p class="f-e"></p></div>
      <label class="check"><input type="checkbox" name="sms" ${st.sms ? 'checked' : ''}><span>Text me when the status changes</span></label>`;
    const s4 = `<fieldset class="ck-pay"><legend class="f-lab">How you’ll pay at collection</legend>${PAYS.map(([k, i, d]) => `<label class="opt ${st.pay === k ? 'on' : ''}"><input type="radio" name="pay" value="${k}" ${st.pay === k ? 'checked' : ''}><span class="o-ic">${ic(i, 18)}</span><span class="o-t"><b>${k}</b><small>${d}</small></span></label>`).join('')}</fieldset>
      <div class="ck-review"><h3>Check your booking</h3><dl><div><dt>Device</dt><dd>${esc(Shop.dev.model)}</dd></div><div><dt>${st.handoff === 'pickup' ? 'Pickup' : 'Drop-off'}</dt><dd>${st.handoff === 'pickup' ? esc(this.pickupAddr()) : br.name + ' branch'}</dd></div><div><dt>When</dt><dd>${fmtSlot(st.slot)}</dd></div><div><dt>Contact</dt><dd>${esc(st.name)} · ${esc(st.phone)}</dd></div></dl></div>
      <label class="check agree"><input type="checkbox" name="agree" ${st.agree ? 'checked' : ''}><span>I understand the final price is confirmed after a free check, and no work starts without my approval.</span></label><p class="f-e" id="ckAgreeErr"></p>
      <button class="s-btn primary block lg" type="submit" data-confirm-ck>${ic('lock', 18)}Confirm booking</button>`;
    m.innerHTML = `<div class="ck-grid"><div class="ck-flow"><nav class="crumbs" aria-label="Breadcrumb"><a href="repairs.html">Repairs</a>${ic('right', 14)}<button type="button" class="lnk-plain" data-open-cart>Booking</button>${ic('right', 14)}<span aria-current="page">Checkout</span></nav><h1>Book your repair</h1><p class="ck-sub">Four short steps. You’ll get a repair code at the end.</p>
      ${this.sec(1, 'Your repair', s1, `${esc(Shop.dev.model)} · ${L.svc.map(l => esc(l.name)).join(', ')}${st.note ? ': “' + esc(st.note.slice(0, 50)) + (st.note.length > 50 ? '…' : '') + '”' : ''}`)}
      ${this.sec(2, 'Drop-off or pickup', s2, `${st.handoff === 'pickup' ? 'Courier pickup · ' + esc(this.pickupAddr()) : 'Drop off at ' + (br ? br.name : '')} · ${fmtSlot(st.slot)}`)}
      ${this.sec(3, 'Your details', s3, `${esc(st.name)} · ${esc(st.phone)}${st.email ? ' · ' + esc(st.email) : ''}`)}
      ${this.sec(4, 'Payment & confirm', s4, '')}</div>${this.summary()}</div>`;
    if (focus) { const h = m.querySelector('.ck-sec.open h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); h.closest('.ck-sec').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } }
  },
  drawDone() {
    const r = this.done, st = this.st, br = SHOP.branches.find(b => b.id === st.branch), me = Acc.me();
    $('#ckMain').innerHTML = `<div class="ck-grid"><div class="ck-flow ck-ok"><span class="ok-ic">${ic('okCircle', 30)}</span><p class="ok-k">Booking confirmed</p><h1 tabindex="-1" id="okTitle">Your repair code is <em>${esc(r.code)}</em></h1>
      <p class="ck-sub">We’ve saved it against ${esc(st.phone)}${st.sms ? ' and will text you at each step' : ''}. Keep this code. You need it to track and collect your phone.</p>
      <ol class="next"><li><i>1</i><div><b>${st.handoff === 'pickup' ? 'Courier collects your phone' : 'Drop off at ' + br.name}</b><small>${fmtSlot(st.slot)}${st.handoff === 'pickup' ? ' · ' + esc(r.addr) : ' · ' + br.addr}</small></div></li><li><i>2</i><div><b>Free check & final price</b><small>We call you before any work starts</small></div></li><li><i>3</i><div><b>Repair, test, hand back</b><small>Pay by ${esc(st.pay)} when you collect</small></div></li></ol>
      ${r.failed.length ? `<p class="warn-n">${ic('alert', 16)}${esc(r.failed.join(', '))} just sold out, so we left it off your booking.</p>` : ''}
      <div class="ok-a">${me ? `<a class="s-btn primary" href="account.html#booking=${esc(r.code)}">${ic('wrench', 18)}View in my account</a>` : `<a class="s-btn primary" href="index.html?track=${esc(r.code)}#track">${ic('search', 18)}Track this repair</a>`}<button class="s-btn" type="button" data-ck-ics>${ic('calendar', 18)}Add to calendar</button><button class="s-btn" type="button" data-ck-print>${ic('printer', 18)}Print receipt</button></div>
      ${me ? '' : Acc.find(st.phone) ? `<div class="save-acc"><div><b>You already have an account</b><p>Sign in to see this repair alongside your others.</p></div><a class="s-btn sm" href="signin.html?next=${encodeURIComponent('account.html#booking=' + r.code)}">Sign in</a></div>` : `<form class="save-acc" id="saveAcc" novalidate><div><b>Save your details for next time</b><p>Create an account with ${esc(st.phone)} to follow this repair, rebook in a tap and keep warranties in one place.</p></div>
        ${st.email ? '' : `<div class="f"><label for="saEmail">Email</label><input id="saEmail" name="email" type="email" autocomplete="email" placeholder="you@example.com"><p class="f-e"></p></div>`}${pwInput('saPw', 'pw', 'Choose a password', 'new-password')}${pwRulesHtml('saRules')}<button class="s-btn primary" type="submit">Create account</button></form>`}
      <a class="lnk" href="index.html">Back to the website</a></div>${this.summary()}</div>`;
    const sa = $('#saveAcc'); if (sa) { bindForm(sa); bindPwRules($('#saPw'), $('#saRules')); }
    $('#okTitle').focus({ preventScroll: true }); scrollTo({ top: 0 });
  },
  click(e) {
    const t = e.target, st = this.st;
    const g = t.closest('[data-ck-go]'); if (g) { this.read(); st.step = +g.dataset.ckGo; return this.draw(true); }
    const dy = t.closest('[data-ckday]'); if (dy) { this.read(); st.slot = st.slot && st.slot.date === dy.dataset.ckday ? st.slot : { date: dy.dataset.ckday, time: null }; this.draw(); $(`[data-ckday="${dy.dataset.ckday}"]`).focus(); return; }
    const tm = t.closest('[data-cktime]'); if (tm) { this.read(); const [date, time] = tm.dataset.cktime.split('|'); st.slot = { date, time }; this.persist(); this.draw(); $(`[data-cktime="${tm.dataset.cktime}"]`).focus(); return; }
    if (t.closest('[data-ck-ics]')) return downloadIcs(this.done.code, { ...st, address: this.done.addr, device: this.receipt.dev });
    if (t.closest('[data-ck-print]')) return this.print();
  },
  change(e) { const t = e.target, st = this.st;
    if (t.name === 'hand') { this.read(); const [h, b] = t.value.split('|'); st.handoff = h === 'pickup' ? 'pickup' : 'dropoff'; if (b) st.branch = b; this.persist(); this.draw(); $(`[name=hand][value="${t.value}"]`).focus(); }
    if (t.name === 'addr') { this.read(); st.addrId = t.value; this.persist(); this.draw(); $(`[name=addr][value="${t.value}"]`).focus(); }
    if (t.name === 'pay') { st.pay = t.value; this.persist(); $$('.ck-pay .opt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); } },
  err(id, msg) { const i = $('#' + id); i.closest('.f').classList.add('bad'); i.closest('.f').querySelector('.f-e').textContent = msg; i.focus(); },
  complete(n) { const st = this.st; if (n === 1) return true; if (n === 2) return !!(st.slot && st.slot.time) && (st.handoff !== 'pickup' || this.pickupAddr().length >= 8); if (n === 3) return st.name.length >= 2 && validPhone(st.phone); return false; },
  async submit(e) {
    e.preventDefault(); if (e.target.id === 'saveAcc') return this.saveAccount(e.target);
    this.read(); const st = this.st, n = st.step; $$('#ckMain .f.bad').forEach(x => x.classList.remove('bad'));
    if (n === 2) { if (st.handoff === 'pickup' && this.pickupAddr().length < 8) return this.err('ckAddr', 'Enter a full address so the courier can find you.'); if (!st.slot || !st.slot.time) { $('#ckSlotErr').textContent = 'Choose a time that suits you.'; return $('[data-cktime]').focus(); } }
    if (n === 3) { st.name = st.name.trim().replace(/\b\w/g, c => c.toUpperCase()); st.phone = normPhone(st.phone);
      if (st.name.length < 2) return this.err('ckName', 'Please enter your name.');
      if (!validPhone(st.phone)) return this.err('ckPhone', 'Enter an 11-digit mobile number, e.g. 01712345678.');
      if (st.email && !validEmail(st.email)) return this.err('ckEmail', 'Check the email, or leave it empty.'); }
    if (n < 4) { st.step = n + 1; while (st.step < 4 && this.complete(st.step)) st.step++; this.persist(); return this.draw(true); }
    if (!st.agree) { $('#ckAgreeErr').textContent = 'Please confirm you’ve read this.'; return $('[name=agree]').focus(); }
    if (!this.complete(2) || !this.complete(3)) { st.step = !this.complete(2) ? 2 : 3; return this.draw(true); }
    const btn = $('[data-confirm-ck]'); btn.disabled = true; btn.innerHTML = 'Booking…'; await new Promise(r => setTimeout(r, 450));
    const me = Acc.me(), addr = this.pickupAddr();
    if (me && st.handoff === 'pickup' && st.addrId === 'new' && st.saveAddr) { me.addresses.forEach(a => a.primary = false); const parts = addr.split(','); me.addresses.push({ id: uid('ad'), label: me.addresses.length ? 'Address ' + (me.addresses.length + 1) : 'Home', line: parts.slice(0, -1).join(',').trim() || addr, area: (parts.length > 1 ? parts[parts.length - 1] : '').trim(), primary: true }); Acc.update(me); }
    const r = Bridge.book({ source: 'checkout', accountId: me ? me.id : null, device: Shop.dev, items: Shop.cart.items.map(i => ({ id: i.id, q: i.q })), addons: Shop.cart.addons, handoff: st.handoff, branch: st.handoff === 'pickup' ? SHOP.branches[0].id : st.branch, address: addr, slot: st.slot, name: st.name, phone: st.phone, email: st.email, note: st.note, pay: st.pay, details: st.note.slice(0, 80) });
    r.addr = addr; this.done = r; this.receipt = { lines: Shop.lines(), st: { ...st }, dev: Shop.dev };
    Shop.cart = { items: [], addons: [] }; Shop.save(); sessionStorage.removeItem('site:ck'); history.replaceState(null, '', 'checkout.html?booked=' + r.code);
    this.drawDone();
  },
  async saveAccount(f) {
    const st = this.st, email = (f.email ? f.email.value : st.email).trim().toLowerCase(); let bad = null;
    if (!validEmail(email)) bad = bad || fErr(f, 'email', 'Enter a valid email'); if (!pwOk(f.pw.value)) bad = bad || fErr(f, 'pw', 'Use 8+ characters with a letter and a number'); if (bad) return bad.focus();
    if (Acc.find(email)) return fErr(f, f.email ? 'email' : 'pw', 'This email already has an account. Sign in instead.').focus();
    const a = await Acc.create({ name: st.name, email, phone: st.phone, password: f.pw.value }); if (st.handoff === 'pickup') { const parts = this.done.addr.split(','); a.addresses.push({ id: uid('ad'), label: 'Home', line: parts.slice(0, -1).join(',').trim() || this.done.addr, area: (parts.length > 1 ? parts[parts.length - 1] : '').trim(), primary: true }); Acc.update(a); }
    Acc.start(a); sessionStorage.setItem('site:welcome', 'Account created. Your repair is saved here.'); location.href = 'account.html#booking=' + this.done.code;
  },
  print() {
    const r = this.done, { lines, st, dev } = this.receipt, fee = st.handoff === 'pickup' ? PICKUP_FEE : 0;
    const rows = lines.svc.concat(lines.adds).map(l => `<tr><td>${esc(l.name)}${l.kind === 'svc' && GRADED.includes(l.id) ? `<br><small>${esc(l.sub)}</small>` : ''}${l.qty > 1 ? ' × ' + l.qty : ''}</td><td>${l.price ? fmtBDT(l.price) : 'Free'}</td></tr>`).join('') + (fee ? `<tr><td>Courier pickup & return</td><td>${fmtBDT(fee)}</td></tr>` : '');
    const html = `<!doctype html><title>${r.code}</title><style>body{font:14px/1.5 Inter,system-ui,sans-serif;color:#0B1324;max-width:560px;margin:40px auto;padding:0 24px}h1{font-size:22px;margin:0}small{color:#7A869C}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:10px 0;border-bottom:1px solid #E2E8F2;vertical-align:top}td:last-child{text-align:right}.t td{font-weight:600;border:0}.k{display:flex;justify-content:space-between;margin-top:6px}.c{font-size:28px;font-weight:600;color:#275FCE;letter-spacing:.02em}</style>
      <h1>Dhanmondi Mobile Care</h1><small>${esc(SHOP.branches[0].addr)} · ${esc(SHOP.phone)}</small><hr><div class="k"><span>Repair code</span><span class="c">${r.code}</span></div><div class="k"><span>Device</span><b>${esc(dev.model)}</b></div><div class="k"><span>${st.handoff === 'pickup' ? 'Pickup' : 'Drop-off'}</span><b>${fmtSlot(st.slot)}</b></div><div class="k"><span>Customer</span><b>${esc(st.name)} · ${esc(st.phone)}</b></div>
      <table>${rows}<tr class="t"><td>Estimated total</td><td>${fmtBDT(lines.sub + fee)}</td></tr></table><small>Estimate only. Final price confirmed after a free check; nothing is charged without your approval. Pay by ${esc(st.pay)} at collection.</small><script>print()<\/script>`;
    const w = window.open('', '_blank', 'width=640,height=800'); if (w) { w.document.write(html); w.document.close(); }
  }
};
