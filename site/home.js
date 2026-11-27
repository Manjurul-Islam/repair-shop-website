'use strict';
/* Homepage behaviour */
/* ---------- hero composer ---------- */
function initComposer() {
  const f = $('#heroAsk'), t = $('#heroInput'), plus = $('[data-plus]'), menu = $('.c-menu');
  t.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  f.addEventListener('submit', e => { e.preventDefault(); const v = t.value.trim(); if (!v) { t.focus(); f.classList.add('nudge'); setTimeout(() => f.classList.remove('nudge'), 500); return; } t.value = ''; AI.open(v); });
  $$('[data-fill]', f).forEach(b => b.onclick = () => { const v = t.value.trim(); const add = b.dataset.fill; if (!v.toLowerCase().includes(add.toLowerCase())) t.value = (v ? v + (/[.,]$/.test(v) ? ' ' : ', ') : '') + add; t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
  const setMenu = o => { menu.hidden = !o; plus.setAttribute('aria-expanded', String(o)); if (o) menu.querySelector('button').focus(); };
  plus.onclick = () => setMenu(menu.hidden);
  menu.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { setMenu(false); b.dataset.go[0] === '#' ? go(b.dataset.go) : (location.href = b.dataset.go); } });
  menu.addEventListener('keydown', e => { const items = $$('button', menu), i = items.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); } if (e.key === 'Escape') { setMenu(false); plus.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.c-more')) menu.hidden = true; });
}

/* ---------- stats (live from the shop's Benchly workspace) ---------- */
function initStats() {
  const s = Bridge.stats(); const vals = { delivered: s.delivered, onTime: s.onTime, warranty: s.warranty };
  const fmt = { delivered: n => num(n), onTime: n => n + '%', warranty: n => n + ' days' };
  const io = new IntersectionObserver(es => es.forEach(x => { if (!x.isIntersecting) return; io.disconnect();
    $$('[data-stat]').forEach(b => { const k = b.dataset.stat, to = vals[k]; if (reduce) { b.textContent = fmt[k](to); return; } const t0 = performance.now(); const step = now => { const p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3); b.textContent = fmt[k](Math.round(to * e)); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }), { threshold: .4 });
  io.observe($('#stats'));
}

/* ---------- quick actions (functional command list) ---------- */
function initQuick() {
  const A = [
    ['chat', 'Book a repair', 'Describe it, get a time', 'B', () => AI.open()],
    ['cart', 'Browse repairs', 'Prices for your model', 'P', () => { location.href = 'repairs.html'; }],
    ['tag', 'Book it myself', 'Add repairs, check out', 'M', () => go('#book')],
    ['user', 'My account', 'Bookings, devices, addresses', 'A', () => { location.href = Acc.me() ? 'account.html#overview' : 'signin.html'; }],
    ['search', 'Track a repair', 'Code + last 4 digits', 'T', () => { go('#track'); setTimeout(() => $('#tCode').focus({ preventScroll: true }), 500); }],
    ['shield', 'Warranty claim', 'Same fault? Free fix', 'W', () => AI.open('I want to make a warranty claim')],
    ['truck', 'Courier pickup', 'Door to door · ' + fmtBDT(PICKUP_FEE), 'C', () => AI.open('I need a pickup')],
    ['phone', 'Call the shop', SHOP.phone, 'K', () => { location.href = telHref(SHOP.phone); }],
    ['mapPin', 'Directions', SHOP.branches.map(b => b.name).join(' · '), 'D', () => go('#visit')]
  ];
  const list = $('#qaList'), inp = $('#qaInput'); let sel = 0, shown = A;
  const draw = () => { list.innerHTML = shown.length ? shown.map((a, i) => `<li><button type="button" class="${i === sel ? 'on' : ''}" data-qa="${A.indexOf(a)}"><span class="qa-ic">${ic(a[0], 16)}</span><span class="qa-t"><b>${a[1]}</b><small>${a[2]}</small></span><span class="qa-go">${ic('right', 16)}</span></button></li>`).join('') : `<li class="qa-empty">Nothing matches. <button type="button" data-qa-ask>Ask the assistant</button></li>`; };
  inp.addEventListener('input', () => { const q = inp.value.toLowerCase().trim(); shown = A.filter(a => (a[1] + ' ' + a[2]).toLowerCase().includes(q)); sel = 0; draw(); });
  inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); } if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); shown[sel][4](); } });
  list.addEventListener('click', e => { const b = e.target.closest('[data-qa]'); if (b) A[+b.dataset.qa][4](); if (e.target.closest('[data-qa-ask]')) AI.open(inp.value); });
  list.addEventListener('mousemove', e => { const b = e.target.closest('[data-qa]'); if (!b) return; const i = shown.indexOf(A[+b.dataset.qa]); if (i !== sel) { sel = i; $$('button', list).forEach((x, n) => x.classList.toggle('on', n === sel)); } });
  draw();
  const qa = $('#qa'); let busy = false; qa.addEventListener('pointerenter', () => busy = true); qa.addEventListener('pointerleave', () => busy = false); inp.addEventListener('focus', () => busy = true); inp.addEventListener('blur', () => busy = false);
  loop(qa, 1e9, 1600, () => { if (busy || inp.value) return; sel = (sel + 1) % Math.min(shown.length, 3); $$('button', list).forEach((x, n) => x.classList.toggle('on', n === sel)); });
}

/* ---------- tracking ---------- */
function initTrack() {
  const f = $('#trackForm'), out = $('#trackOut'), err = $('#tErr');
  const run = (code, last4) => { const r = Bridge.track(code, last4); if (r.error) { err.innerHTML = ic('alert', 16) + '<span>' + esc(r.error) + '</span>'; err.classList.add('on'); out.innerHTML = ''; return; }
    err.classList.remove('on'); out.innerHTML = trackCard(r, false) + `<div class="trk-a"><button class="s-btn sm" type="button" data-again>${ic('refresh', 16)}Check another</button><button class="s-btn sm" type="button" data-ai-open data-ai-say="I have a question about ${esc(r.job.code)}">${ic('chat', 16)}Ask about this repair</button></div>`; f.hidden = true; out.querySelector('h3').setAttribute('tabindex', '-1'); out.querySelector('h3').focus({ preventScroll: true }); };
  f.addEventListener('submit', e => { e.preventDefault(); const code = f.code.value.trim(), l4 = f.last4.value.trim(); f.querySelectorAll('.f').forEach(x => x.classList.remove('bad'));
    if (!/^(rj-?)?\d{3,5}$/i.test(code.replace(/\s/g, ''))) { f.code.closest('.f').classList.add('bad'); err.innerHTML = ic('alert', 16) + '<span>Enter the code from your receipt, like RJ-1087.</span>'; err.classList.add('on'); return f.code.focus(); }
    if (!/^\d{4}$/.test(l4)) { f.last4.closest('.f').classList.add('bad'); err.innerHTML = ic('alert', 16) + '<span>Enter the last 4 digits of your mobile number.</span>'; err.classList.add('on'); return f.last4.focus(); }
    run(code, l4); });
  f.addEventListener('input', () => err.classList.remove('on'));
  out.addEventListener('click', e => { if (e.target.closest('[data-again]')) { out.innerHTML = ''; f.hidden = false; f.reset(); f.code.focus(); } });
  const s = Bridge.sample(); if (s) $('#demoHint').innerHTML = `Demo: try <button type="button" class="lnk" data-demo="${s.code}|${s.last4}">${s.code} · ${s.last4}</button>`;
  $('#demoHint').addEventListener('click', e => { const b = e.target.closest('[data-demo]'); if (!b) return; const [c, l] = b.dataset.demo.split('|'); f.code.value = c; f.last4.value = l; f.requestSubmit(); });
  const m = (qs('track') || '').match(/^(RJ-\d+)$/i) || location.hash.match(/^#track=(RJ-\d+)/i); if (m) { f.code.value = m[1].toUpperCase(); setTimeout(() => { go('#track'); f.last4.focus({ preventScroll: true }); }, 300); }
}

/* ---------- visit ---------- */
function initVisit() {
  const os = openState(), open = os.open;
  $('#visitGrid').innerHTML = SHOP.branches.map((b, n) => `<article class="vx-card"><div class="vx-map" aria-hidden="true">${mapArt(n)}<span class="vx-pin">${ic('mapPin', 16)}${esc(b.name)}</span></div>
    <div class="vx-b"><div class="vx-top"><h3>${esc(b.name)}</h3><span class="v-open ${open ? 'on' : ''}"><i></i>${os.text}</span></div><p class="vx-addr">${esc(b.addr)}${b.near ? `<small>${esc(b.near)}</small>` : ''}</p>
    <ul class="vx-hours">${SHOP.hours.map(([d, t]) => `<li><span>${esc(d)}</span><b>${esc(t)}</b></li>`).join('')}</ul>
    <div class="vx-a"><a class="s-btn primary sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.addr)}" target="_blank" rel="noopener">${ic('mapPin', 16)}Directions</a><a class="s-btn sm" href="${telHref(b.phone)}">${ic('phone', 16)}${esc(b.phone)}</a></div></div></article>`).join('')
    + `<article class="vx-card vx-pick"><div class="vx-pk-in"><span class="vx-pk-ic" data-duo="truck"></span><p class="nx-k light">Can’t come in?</p><h3>We’ll collect it from your door.</h3><p>Courier pickup and return across the city. Your phone travels sealed, and you pay when it comes back.</p>
      <dl><div><dt>Pickup fee</dt><dd>${fmtBDT(PICKUP_FEE)}</dd></div><div><dt>Earliest slot</dt><dd>${(s => s ? s.label + ' ' + s.times[0] : '—')(slotDays(1)[0])}</dd></div></dl>
      <button class="s-btn light" type="button" data-ai-open data-ai-say="I need a pickup">${ic('truck', 18)}Book a pickup</button></div></article>`;
}
function mapArt(n) {
  const roads = n ? 'M0 70 L400 40 M0 140 L400 150 M120 0 L150 200 M290 0 L250 200 M0 20 L200 200' : 'M0 60 L400 90 M0 150 L400 120 M90 0 L110 200 M260 0 L300 200 M200 0 L400 160';
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice"><rect width="400" height="200" fill="#EAF0FA"/><path d="${n ? 'M30 10h70v40H30zM180 70h60v60h-60zM310 160h70v30h-70z' : 'M20 100h60v40H20zM140 10h90v60h-90zM320 10h60v50h-60z'}" fill="#DCE6F6"/><path d="${roads}" stroke="#fff" stroke-width="14" fill="none"/><path d="${roads}" stroke="#D2DCEC" stroke-width="1" fill="none"/><g transform="translate(${n ? 215 : 190} ${n ? 96 : 86})"><circle r="26" fill="#275FCE" opacity=".14"><animate attributeName="r" values="14;30;14" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".25;0;.25" dur="3s" repeatCount="indefinite"/></circle><path d="M0 12c-8-9-12-15-12-20a12 12 0 0 1 24 0c0 5-4 11-12 20z" fill="#275FCE" transform="translate(0 -14)"/><circle cy="-22" r="4.5" fill="#fff"/></g></svg>`;
}

/* ---------- looping card animations ---------- */
function initLoops() {
  const hc = $('.hw-chat'); loop(hc, 5, 1700, i => { hc.dataset.s = i; });
  const hq = $('.hw-quote'); loop(hq, 4, 1900, i => { hq.dataset.s = i; const o = i === 1 || i === 2; $('#qvPrice').textContent = o ? '৳15,500' : '৳10,550'; $('#qvGrade').textContent = o ? 'Original (OEM)' : 'Premium compatible'; $('#qvWar').textContent = o ? '180 days' : '90 days'; });
  const ht = $('.hw-track'); loop(ht, 4, 1900, i => { ht.dataset.s = i; $('#tvPct').textContent = ['25%', '50%', '75%', '100%'][i]; $('#tvTitle').textContent = ['Booked', 'Checked', 'Repairing', 'Ready for pickup'][i];
    $('#tvNote').innerHTML = '<span class="dot"></span>' + ['Bag #A-2291 sealed · 10:12', 'Rahim confirmed the fault · 11:04', 'Sabbir is fitting the display · 13:20', 'We texted you · 14:33'][i]; $$('.tv-steps li', ht).forEach((li, n) => li.className = n < i ? 'd' : n === i ? 'c' : ''); });
  loop($('.shop-vis'), 3, 2000, i => { const el = $('.shop-vis'); el.dataset.s = i; $('#svCount').textContent = [1, 2, 2][i] + (i ? ' items' : ' item'); $('#svTotal').textContent = ['৳10,550', '৳12,300', '৳12,300'][i]; });
  loop($('.way-chat'), 4, 2100, i => { $('.way-chat').dataset.s = i; });
  const bs = $('.bk-shop'); if (bs) { const sc = svcById('screen'), sb = svcById('battery'), d = Shop.dev, lo = s => fmtBDT(svcPrice(s, d, 'compatible')), rg = s => `${lo(s)} – ${fmtBDT(svcPrice(s, d, 'original'))}`;
    $('.bk-p.p1 small').textContent = rg(sc); $('.bk-p.p2 small').textContent = rg(sb); $$('.bk-art').forEach(el => el.innerHTML = art(el.dataset.art));
    loop(bs, 4, 1500, i => { bs.dataset.s = i; $('#bkCount').textContent = i > 1 ? '2' : '1'; if (i === 2) { const c = $('.bks-cart'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } $('#bkTotal').textContent = fmtBDT(svcPrice(sc, d, 'compatible') + (i > 1 ? svcPrice(sb, d, 'compatible') : 0)); }); }
  const bc = $('.bk-chat'); if (bc) loop(bc, 4, 2100, i => { bc.dataset.s = i; });
  const ap = $('.aph'); if (ap) loop(ap, 4, 2200, i => { const st = ['Booked', 'Checked — quote sent', 'Repair in progress', 'Ready for pickup'][i]; $('#apTitle').textContent = st; $$('.aph-steps li', ap).forEach((li, n) => li.className = n < i ? 'd' : n === i ? 'c' : ''); ap.dataset.s = i; });
}


/* ---------- lower section: rotating testimonial ---------- */
/* live reviews from the shop workspace (owner can hide any review in the portal) */
const VOICES = [];
function loadVoices() {
  const svcName = ids => (ids || []).map(id => (svcById(id) || {}).name).filter(Boolean)[0] || 'Repair';
  VOICES.splice(0, VOICES.length, ...(DB.feedback || []).filter(f => !f.hidden && f.text).slice(0, 5).map(f => ({ n: shortName(f.name), m: `${f.model} · ${svcName(f.svcIds)}`, r: f.rating, q: f.text })));
}
function initVoices() {
  const wall = $('#voiceWall'); if (!wall) return; const sum = ratingOf(null);
  const vs = $('#vwStars'); if (vs) { vs.innerHTML = `<i>★★★★★</i><b style="width:${sum.avg / 5 * 100}%">★★★★★</b>`; vs.setAttribute('aria-label', `${sum.avg.toFixed(1)} out of 5`); }
  const vn = $('#visitNow'); if (vn) vn.textContent = 'Walk in any time during opening hours — booking just holds your slot and a technician ready for you.';
  const svcName = ids => (ids || []).map(id => (svcById(id) || {}).name).filter(Boolean)[0] || 'Repair';
  const list = (DB.feedback || []).filter(f => !f.hidden && f.text).slice(0, 16);
  if (list.length < 2) { wall.closest('section').hidden = true; return; }
  const card = f => `<figure class="vw-c"><div class="vw-st" aria-label="${f.rating} out of 5">${'★'.repeat(f.rating)}<i>${'★'.repeat(5 - f.rating)}</i></div><blockquote>“${esc(f.text)}”</blockquote><figcaption><span class="vw-av">${esc(initials(f.name))}</span><span><b>${esc(shortName(f.name))}</b><small>${esc(f.model)} · ${esc(svcName(f.svcIds))}</small></span></figcaption></figure>`;
  const half = Math.ceil(list.length / 2), rows = [list.slice(0, half), list.slice(half)];
  $$('.vw-row', wall).forEach((r, n) => { const h = rows[n].map(card).join(''); r.innerHTML = `<div class="vw-track">${h}${h.replace(/<figure /g, '<figure aria-hidden="true" ')}</div>`; });
}
function initGuides() { const g = $('#gdGrid'); if (g) g.innerHTML = GUIDES.map(guideCard).join(''); }
function initCtaAsk() {
  const f = $('#ctAsk'); if (!f) return;
  f.addEventListener('submit', e => { e.preventDefault(); const v = f.querySelector('input').value.trim(); if (!v) { f.classList.add('nudge'); setTimeout(() => f.classList.remove('nudge'), 500); return f.querySelector('input').focus(); } f.reset(); AI.open(v); });
}

boot(async () => {
  $$('.tk-track').forEach(t => { t.innerHTML += t.innerHTML; });
  initVoices(); initGuides(); initCtaAsk();
  initComposer(); initStats(); initQuick(); Shop.featured(); initTrack(); initVisit(); initLoops();
  $$('[data-art]').forEach(e => e.innerHTML = art(e.dataset.art));
});
