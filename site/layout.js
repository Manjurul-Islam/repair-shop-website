'use strict';
/* Shared website chrome: header, mobile menu, footer, toast, reveal, loops, boot. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE = document.body.dataset.page || 'home';
const onHome = PAGE === 'home';
const H = (anchor) => (onHome ? '' : 'index.html') + anchor;
const paintIcons = (root = document) => $$('[data-icon]', root).forEach(el => { if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', ic(el.dataset.icon, +(el.dataset.size || 18))); });
let toastT;
function say(msg) { const t = $('#toast'); t.innerHTML = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4600); t.onmouseenter = () => clearTimeout(toastT); t.onmouseleave = () => { toastT = setTimeout(() => t.classList.remove('on'), 1800); }; }
const go = sel => { const t = $(sel); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
const qs = k => new URLSearchParams(location.search).get(k);

function renderChrome() {
  const me = Acc.me();
  const acct = me
    ? `<div class="acct"><button class="acct-b" type="button" aria-haspopup="menu" aria-expanded="false" data-acct>${avatarHtml(me.name, 32)}<span class="acct-n">${esc(me.name.split(' ')[0])}</span>${ic('down', 16)}</button>
        <div class="acct-m" role="menu" hidden><div class="am-h">${avatarHtml(me.name, 36)}<div><b>${esc(me.name)}</b><small>${esc(me.phone)}</small></div></div>
        <a role="menuitem" href="account.html#overview">${ic('grid', 16)}Overview</a><a role="menuitem" href="account.html#bookings">${ic('wrench', 16)}My bookings</a><a role="menuitem" href="account.html#devices">${ic('phoneDev', 16)}Devices</a><a role="menuitem" href="account.html#profile">${ic('user', 16)}Profile</a><button role="menuitem" type="button" data-signout>${ic('logout', 16)}Sign out</button></div></div>`
    : `<a class="n-sign" href="signin.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash)}">${ic('user', 18)}<span>Sign in</span></a>`;
  const header = `<div class="wrap nav-in">
    <a href="index.html" class="brand" aria-label="Dhanmondi Mobile Care home">${LOGO(30)}<span>Dhanmondi <em>Mobile Care</em></span></a>
    <nav class="nav-links" aria-label="Main"><a href="repairs.html" ${['repairs', 'repair'].includes(PAGE) ? 'aria-current="page" class="on"' : ''}>Repairs & prices</a><a href="${H('#how')}" data-sec="how">How it works</a><a href="${H('#track')}" data-sec="track">Track a repair</a><a href="${H('#visit')}" data-sec="visit">Visit us</a></nav>
    <div class="nav-r"><button class="cart-b" type="button" data-open-cart aria-label="Your booking">${ic('cart', 20)}<b data-cart-count hidden>0</b></button>${acct}
      <a class="s-btn light sm nav-cta" href="${H('#book')}">Book a repair</a>
      <button class="nav-menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav">${ic('menu', 20)}</button></div></div>
    <div class="mnav" id="mnav" hidden><a href="repairs.html">Repairs & prices</a><a href="${H('#book')}">Book a repair</a><a href="${H('#how')}">How it works</a><a href="${H('#track')}">Track a repair</a><a href="${H('#visit')}">Visit us</a>
      ${me ? `<a href="account.html#overview">My account</a><a href="account.html#bookings">My bookings</a><button type="button" data-signout>Sign out</button>` : `<a href="signin.html">Sign in</a><a href="signin.html#signup">Create an account</a>`}<a href="${telHref(SHOP.phone)}">Call ${esc(SHOP.phone)}</a></div>`;
  const nav = $('#nav'); nav.className = 'nav' + (PAGE === 'home' ? '' : ' light static'); nav.innerHTML = header;
  const foot = $('#foot');
  if (foot) foot.innerHTML = `<div class="wrap">
    <div class="ft-top"><div class="ft-brand"><a href="index.html" class="brand">${LOGO(30)}<span>${esc(SHOP.name.split(' ')[0])} <em>${esc(SHOP.name.split(' ').slice(1).join(' '))}</em></span></a><p>Honest phone repairs${SHOP.since ? ' since ' + esc(SHOP.since) : ''}. Book online, follow every step, collect with a written warranty.</p>
      <div class="ft-social" aria-label="Social media">${footSocial()}</div></div>
      <nav class="ft-cols" aria-label="Footer"><div><h4>Repairs</h4><a href="repairs.html">All repairs & prices</a><a href="repair.html?id=screen">Screen replacement</a><a href="repair.html?id=battery">Battery replacement</a><a href="repairs.html#addons">Add-ons</a></div>
        <div><h4>Your booking</h4><a href="${H('#track')}">Track a repair</a><a href="account.html#bookings">My bookings</a><a href="${me ? 'account.html#overview' : 'signin.html'}">${me ? 'My account' : 'Sign in'}</a><a href="${H('#faq')}">FAQ</a></div>
        <div><h4>Visit</h4>${SHOP.branches.map(b => `<a href="${H('#visit')}">${esc(b.name)}</a>`).join('')}${SHOP.email ? `<a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a>` : ''}</div>
        <div><h4>Hours</h4>${SHOP.hours.map(h => `<span>${esc(h[0])}<br><b>${esc(h[1])}</b></span>`).join('')}</div></nav></div>
    <div class="ft-pay"><span>We accept</span><ul class="ps-list sm"><li class="pl-cash">Cash</li><li class="pl-bk">bKash</li><li class="pl-ng">Nagad</li><li class="pl-visa">VISA</li><li class="pl-mc"><i></i><i></i>Mastercard</li><li class="pl-amex">AMEX</li></ul></div>
    <div class="ft-bot"><span>© ${new Date().getFullYear()} ${esc(SHOP.name)}</span><span>Runs on <b>Benchly</b> · Demo site. Data stays in this browser</span></div></div>
    <div class="ft-mark" aria-hidden="true">${esc(SHOP.name.split(' ').slice(-2).join(' '))}</div>`;
  if (!$('.fab')) document.body.insertAdjacentHTML('beforeend', `<button class="fab" type="button" data-ai-open aria-label="Open repair assistant">${ic('chat', 20)}<span>Ask the assistant</span></button>`);
  if (!$('#toast')) document.body.insertAdjacentHTML('beforeend', `<div class="toast" id="toast" role="status" aria-live="polite"></div>`);
}
function avatarHtml(name, s = 32) { return `<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .38)}px" aria-hidden="true">${esc(initials(name))}</span>`; }

function initNav() {
  const nav = $('#nav'), menuB = $('.nav-menu'), m = $('#mnav');
  const darkEls = $$('[data-theme=dark]');
  const onScroll = () => {
    nav.classList.toggle('solid', scrollY > 16);
    if (PAGE === 'home') { const y = 36; const overDark = darkEls.some(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y && (el.id !== 'top' || r.bottom - y > innerHeight * .45); }); nav.classList.toggle('light', !overDark); }
    const fab = $('.fab'), ft = $('#foot'), nearFoot = ft && ft.getBoundingClientRect().top < innerHeight - 60; fab && fab.classList.toggle('on', !nearFoot && (PAGE !== 'home' || scrollY > innerHeight * .9) && !['checkout', 'signin'].includes(PAGE) && !document.body.classList.contains('ai-open'));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const setM = open => { m.hidden = !open; menuB.setAttribute('aria-expanded', String(open)); menuB.innerHTML = ic(open ? 'x' : 'menu', 20); nav.classList.toggle('menu-open', open); };
  menuB.onclick = () => setM(m.hidden); m.addEventListener('click', e => e.target.closest('a') && setM(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!m.hidden) setM(false); closeAcct(); } });
  const ab = $('[data-acct]'), am = $('.acct-m');
  function closeAcct() { if (am && !am.hidden) { am.hidden = true; ab.setAttribute('aria-expanded', 'false'); } }
  if (ab) { ab.onclick = () => { const o = am.hidden; am.hidden = !o; ab.setAttribute('aria-expanded', String(o)); if (o) am.querySelector('a').focus(); };
    am.addEventListener('keydown', e => { const it = $$('a,button', am), i = it.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); it[(i + 1) % it.length].focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); it[(i - 1 + it.length) % it.length].focus(); } });
    document.addEventListener('click', e => { if (!e.target.closest('.acct')) closeAcct(); }); }
  if (PAGE === 'home') { const links = $$('.nav-links [data-sec]'), secs = links.map(a => $('#' + a.dataset.sec)).filter(Boolean);
    const mark = () => { const mid = innerHeight * .45; const cur = secs.find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }); links.forEach(a => a.classList.toggle('on', !!cur && a.dataset.sec === cur.id)); };
    addEventListener('scroll', mark, { passive: true }); mark(); }
}

function initReveal() {
  if (reduce) return; const els = $$('[data-rv], .sect-head, .split-head, .b-card, .stat, .way, .pcard, .pr-row, .pr-intro, .vc, .gd, .lf-list, .vcard, .dark-head, .proof-copy, .track-panel, .ct-box');
  els.forEach(e => e.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .06 });
  els.forEach(e => io.observe(e));
}

/* Looping micro-animations for illustrative cards (pauses off-screen) */
function loop(el, steps, ms, fn) {
  if (!el || reduce) { el && fn(steps - 1); return; }
  let i = 0, t = null; const run = () => { fn(i); i = (i + 1) % steps; };
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting && !t) { run(); t = setInterval(run, ms); } else if (!x.isIntersecting && t) { clearInterval(t); t = null; } }), { threshold: .2 });
  io.observe(el);
}

async function boot(init) {
  await Bridge.open(); Acc.ensureDemo();
  renderChrome(); paintIcons(); Shop.load(); Shop.badge(); initNav(); Shop.wire();
  document.addEventListener('click', e => { const b = e.target.closest('[data-ai-open]'); if (b && !b.closest('#ai')) { e.preventDefault(); AI.open(b.dataset.aiSay || ''); }
    if (e.target.closest('[data-signout]')) { Acc.signOut(); say(`${ic('okCircle', 18)}<span>Signed out</span>`); setTimeout(() => { location.href = PAGE === 'account' ? 'index.html' : location.href.split('#')[0]; }, 400); } });
  document.addEventListener('site:booked', e => say(`${ic('okCircle', 18)}<span>Booked. Your code is <b>${e.detail.code}</b></span>`));
  paintCfg(); wireJobActions();
  addEventListener('storage', e => { if (e.key === 'qf:ws:' + Bridge.ws && e.newValue) { Bridge.reload(); paintCfg(); } });
  init && await init();
  paintCfg(); paintIcons(); paintDuo(); initReveal();
}

/* ---------- owner-controlled facts in static copy ---------- */
function cfgValue(k) {
  const st = Bridge.stats(), [lo, hi] = priceRange(), br = SHOP.branches, today = hoursToday();
  return ({ phone: SHOP.phone, maxWarranty: maxWarranty() + '-day', maxWarrantyN: String(maxWarranty()), pickup: fmtBDT(PICKUP_FEE), priceLo: fmtBDT(lo), priceHi: fmtBDT(hi),
    rating: st.reviews ? st.rating.toFixed(1) : 'New', reviews: st.reviews.toLocaleString('en-US'), delivered: st.delivered.toLocaleString('en-US'), sameDay: st.sameDay + '%',
    lastTag: '#' + ((DB.jobs[DB.jobs.length - 1] || {}).tag || 'A-0001'), branch2: (br[1] || br[0]).name, close: today ? today.to : SHOP.hours[0] ? SHOP.hours[0][1].split(' – ')[1] : '',
    hours: SHOP.hours.map(h => h[0] + ' ' + h[1]).join(' · '), callHours: (() => { const w = SHOP.week.filter(Boolean); return w.length ? w.map(h => h[0]).sort()[0] + ' and ' + w.map(h => h[1]).sort().pop() : ''; })(), shop: SHOP.name, compatPct: DB.settings.web.compatPct + '%' })[k];
}
function paintCfg(root = document) {
  $$('[data-cfg]', root).forEach(el => { const v = cfgValue(el.dataset.cfg); if (v !== undefined) el.textContent = v; });
  $$('[data-cfg-tel]', root).forEach(el => { el.href = telHref(SHOP.phone); });
}
/* quote approval + review, from any tracking card (home, assistant, account) */
function wireJobActions() {
  const redraw = code => { Bridge.reload(); $$(`[data-trk="${code}"]`).forEach(card => { const j = DB.jobs.find(x => x.code === code); const el = document.createElement('div'); el.innerHTML = trackCard({ job: j, customer: custOf(j.custId), totals: jobTotals(j) }, !!card.dataset.compact); const n = el.firstElementChild; n.className = card.className; card.replaceWith(n); paintIcons(n); }); if (typeof Account !== 'undefined' && Account.me) Account.draw(); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-quote]'); if (!b) return; const yes = b.dataset.quote === 'yes', code = b.dataset.code;
    if (!yes && !confirm('Decline this quote? You pay nothing and collect your phone as it is.')) return;
    const er = Bridge.answer(code, yes); if (er) return say(`${ic('info', 18)}<span>${esc(er)}</span>`);
    say(`${ic('okCircle', 18)}<span>${yes ? `Approved. Your technician starts on <b>${esc(code)}</b> now` : 'Quote declined. No charge'}</span>`); redraw(code); });
  document.addEventListener('submit', e => { const f = e.target.closest('[data-review]'); if (!f) return; e.preventDefault(); const r = (f.querySelector('[name=rating]:checked') || {}).value;
    if (!r) { f.querySelector('.rv-e').textContent = 'Choose 1 to 5 stars.'; return; }
    const er = Bridge.review(f.dataset.review, +r, f.text.value); if (er) { f.querySelector('.rv-e').textContent = er; return; }
    say(`${ic('okCircle', 18)}<span>Thanks, your review is live</span>`); redraw(f.dataset.review); });
}

/* duotone rendering of Hugeicons stroke icons: a 22% tinted fill layer behind the stroke */
function duo(n, s = 24) { const p = (typeof ICONS !== 'undefined' ? ICONS : HUGE_ICONS)[n] || ''; const back = p.replace(/stroke="currentColor"/g, 'stroke="none" fill="currentColor"').replace(/fill="none"/g, '');
  return `<svg class="ic duo" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g class="duo-b" opacity=".22">${back}</g><g class="duo-f">${p}</g></svg>`; }
function paintDuo(root = document) { $$('[data-duo]', root).forEach(el => { if (!el.firstElementChild) el.innerHTML = duo(el.dataset.duo); }); }
const SOCIAL = {
  facebook: '<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6H14v-6h2.5l.5-3.5h-3V8.5c0-.3.2-.5.5-.5Z" fill="currentColor"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>',
  youtube: '<path d="M21 8.2c-.2-1.4-1.2-2.4-2.6-2.5C16.6 5.5 14.3 5.4 12 5.4s-4.6.1-6.4.3C4.2 5.8 3.2 6.8 3 8.2c-.2 1.3-.3 2.5-.3 3.8s.1 2.5.3 3.8c.2 1.4 1.2 2.4 2.6 2.5 1.8.2 4.1.3 6.4.3s4.6-.1 6.4-.3c1.4-.1 2.4-1.1 2.6-2.5.2-1.3.3-2.5.3-3.8s-.1-2.5-.3-3.8Z" fill="currentColor"/><path d="m10 9.2 5 2.8-5 2.8V9.2Z" fill="#fff"/>',
  whatsapp: '<path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.1 7.9c-.3 0-.7.1-.9.5-.3.5-.6 1.2-.4 2.2.4 1.6 2.6 4.3 5.3 5 1 .3 1.8 0 2.3-.4.3-.3.4-.8.3-1.1l-1.5-.9c-.3-.2-.6 0-.8.2l-.4.5c-1-.3-2.2-1.4-2.6-2.4l.4-.4c.3-.3.3-.6.2-.9l-.6-1.6c-.1-.3-.3-.5-.5-.6Z" fill="currentColor"/>'
};
function footSocial() { const S = (SHOP.content || {}).socials || {}, L = [['facebook', 'Facebook', S.facebook], ['instagram', 'Instagram', S.instagram], ['youtube', 'YouTube', S.youtube], ['whatsapp', 'WhatsApp', S.whatsapp ? waHref(SHOP.phone) : '']];
  return L.filter(x => x[2]).map(([k, n, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener" aria-label="${n}">${socialIc(k)}</a>`).join(''); }
const socialIc = n => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">${SOCIAL[n]}</svg>`;

/* Title Case for section tags and titles (keeps iPhone, ৳, numbers, acronyms as written) */
const TC_SEL = 'main h1, main h2, .eyebrow, .nx-k, .ph-row h1, .au-h h1, .s-btn, .btn, .fx-a, .nav-cta, .c-chips button, .view-seg button, .ps-clear, .f-chips button, .cat-tabs button, .px-tabs button, .vx-a a, .hero-alt a, .ai-chips button, .ai-w button.s-btn, .fab, .nav-links a, .mnav a, .mnav button, .acct-m a, .acct-m button, .c-menu button, .ft-cols h4, .ft-cols a, .cat-list button, .pt-bar button, .crumbs a, .crumbs span[aria-current]';
const tcWord = w => { const i = w.search(/[A-Za-z]/); if (i < 0) return w; const c = w[i]; if (c !== c.toLowerCase() || /[A-Z]/.test(w.slice(i + 1))) return w; return w.slice(0, i) + c.toUpperCase() + w.slice(i + 1); };
function titleCaseAll(root = document) { $$(TC_SEL, root.nodeType === 1 ? root.ownerDocument : document).forEach(el => { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const t = n.nodeValue.replace(/\S+/g, tcWord); if (t !== n.nodeValue) n.nodeValue = t; } }); }
let __tcRaf = 0; new MutationObserver(() => { cancelAnimationFrame(__tcRaf); __tcRaf = requestAnimationFrame(() => titleCaseAll()); }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
document.addEventListener('DOMContentLoaded', () => titleCaseAll());

/* FAQ accordions: one open at a time, smooth height animation, same behaviour site-wide */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const want = d => d.dataset.st ? d.dataset.st === 'open' : d.open;
  const set = (d, open) => {
    d.dataset.st = open ? 'open' : 'closed'; clearTimeout(d._t); if (d._a) { d._a.cancel(); d._a = null; }
    if (reduce || !d.animate) { d.open = open; return; }
    const start = d.offsetHeight; d.open = true; const full = d.offsetHeight; const sh = d.querySelector('summary').offsetHeight + (d.offsetHeight - d.clientHeight);
    d.style.overflow = 'hidden'; d._a = d.animate({ height: [start + 'px', (open ? full : sh) + 'px'] }, { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    const done = () => { if (d.dataset.st !== (open ? 'open' : 'closed')) return; d.open = open; d.style.overflow = ''; if (d._a) { d._a.cancel(); d._a = null; } };
    d._a.onfinish = done; d._t = setTimeout(done, 340);
  };
  document.addEventListener('click', e => {
    const sm = e.target.closest('details > summary'); if (!sm) return; const d = sm.parentElement; if (d.classList.contains('cs-d')) return;
    e.preventDefault(); const open = !want(d);
    if (open) [...d.parentElement.children].forEach(x => { if (x !== d && x.tagName === 'DETAILS' && want(x)) set(x, false); });
    set(d, open);
  });
})();
