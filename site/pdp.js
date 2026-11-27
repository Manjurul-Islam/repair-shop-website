'use strict';
/* Product details page v2 — gallery, buy box, live availability, tabs, reviews, similar carousel.
   Pattern: marketing-site-design §3 (Shopora PDP) in the site's editorial minimal style. */
/* reviews for a service come from the shop workspace (hidden ones excluded) */
const svcReviews = id => (DB.feedback || []).filter(f => !f.hidden && f.text && (f.svcIds || []).includes(id)).slice(0, 4);
const BENEFITS = {
  screen: ['Touch, Face ID / fingerprint and True Tone checked after fitting', 'New adhesive seal restores dust resistance', 'Free tempered-glass protector fitted', 'Old screen returned to you on request'],
  battery: ['Fresh cell with 100% health, printed on your invoice', 'Swollen batteries handled safely and recycled', 'Charging and drain tested before handover', 'Most models done while you wait'],
  port: ['Free deep clean first — often fixes it without parts', 'Fast-charge and data transfer tested', 'Original-spec flex cable where replaced'],
  back: ['Old glass removed without scratching the frame', 'Camera lens cover included', 'Colour-matched panel for your model'],
  camera: ['Focus, stabilisation and flash tested', 'Lens glass included', 'Front and rear modules available'],
  speaker: ['Mesh cleaned before any replacement', 'Call and speaker test with you at handover'],
  water: ['Ultrasonic board clean and corrosion treatment', 'Data rescue attempt included', 'Honest report if it can’t be saved — you pay nothing'],
  software: ['Backup before any reset whenever possible', 'Firmware repair or clean reinstall', 'Setup help at handover'],
  diag: ['Full hardware check by a technician', 'Written quote with the exact fix', 'No obligation to repair']
};
const warrantySvg = days => `<svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice" class="art" aria-hidden="true"><defs><radialGradient id="wg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E3EBF8"/></radialGradient></defs><rect width="240" height="180" fill="url(#wg)"/><g transform="rotate(-6 120 90)"><rect x="52" y="44" width="136" height="92" rx="12" fill="#fff" stroke="#C9D8F5"/><rect x="52" y="44" width="136" height="24" rx="12" fill="#275FCE"/><rect x="52" y="58" width="136" height="10" fill="#275FCE"/><text x="64" y="61" font-family="Inter,sans-serif" font-size="10" font-weight="600" fill="#fff">WARRANTY</text><text x="64" y="100" font-family="Inter,sans-serif" font-size="26" font-weight="600" fill="#0B1324">${days}</text><text x="${days >= 100 ? 114 : 100}" y="100" font-family="Inter,sans-serif" font-size="11" fill="#66738B">days</text><rect x="64" y="112" width="70" height="5" rx="2.5" fill="#E1E7F0"/><rect x="64" y="122" width="48" height="5" rx="2.5" fill="#E1E7F0"/><circle cx="160" cy="112" r="14" fill="#E7F6EC"/><path d="M153 112l5 5 9-10" stroke="#15803D" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

Shop.initProduct = function () {
  const root = $('#pdp'), id = qs('id'), aid = qs('addon'); let view = 0, tab = 'overview';
  const setHandoff = v => { const ck = JSON.parse(sessionStorage.getItem('site:ck') || '{}'); const [h, b] = v.split('|'); ck.handoff = h; if (b) ck.branch = b; sessionStorage.setItem('site:ck', JSON.stringify(ck)); };
  const getHandoff = () => { const ck = JSON.parse(sessionStorage.getItem('site:ck') || '{}'); return ck.handoff === 'pickup' ? 'pickup' : 'dropoff|' + (ck.branch || 'Main branch'); };
  const draw = () => {
    /* ---------- add-on ---------- */
    if (aid) { const a = Bridge.addons().find(x => x.id === aid); if (!a) { root.innerHTML = this.notFound(); return; } const inC = this.cart.addons.find(x => x.itemId === a.id); document.title = a.name + ' — Dhanmondi Mobile Care';
      root.innerHTML = `${this.crumbs('Add-ons', 'repairs.html#addons', a.name)}<div class="px"><div class="px-gal"><div class="px-main">${art(addonArt(a.name))}</div></div>
        <div class="px-buy"><p class="px-cat">Add-on · collect with your repair</p><h1>${esc(a.name)}</h1>
        <div class="px-price"><b>${fmtBDT(a.price)}</b><small>Fitted free when it’s a protector or case</small></div>
        <p class="px-stock ${a.stock < 10 ? 'low' : ''}"><i></i>${a.stock < 10 ? `Only ${a.stock} left` : `${a.stock} in stock`} at ${esc(SHOP.branches[0].name)}</p>
        <div class="px-act">${inC ? `<div class="qty lg"><button type="button" data-addon-dec="${a.id}" aria-label="Remove one">${ic('minus', 18)}</button><b>${inC.qty}</b><button type="button" data-addon-inc="${a.id}" aria-label="Add one">${ic('plus', 18)}</button></div><button class="s-btn primary lg" type="button" data-open-cart>View booking</button>` : `<button class="s-btn primary lg" type="button" data-addon-add="${a.id}" ${a.stock ? '' : 'disabled'}>${ic('plus', 18)}Add to booking</button>`}</div>
        <ul class="px-list"><li>${ic('check', 16)}${a.warranty ? a.warranty + '-day replacement warranty' : 'Checked before handover'}</li><li>${ic('check', 16)}Reserved from our shelf when you book</li><li>${ic('check', 16)}Collected with a repair or a free check</li></ul></div></div>`;
      this.similar(null); return; }

    /* ---------- service ---------- */
    const s = svcById(id); if (!s) { root.innerHTML = this.notFound(); return; }
    const m = META[id], d = this.dev, graded = GRADED.includes(id), inC = this.cart.items.find(i => i.id === id);
    const q = graded ? ((inC && inC.q) || this.pq || 'compatible') : 'std';
    const price = svcPrice(s, d, q), orig = graded ? svcPrice(s, d, 'original') : 0, save = graded && q === 'compatible' ? Math.round((1 - price / orig) * 100) : 0;
    const views = [{ l: 'The repair', h: art(m.art) }, { l: 'Free check first', h: art('diag') }, { l: s.warranty ? 'Written warranty' : 'Advice', h: warrantySvg(s.warranty || 0) }, { l: 'Protector included', h: art(id === 'screen' ? 'glass' : 'case') }];
    if (view >= views.length) view = 0;
    const st = partStock(id, d), slot = slotDays(1)[0], hand = getHandoff();
    const avail = s.id === 'diag' || s.id === 'water' || s.id === 'software' ? `<p class="px-stock"><i></i>No parts needed to start · next slot <b>${slot.label} ${slot.times[0]}</b></p>`
      : st && st.stock > 0 ? `<p class="px-stock ${st.stock < 5 ? 'low' : ''}"><i></i>${st.stock < 5 ? `Only ${st.stock} part${st.stock > 1 ? 's' : ''} left` : 'Part in stock'} for ${esc(d.model)} · next slot <b>${slot.label} ${slot.times[0]}</b></p>`
      : `<p class="px-stock wait"><i></i>Part for ${esc(d.model)} sourced within 24 h · we’ll confirm before you visit</p>`;
    const R = svcReviews(id), dist = ratingOf(id).dist;
    document.title = `${s.name} for ${d.model} — Dhanmondi Mobile Care`;
    root.innerHTML = `${this.crumbs(CATS.find(c => c[0] === m.cat)[1], 'repairs.html', s.name)}
    <div class="px">
      <div class="px-gal">
        <div class="px-main" aria-live="polite">${views[view].h}${m.badge ? `<span class="px-badge">${m.badge}</span>` : ''}<span class="px-cap">${views[view].l}</span>
          <button type="button" class="px-arw l" data-view-step="-1" aria-label="Previous image">${ic('left', 18)}</button><button type="button" class="px-arw r" data-view-step="1" aria-label="Next image">${ic('right', 18)}</button></div>
        <div class="px-thumbs" role="tablist" aria-label="Images">${views.map((v, n) => `<button type="button" role="tab" aria-selected="${n === view}" aria-label="${v.l}" data-view="${n}">${v.h}</button>`).join('')}</div>
      </div>
      <div class="px-buy">
        <div class="px-top"><p class="px-cat">${CATS.find(c => c[0] === m.cat)[1]}</p><button type="button" class="px-share" data-share>${ic('copy', 16)}Share</button></div>
        <h1>${s.name}</h1>
        <p class="px-rate">${m.n ? `<span class="px-stars" aria-label="Rated ${m.rating} out of 5">${'★'.repeat(Math.round(m.rating))}<span class="off">${'★'.repeat(5 - Math.round(m.rating))}</span></span><b>${m.rating.toFixed(1)}</b><a href="#pxTabs" data-tab-go="reviews">${m.n} review${m.n === 1 ? '' : 's'}</a>` : '<span>No reviews yet</span>'}<span class="sep"></span>${ic('clock', 14)}${s.time}</p>
        <div class="px-price"><b id="pxPrice">${s.id === 'diag' ? 'Free' : fmtBDT(price)}</b>${save ? `<s>${fmtBDT(orig)}</s><em>Save ${save}%</em>` : ''}<small>${s.id === 'diag' ? 'No obligation to repair' : 'Parts + labour for your ' + esc(d.model) + ' · final price after a free check'}</small></div>

        <div class="px-opt"><div class="px-lab"><span>Your phone</span><a class="lnk sm" href="account.html#devices">Saved devices</a></div>${this.devPicker('pd')}</div>
        ${graded ? `<div class="px-opt"><div class="px-lab"><span>Part</span><button type="button" class="lnk sm" data-tab-go="details">Compare</button></div><div class="px-seg" role="radiogroup" aria-label="Part">${['compatible', 'original'].map(g => `<label class="${g === q ? 'on' : ''}"><input type="radio" name="pvq" value="${g}" ${g === q ? 'checked' : ''}><span class="pq-r"></span><span class="pq-t"><b>${GRADES[g][0]}</b><small>${GRADES[g][1]}</small></span><span class="pq-p">${fmtBDT(svcPrice(s, d, g))}</span></label>`).join('')}</div></div>` : ''}
        <div class="px-opt"><div class="px-lab"><span>Get it to us</span></div><div class="px-hand" role="radiogroup" aria-label="Drop-off or pickup">${SHOP.branches.map(b => `<label class="${hand === 'dropoff|' + b.id ? 'on' : ''}"><input type="radio" name="hand" value="dropoff|${b.id}" ${hand === 'dropoff|' + b.id ? 'checked' : ''}><span class="ph-i">${ic('mapPin', 18)}</span><span class="ph-t"><b>${b.name}</b><small>Drop off · free</small></span></label>`).join('')}<label class="${hand === 'pickup' ? 'on' : ''}"><input type="radio" name="hand" value="pickup" ${hand === 'pickup' ? 'checked' : ''}><span class="ph-i">${ic('truck', 18)}</span><span class="ph-t"><b>Courier</b><small>Pickup · ${fmtBDT(PICKUP_FEE)}</small></span></label></div></div>

        ${avail}
        <div class="px-act"><button class="s-btn primary lg" type="button" data-pd-now>Book now</button><button class="s-btn lg" type="button" data-pd-add>${inC ? ic('check', 18) + 'In your booking' : 'Add to booking'}</button></div>
        <p class="px-help">Not sure it’s the right fix? <button type="button" class="lnk" data-ai-open data-ai-say="${esc(d.model + ' ' + s.name.toLowerCase())}">Describe the problem instead</button></p>

        <div class="px-shop"><div class="ps-h">${LOGO(36)}<div><b>${esc(SHOP.name)}</b><small>${(st0 => `${st0.reviews ? st0.rating.toFixed(1) + ' rating · ' : ''}${st0.delivered.toLocaleString('en-US')} repairs collected${SHOP.since ? ' · since ' + esc(SHOP.since) : ''}`)(Bridge.stats())}</small></div><a class="lnk sm" href="index.html#visit">Branches</a></div>
          <ul><li>${ic('diag', 16)}Free check first</li><li>${ic('wallet', 16)}Pay after the repair</li><li>${ic('shield', 16)}${s.warranty ? s.warranty + '-day written warranty' : 'No fix, no fee'}</li></ul></div>
      </div>
    </div>

    <ul class="px-specs" aria-label="Key facts">${[['clock', 'Repair time', s.time], ['shield', 'Warranty', s.warranty ? s.warranty + ' days, written' : 'No fix, no fee'], ['tag', 'Parts', graded ? 'Compatible or original' : s.id === 'diag' ? 'None needed' : 'One grade'], ['lock', 'Your data', s.id === 'software' ? 'Backed up first' : 'Not touched']].map(([i, k, v]) => `<li><span class="pxs-ic">${ic(i, 18)}</span><small>${k}</small><b>${v}</b></li>`).join('')}</ul>
    <div class="px-tabs" id="pxTabs"><div class="pt-bar" role="tablist" aria-label="Product information">${[['overview', 'Overview'], ['details', 'Details'], ['reviews', `Reviews <span>${m.n || ''}</span>`], ['faq', 'FAQ']].map(([k, l]) => `<button type="button" role="tab" id="pt-${k}" aria-controls="pp-${k}" aria-selected="${k === tab}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="pt-panel" role="tabpanel" id="pp-${tab}" aria-labelledby="pt-${tab}">${this.tabHtml(tab, s, m, d, R, dist)}</div></div>`;
    this.similar(id);
  };
  this.tabHtml = (t, s, m, d, R, dist) => {
    if (t === 'overview') return `<div class="pt-2"><div><h2>About this repair</h2><p class="pt-lead">${m.blurb} We confirm the fault with a free check, tell you the exact price, and only start once you approve.</p>
      <h3>What you get</h3><ul class="pt-check">${(BENEFITS[s.id] || m.inc).slice(0, 6).map(x => `<li>${ic('check', 16)}${x}</li>`).join('')}</ul></div>
      <aside class="pt-how"><h3>How it works</h3><ol class="pt-steps"><li><b>Book online</b><span>Pick a slot — drop off or courier pickup</span></li><li><b>Free check</b><span>We confirm the fault and the final price</span></li><li><b>Repair & test</b><span>Usually ${s.time.toLowerCase()}</span></li><li><b>Collect & pay</b><span>${s.warranty ? s.warranty + '-day written warranty' : 'Pay nothing if we can’t fix it'}</span></li></ol></aside></div>`;
    if (t === 'details') return `<div class="pt-2"><div><h2>Details</h2><dl class="pt-kv"><div><dt>Device</dt><dd>${esc(d.model)}</dd></div><div><dt>Repair time</dt><dd>${s.time}</dd></div><div><dt>Warranty</dt><dd>${s.warranty ? s.warranty + ' days, in writing' : '—'}</dd></div><div><dt>Data</dt><dd>${s.id === 'software' ? 'Backed up before any reset' : 'Not touched'}</dd></div><div><dt>Payment</dt><dd>Cash, bKash, Nagad or card at collection</dd></div></dl></div>
      ${GRADED.includes(s.id) ? `<div><h2>Compare parts</h2><table class="pt-cmp"><thead><tr><th></th><th>Premium compatible</th><th>Original (OEM)</th></tr></thead><tbody><tr><th>Price</th><td>${fmtBDT(svcPrice(s, d, 'compatible'))}</td><td>${fmtBDT(svcPrice(s, d, 'original'))}</td></tr><tr><th>Warranty</th><td>${s.warranty} days</td><td>${s.warranty} days</td></tr><tr><th>Quality</th><td>Tested high-grade</td><td>Manufacturer spec</td></tr><tr><th>Best for</th><td>Great value, everyday use</td><td>Keeping 2+ years, photo work</td></tr></tbody></table></div>` : `<div><h2>Good to know</h2><p class="pt-lead">This repair doesn’t need a part choice — the price covers everything we do.</p></div>`}</div>`;
    if (t === 'reviews') return !m.n ? `<div class="pt-faq"><p class="pt-lead">No reviews for this repair yet. Customers can rate a repair from their tracking page once it’s collected.</p></div>` : `<div class="pt-rev"><div class="pr-sum"><b>${m.rating.toFixed(1)}</b><span class="px-stars">${'★'.repeat(Math.round(m.rating))}<span class="off">${'★'.repeat(5 - Math.round(m.rating))}</span></span><small>${m.n} verified review${m.n === 1 ? '' : 's'} from collected repairs</small><ul>${dist.map((p, n) => `<li><span>${5 - n}</span><i><em style="width:${p}%"></em></i><small>${p}%</small></li>`).join('')}</ul></div>
      <div class="pr-items">${R.length ? R.map(f => `<figure><div class="pri-h"><span class="rq-av">${esc(initials(f.name))}</span><div><b>${esc(shortName(f.name))}</b><small>${esc(f.model)} · ${fmtDate(iso(f.at))}</small></div><span class="px-stars sm" aria-label="${f.rating} out of 5">${'★'.repeat(f.rating)}<span class="off">${'★'.repeat(5 - f.rating)}</span></span></div><blockquote>${esc(f.text)}</blockquote></figure>`).join('') : '<p class="pt-lead">Ratings only — no written comments yet.</p>'}</div></div>`;
    return `<div class="pt-faq">${[['Will I lose my data?', s.id === 'software' ? 'We back up before any reset whenever the phone allows it.' : 'No — this repair doesn’t touch your storage. We never need your account passwords.'], ['What if the price changes?', 'We call you before any extra work. If you say no, you pay nothing and take your phone back.'], ['Can I wait in the shop?', 'Yes, for repairs under two hours. There’s seating and Wi-Fi at both branches.'], ['Is the warranty transferable?', 'It’s tied to the device and your repair code, so it stays with the phone if you sell it.']].map(([qq, a], n) => `<details ${n === 0 ? 'open' : ''}><summary>${qq}<span class="fx">${ic('plus', 16)}</span></summary><p>${a}</p></details>`).join('')}</div>`;
  };
  root.addEventListener('click', e => { const t = e.target, q = () => (root.querySelector('[name=pvq]:checked') || {}).value || 'std';
    const v = t.closest('[data-view]'); if (v) { view = +v.dataset.view; draw(); return; }
    const vs = t.closest('[data-view-step]'); if (vs) { view = (view + +vs.dataset.viewStep + 4) % 4; draw(); return; }
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
    const tg = t.closest('[data-tab-go]'); if (tg) { e.preventDefault(); tab = tg.dataset.tabGo; draw(); $('#pxTabs').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    if (t.closest('[data-share]')) { const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => say(`${ic('okCircle', 18)}<span>Link copied</span>`), () => say(`${ic('info', 18)}<span>${esc(u)}</span>`)); return; }
    if (t.closest('[data-pd-add]')) { this.add(id, q()); return; }
    if (t.closest('[data-pd-now]')) { this.add(id, q(), true); location.href = 'checkout.html'; } });
  root.addEventListener('keydown', e => { if (e.target.closest('.pt-bar') && ['ArrowRight', 'ArrowLeft'].includes(e.key)) { const ks = ['overview', 'details', 'reviews', 'faq']; tab = ks[(ks.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4]; draw(); $(`#pt-${tab}`).focus(); }
    if (e.target.closest('.px-thumbs') && ['ArrowRight', 'ArrowLeft'].includes(e.key)) { view = (view + (e.key === 'ArrowRight' ? 1 : 3)) % 4; draw(); root.querySelector(`[data-view="${view}"]`).focus(); } });
  root.addEventListener('change', e => { const t = e.target;
    if (t.name === 'pvq') { this.pq = t.value; const inC = this.cart.items.find(i => i.id === id); if (inC) { inC.q = t.value; this.save(); } draw(); root.querySelector(`[name=pvq][value="${t.value}"]`).focus(); }
    if (t.name === 'hand') { setHandoff(t.value); draw(); root.querySelector(`[name=hand][value="${t.value}"]`).focus(); } });
  ['site:cart', 'site:device'].forEach(ev => document.addEventListener(ev, draw)); draw();
  /* sticky mobile bar */
  if (id && svcById(id)) { const bar = document.createElement('div'); bar.className = 'px-bar'; document.body.appendChild(bar);
    const paint = () => { const s = svcById(id), q = (this.cart.items.find(i => i.id === id) || {}).q || this.pq || 'compatible'; bar.innerHTML = `<div><small>${esc(this.dev.model)}</small><b>${s.id === 'diag' ? 'Free' : fmtBDT(svcPrice(s, this.dev, GRADED.includes(id) ? q : 'std'))}</b></div><button class="s-btn primary" type="button" data-bar-now>Book now</button>`; };
    paint(); ['site:cart', 'site:device'].forEach(ev => document.addEventListener(ev, paint)); root.addEventListener('change', paint);
    bar.addEventListener('click', e => { if (e.target.closest('[data-bar-now]')) root.querySelector('[data-pd-now]').click(); });
    const io = new IntersectionObserver(es => es.forEach(x => bar.classList.toggle('on', !x.isIntersecting)), { threshold: 0 }); const watch = () => { const a = root.querySelector('.px-act'); if (a) { io.disconnect(); io.observe(a); } }; watch(); new MutationObserver(watch).observe(root, { childList: true }); }
};
Shop.similar = function (id) {
  const el = $('#related'); if (!el) return; const list = this.products('all').filter(p => p.id !== id && p.id !== 'diag').slice(0, 4);
  el.innerHTML = list.map(p => this.card(p)).join('');
  const tg = $('#pdTips'); if (tg && typeof GUIDES !== 'undefined') { const g = GUIDES.slice().sort((a, b) => (b.svc === id) - (a.svc === id)); tg.innerHTML = g.map(guideCard).join(''); }
};

