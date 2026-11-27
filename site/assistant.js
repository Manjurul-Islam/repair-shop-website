'use strict';
/* Repair assistant — conversational booking.
   understand() turns free text into intents + entities; the dialogue manager
   asks only for what is still missing and nothing is booked until the
   customer presses Confirm. understand() is the single seam to swap in a
   hosted language model later; everything else stays the same. */
const AI = {
  st: null, log: [], busy: false, el: null,
  fresh() { return { device: null, brand: null, service: null, details: '', urgent: false, handoff: null, branch: null, address: '', slot: null, name: '', phone: '', mode: null, done: null, track: {} }; },

  /* ---------- language understanding ---------- */
  understand(raw) {
    const t = ' ' + raw.toLowerCase().replace(/[’']/g, "'") + ' ';
    const e = {};
    const m = MODELS.find(x => x.re.test(t)); if (m) e.device = m;
    if (!m) { const b = BRANDS.find(([, re]) => re.test(t)); if (b) e.brand = b[0];
      const gm = t.match(/\b(iphone|galaxy|redmi note|redmi|note|pixel|realme|vivo|oneplus|poco)\s?([a-z]{0,2}\s?\d{1,3}[a-z]?(?:\s(?:pro|max|plus|ultra|lite|fe|5g))*)\b/);
      if (gm && e.brand) { const name = (gm[1] + ' ' + gm[2]).replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()).replace(/^Iphone/, 'iPhone').replace(/^Oneplus/, 'OnePlus'); e.device = { id: 'custom', brand: e.brand, model: name, tier: /iphone|pixel|oneplus/.test(gm[1]) || /^s\s?\d/.test(gm[2]) ? 3 : 2 }; } }
    const s = ['back', 'water', 'screen', 'battery', 'port', 'camera', 'speaker', 'software', 'diag'].map(svcById).find(x => x.re.test(t)); if (s) e.service = s.id;
    if (/urgent|asap|today|right now|quick|emergency|same.?day/.test(t)) e.urgent = true;
    if (/pick ?up|pick (it|my phone|the phone) up|pickup|collect (it|from)|courier|come (and )?get|send someone|from my (home|office)/.test(t)) e.handoff = 'pickup';
    else if (/drop|walk in|come (to|by)|visit|bring it/.test(t)) e.handoff = 'dropoff';
    { const b = SHOP.branches.find(x => { const n = x.name.toLowerCase(), w = n.split(/\s+/)[0]; return t.includes(n) || (w.length > 3 && t.includes(w)); }); if (b) { e.branch = b.id; e.handoff = e.handoff || 'dropoff'; } }
    const ph = raw.replace(/[\s-]/g, '').match(/(?:\+?88)?(01[3-9]\d{8})/); if (ph) e.phone = ph[1];
    const nm = raw.match(/(?:my name is|i am|i'm|this is|name[:\s]+)\s+([A-Za-z][A-Za-z.]+(?:\s+[A-Za-z][A-Za-z.]+){0,2})/i); if (nm && !/^(not|having|looking|in|at|from|trying|sure|fine|ok)$/i.test(nm[1].split(' ')[0])) e.name = nm[1].replace(/\b\w/g, c => c.toUpperCase());
    const code = raw.match(/\bRJ[-\s]?(\d{3,5})\b/i); if (code) e.code = 'RJ-' + code[1];
    const days = slotDays(6); let day = null;
    if (/\btoday\b|tonight/.test(t)) day = days.find(d => d.label === 'Today'); else if (/tomorrow|tmrw/.test(t)) day = days.find(d => d.label === 'Tomorrow');
    else { const dn = DAYN.findIndex(d => new RegExp('\\b' + d.toLowerCase()).test(t)); if (dn >= 0) day = days.find(d => parseD(d.date).getDay() === dn); }
    if (day) { let h = null; const hm = t.match(/\b(?:at|by|around)\s+(\d{1,2})(?::\d\d)?\s*(am|pm)?\b/) || t.match(/\b(\d{1,2})(?::\d\d)?\s*(am|pm)\b/); if (hm) { h = +hm[1]; if (hm[2] === 'pm' && h < 12) h += 12; if (!hm[2] && h < 9) h += 12; }
      else if (/morning/.test(t)) h = 10; else if (/afternoon|lunch/.test(t)) h = 14; else if (/evening|after work|tonight/.test(t)) h = 18;
      e.day = day; if (h != null) { const near = day.times.reduce((a, x) => Math.abs(parseInt(x) - h) < Math.abs(parseInt(a) - h) ? x : a, day.times[0]); e.slot = { date: day.date, time: near }; } }
    let intent = 'book';
    if (e.code || /track|status|where('s| is) my|is my .* ready|ready yet|update on/.test(t)) intent = 'track';
    else if (/open|hours|close|timing|when are you/.test(t) && !e.service) intent = 'hours';
    else if (/where are you|address|location|direction|branch(es)?\b/.test(t) && !e.service && !e.handoff) intent = 'where';
    else if (/warranty|guarantee/.test(t) && !e.service) intent = 'warranty';
    else if (/human|person|agent|call me|talk to (someone|staff)|real person/.test(t)) intent = 'human';
    else if (/start over|reset|new booking|cancel this/.test(t)) intent = 'reset';
    else if (/^(hi|hello|hey|salam|assalamu|good (morning|evening))\b/.test(t.trim()) && !e.service && !e.device) intent = 'hello';
    else if (/safe|data|privacy|passcode|password|photos/.test(t) && !e.service) intent = 'safety';
    return { intent, e };
  },

  /* ---------- dialogue ---------- */
  apply(e) {
    const s = this.st;
    if (e.device) { s.device = e.device; s.brand = e.device.brand; }
    else if (e.brand && (!s.device || s.device.brand !== e.brand)) { s.brand = e.brand; s.device = null; }
    if (e.service) s.service = e.service;
    if (e.urgent) s.urgent = true;
    if (e.handoff) s.handoff = e.handoff;
    if (e.branch) s.branch = e.branch;
    if (e.slot) s.slot = e.slot;
    if (e.phone) s.phone = e.phone;
    if (e.name) s.name = e.name;
  },
  async hear(text, opts = {}) {
    text = String(text || '').trim(); if (!text || this.busy) return;
    this.user(opts.label || text);
    const s = this.st; const { intent, e } = this.understand(text);
    // step-specific free text that NLU can't classify
    const looksAddr = /\b(house|road|rd|flat|block|sector|lane|apartment|apt|avenue|level|floor)\b|#\s?\d/i.test(text);
    if (s.mode === 'handoff' && looksAddr && !e.device && !e.service) { e.handoff = 'pickup'; delete e.branch; s.address = text.slice(0, 140); }
    if (s.mode === 'address') { delete e.branch; delete e.handoff; }
    if (s.mode === 'model' && !e.device && !e.service && intent === 'book' && text.length > 1 && !/^(continue|ok|yes|no)$/i.test(text)) { e.device = { id: 'custom', brand: e.brand || (s.brand !== 'Other' && s.brand) || 'Other', model: text.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40), tier: 2 }; }
    if (s.mode === 'address' && intent === 'book' && !e.device && !e.service && text.length > 6) s.address = text;
    if (s.mode === 'details' && intent === 'book' && !e.device && !e.service) s.details = text.slice(0, 160);
    if (s.mode === 'track-code') { if (e.code || /\d{3,5}/.test(text)) { s.track.code = e.code || text.match(/\d{3,5}/)[0]; return this.trackStep(); } }
    if (s.mode === 'track-phone') { const d = text.replace(/\D/g, ''); if (d.length >= 4) { s.track.last4 = d.slice(-4); return this.trackStep(); } }
    if (s.done && intent === 'book' && !e.device && !e.service) { return this.say('Your booking ' + s.done + ' is confirmed. Want to track it, or book another device?', { chips: [['Track ' + s.done, 'track ' + s.done], ['Book another device', 'start over']] }); }
    if (intent === 'reset') { this.st = this.fresh(); return this.say('No problem — let’s start fresh. Which phone needs fixing?', { chips: this.modelChips() }); }
    if (intent === 'track') { s.mode = 'track'; s.track = { code: e.code || null }; return this.trackStep(); }
    if (intent === 'hours') return this.say(`We’re open ${SHOP.hours.map(h => h[0] + ' ' + h[1]).join(', and ')}. Both branches keep the same hours.`, { chips: this.resumeChips() });
    if (intent === 'where') return this.say(SHOP.branches.map(b => `<b>${b.name}</b> — ${b.addr}. ${b.near}.`).join('<br>'), { chips: this.resumeChips() });
    if (intent === 'warranty') return this.say('Every repair comes with a written warranty: ' + SERVICES.filter(x => x.warranty).map(x => `${x.warranty} days on ${x.name.toLowerCase()}`).join(', ') + '. If the same fault returns, we fix it free.', { chips: this.resumeChips() });
    if (intent === 'safety') return this.say('Your data stays yours. We don’t need your passcode for most repairs — if a test needs it, we ask first and you can enter it yourself. Devices are sealed in a tagged bag while they’re with us.', { chips: this.resumeChips() });
    if (intent === 'human') return this.say(`Of course. Call <a href="tel:${SHOP.branches[0].phone.replace(/-/g, '')}">${SHOP.branches[0].phone}</a> and a technician will pick up, or keep chatting here — I’ll pass everything we’ve covered to them.`, { chips: this.resumeChips() });
    if (intent === 'hello' && !s.device && !s.service) return this.say('Hi! I can book a repair, give you a price, or check on a device you’ve already dropped off. What’s going on with your phone?', { chips: [['Cracked screen', 'my screen is cracked'], ['Battery drains fast', 'battery drains fast'], ['Track a repair', 'track my repair']] });
    this.apply(e);
    return this.next();
  },
  next() {
    const s = this.st; const dev = s.device, svc = s.service && svcById(s.service);
    if (!dev) { s.mode = 'model';
      if (s.brand) return this.say(`Which ${s.brand} model is it?`, { chips: MODELS.filter(m => m.brand === s.brand).map(m => [m.model, m.model]).concat([['Not listed — I’ll type it', null]]) });
      return this.say(svc ? `I can help with that. Which phone is it?` : 'Happy to help. Which phone is it?', { chips: this.modelChips() }); }
    if (!svc) { s.mode = 'service'; return this.say(`Got it — ${dev.brand === 'Other' ? '' : ''}${dev.model}. What’s going on with it?`, { chips: SERVICES.filter(x => x.id !== 'diag').slice(0, 6).map(x => [x.name.replace(' replacement', '').replace(' repair', ''), x.name.toLowerCase()]).concat([['Not sure', 'not sure what is wrong']]) }); }
    if (!s.quoted) { s.quoted = true; s.mode = 'handoff';
      return this.say(svc.id === 'diag' ? `No problem — we’ll run a <b>free check</b> on your ${dev.model} and tell you the exact fix and price before doing anything.` : `Here’s what it usually costs for your ${dev.model}. You’ll get the final price after a free check — no work starts until you approve it.`, { card: 'quote' }).then(() => this.next()); }
    if (!s.handoff) { s.mode = 'handoff'; return this.say('How would you like to get it to us?', { chips: this.handoffChips() }); }
    if (s.handoff === 'dropoff' && !s.branch) { s.mode = 'branch'; return this.say('Which branch is easier for you?', { chips: SHOP.branches.map(b => [b.name, 'drop at ' + b.name.toLowerCase()]) }); }
    if (s.handoff === 'pickup' && !s.address) { s.mode = 'address'; return this.say(`Where should our courier collect it? Pickup inside Dhaka is ${fmtBDT(PICKUP_FEE)}, and the device travels in a sealed, tagged bag.`, { placeholder: 'House, road, area' }); }
    if (!s.slot) { s.mode = 'slot'; return this.say(s.handoff === 'pickup' ? 'When should we come by?' : 'When will you drop it off?', { card: 'slots' }); }
    const me0 = typeof Acc !== 'undefined' && Acc.me(); if (me0 && !s.name && !s.phone) { s.name = me0.name; s.phone = me0.phone; }
    if (!s.name || !/^01[3-9]\d{8}$/.test(s.phone)) { s.mode = 'contact'; return this.say('Last thing — who should we send updates to? We’ll text your tracking code to this number.', { card: 'contact' }); }
    s.mode = 'confirm';
    return this.say('Here’s your booking. Check it over — nothing is booked until you confirm.', { card: 'summary' });
  },
  trackStep() {
    const s = this.st, t = s.track;
    if (!t.code) { s.mode = 'track-code'; return this.say('Sure. What’s your repair code? It starts with RJ and is on your receipt and SMS.', { placeholder: 'e.g. RJ-1087' }); }
    if (!t.last4) { s.mode = 'track-phone'; return this.say(`Thanks. To keep your details private, what are the <b>last 4 digits</b> of the phone number on ${esc(t.code.toUpperCase())}?`, { placeholder: 'Last 4 digits' }); }
    const r = Bridge.track(t.code, t.last4); s.mode = null; s.track = {};
    if (r.error) return this.say(r.error, { chips: [['Try again', 'track my repair'], ['Call the shop', 'talk to a person']] });
    return this.say(`Here’s the latest on <b>${esc(r.job.code)}</b>.`, { card: 'track', data: r, chips: [['Book another repair', 'start over']] });
  },
  confirm() {
    const s = this.st; if (s.done) return;
    const me1 = typeof Acc !== 'undefined' && Acc.me(); const r = Bridge.book({ accountId: me1 ? me1.id : null, source: 'assistant', device: s.device, service: s.service, details: s.details, urgent: s.urgent, handoff: s.handoff, branch: s.handoff === 'pickup' ? SHOP.branches[0].id : s.branch, address: s.address, slot: s.slot, name: s.name, phone: s.phone });
    s.done = r.code; s.mode = null; this.persist();
    this.say(`You’re booked. Your repair code is <b>${r.code}</b> — we’ve noted it against ${esc(s.phone)}.`, { card: 'done', data: r, chips: [['Track ' + r.code, 'track ' + r.code], ['Book another device', 'start over']] });
    document.dispatchEvent(new CustomEvent('site:booked', { detail: r }));
  },

  /* ---------- quick replies ---------- */
  modelChips() { return [['iPhone 13', 'iPhone 13'], ['iPhone 12', 'iPhone 12'], ['Galaxy A54', 'Galaxy A54'], ['Redmi Note 12', 'Redmi Note 12'], ['Other phone', 'other']].map(([l, v]) => v === 'other' ? ['Something else', null] : [l, v]); },
  handoffChips() { return [...SHOP.branches.map(b => [`Drop at ${b.name}`, 'drop at ' + b.name.toLowerCase()]), [`Courier pickup · ${fmtBDT(PICKUP_FEE)}`, 'pickup']]; },
  resumeChips() { const s = this.st; return s.device || s.service ? [['Continue my booking', 'continue']] : [['Book a repair', 'I need a repair'], ['Track a repair', 'track my repair']]; },

  /* ---------- rendering ---------- */
  user(text) { this.log.push({ who: 'me', html: esc(text) }); this.paintMsg(this.log.length - 1); this.persist(); },
  async say(html, o = {}) {
    this.busy = true; this.setBusy(true);
    const typing = document.createElement('div'); typing.className = 'msg bot typing'; typing.innerHTML = '<span></span><span></span><span></span>'; this.list().appendChild(typing); this.scroll();
    await new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 420 + Math.min(500, html.length * 4)));
    typing.remove();
    const m = { who: 'bot', html, card: o.card || null, data: o.data ? JSON.parse(JSON.stringify(o.data)) : null, chips: o.chips || null, then: o.then || null, placeholder: o.placeholder || null, snap: JSON.parse(JSON.stringify(this.st)) };
    this.log.push(m); this.paintMsg(this.log.length - 1); this.persist();
    this.busy = false; this.setBusy(false);
    const inp = this.el && this.el.querySelector('#aiInput'); if (inp) { inp.placeholder = o.placeholder || 'Type a message…'; if (!o.card || o.card === 'quote') inp.focus({ preventScroll: true }); }
  },
  list() { return this.el.querySelector('#aiList'); },
  scroll() { const l = this.list(); l.scrollTo({ top: l.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); },
  setBusy(b) { const f = this.el.querySelector('#aiForm'); f && f.classList.toggle('busy', b); },
  cardHtml(m, i) {
    const s = m.snap, last = i === this.log.length - 1;
    if (m.card === 'quote') { const svc = svcById(s.service), p = fromPrice(svc, s.device);
      return `<div class="ai-card quote"><div class="q-top"><span class="q-ic">${ic(svc.icon, 20)}</span><div><b>${svc.name}</b><small>${esc(s.device.model)}</small></div><strong>${svc.id === 'diag' ? 'Free' : 'from ' + fmtBDT(p)}</strong></div><dl><div><dt>Usually takes</dt><dd>${svc.time}</dd></div><div><dt>Warranty</dt><dd>${svc.warranty ? svc.warranty + ' days' : 'Advice only'}</dd></div><div><dt>Pay</dt><dd>After the repair</dd></div></dl>${last || i === this.log.length - 2 ? `<button type="button" class="q-self" data-say="__cart">${ic('cart', 16)}Choose the part & book it myself</button>` : ''}</div>`; }
    if (m.card === 'slots') { const days = slotDays(4); const sel = this.st.slot;
      return `<div class="ai-card slots" data-slots${last ? '' : ' inert'}><div class="seg-days" role="tablist">${days.map((d, n) => `<button type="button" role="tab" data-day="${d.date}" aria-selected="${n === 0}">${d.label}</button>`).join('')}</div>${days.map((d, n) => `<div class="times" data-times="${d.date}" ${n ? 'hidden' : ''}>${d.times.map(t => `<button type="button" data-slot="${d.date}|${t}" class="${sel && sel.date === d.date && sel.time === t ? 'on' : ''}">${t}</button>`).join('')}</div>`).join('')}</div>`; }
    if (m.card === 'contact') return `<form class="ai-card contact" data-contact novalidate ${last ? '' : 'inert'}><label>Your name<input name="name" autocomplete="name" value="${esc(s.name)}" placeholder="Rafiq Ahmed"></label><label>Mobile number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(s.phone)}" placeholder="01XXXXXXXXX"></label><p class="c-err" role="alert"></p><button class="s-btn primary sm" type="submit">Continue</button></form>`;
    if (m.card === 'summary') { const svc = svcById(s.service), p = fromPrice(svc, s.device), br = SHOP.branches.find(b => b.id === s.branch);
      const rows = [['Device', esc(s.device.model), 'device'], ['Repair', svc.name, 'service'], ['Estimate', (svc.id === 'diag' ? 'Free check' : 'from ' + fmtBDT(p)) + (s.handoff === 'pickup' ? ` + ${fmtBDT(PICKUP_FEE)} pickup` : ''), null], [s.handoff === 'pickup' ? 'Pickup' : 'Drop-off', s.handoff === 'pickup' ? esc(s.address) : br.name + ' branch', 'handoff'], ['When', fmtSlot(s.slot), 'slot'], ['Updates to', esc(s.name) + ' · ' + esc(s.phone), 'contact']];
      return `<div class="ai-card summary"><dl>${rows.map(([k, v, f]) => `<div><dt>${k}</dt><dd>${v}</dd>${f && last ? `<button type="button" class="edit" data-edit="${f}" aria-label="Change ${k.toLowerCase()}">Change</button>` : ''}</div>`).join('')}</dl>${last ? `<div class="sum-f"><button class="s-btn primary block" type="button" data-confirm>${ic('check', 18)}Confirm booking</button><p>${ic('secure', 14)}No payment now. You approve the final price before work starts.</p></div>` : ''}</div>`; }
    if (m.card === 'done') { return `<div class="ai-card done"><div class="done-code"><small>Repair code</small><b>${esc(m.data.code)}</b></div><ul><li>${ic('okCircle', 16)}Saved to the shop’s repair queue</li><li>${ic('okCircle', 16)}${s.handoff === 'pickup' ? 'Our courier will call before arriving' : 'Bring the device — no passcode needed'}</li><li>${ic('okCircle', 16)}Track anytime with the code and your number</li></ul><button type="button" class="s-btn sm" data-ics="${esc(m.data.code)}">${ic('calendar', 16)}Add to calendar</button></div>`; }
    if (m.card === 'track') return trackCard(m.data, true);
    return '';
  },
  paintMsg(i) {
    const m = this.log[i]; const l = this.list(); if (!l) return;
    $$('.chips', l).forEach(c => c.remove());
    const d = document.createElement('div'); d.className = 'msg ' + m.who;
    d.innerHTML = m.who === 'me' ? `<p>${m.html}</p>` : `<span class="bot-av" aria-hidden="true">${ic('wrench', 16)}</span><div class="bot-b"><p>${m.html}</p>${this.cardHtml(m, i)}${m.chips && i === this.log.length - 1 ? `<div class="chips">${m.chips.map(([l2, v]) => `<button type="button" class="chip-q" ${v === null ? 'data-type' : `data-say="${esc(v)}"`}>${esc(l2)}</button>`).join('')}</div>` : ''}</div>`;
    l.appendChild(d); this.scroll();
  },
  persist() { try { sessionStorage.setItem('site:ai', JSON.stringify({ st: this.st, log: this.log.map(x => ({ ...x })) })); } catch (e) { } },

  /* ---------- panel ---------- */
  open(prefill) {
    if (!this.el) this.mount();
    document.body.classList.add('ai-open'); this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
    this.lastFocus = document.activeElement;
    if (!this.log.length) { this.st = this.fresh(); if (!prefill) this.say('Hi, I’m the Dhanmondi Mobile Care assistant. Tell me what happened to your phone — in your own words — and I’ll get you a price and a time. Nothing is booked until you confirm.', { chips: [['My screen is cracked', 'my screen is cracked'], ['Battery dies fast', 'battery drains fast'], ['Track a repair', 'track my repair'], ['Not sure what’s wrong', 'not sure what is wrong']] }); }
    if (prefill) setTimeout(() => this.hear(prefill), 60); else setTimeout(() => this.el.querySelector('#aiInput').focus({ preventScroll: true }), 220);
  },
  close() {
    if (!this.el) return; this.el.classList.remove('on'); document.body.classList.remove('ai-open');
    setTimeout(() => { if (!this.el.classList.contains('on')) this.el.hidden = true; }, 260);
    this.lastFocus && this.lastFocus.focus && this.lastFocus.focus({ preventScroll: true });
  },
  mount() {
    const w = document.createElement('div'); w.id = 'ai'; w.className = 'ai'; w.hidden = true;
    w.innerHTML = `<div class="ai-scrim" data-ai-close></div><section class="ai-panel" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
      <header class="ai-h"><span class="bot-av lg">${ic('wrench', 18)}</span><div><h2 id="aiTitle">Repair assistant</h2><p><i class="live"></i>Replies instantly · reviewed by a technician</p></div><button class="ai-x" type="button" data-ai-reset title="Start over" aria-label="Start a new conversation">${ic('refresh', 18)}</button><button class="ai-x" type="button" data-ai-close aria-label="Close assistant">${ic('x', 18)}</button></header>
      <div class="ai-list" id="aiList" aria-live="polite"></div>
      <form class="ai-form" id="aiForm" autocomplete="off"><label class="sr" for="aiInput">Message</label><textarea id="aiInput" rows="1" placeholder="Type a message…" maxlength="400"></textarea><button type="submit" class="send" aria-label="Send message">${ic('send', 18)}</button></form>
      <p class="ai-foot">${ic('lock', 14)}Your number is only used for repair updates. <a href="#shop" data-ai-form>Browse & book yourself</a></p></section>`;
    document.body.appendChild(w); this.el = w;
    const saved = JSON.parse(sessionStorage.getItem('site:ai') || 'null');
    if (saved && saved.log && saved.log.length) { this.st = saved.st; this.log = saved.log; this.log.forEach((_, i) => this.paintMsg(i)); }
    const inp = w.querySelector('#aiInput');
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); w.querySelector('#aiForm').requestSubmit(); } });
    w.querySelector('#aiForm').addEventListener('submit', e => { e.preventDefault(); const v = inp.value; if (!v.trim() || this.busy) return; inp.value = ''; inp.style.height = 'auto'; this.hear(v); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } if (e.key === 'Tab') { const f = $$('button:not([disabled]),a[href],input,textarea', w.querySelector('.ai-panel')).filter(x => x.offsetParent && !x.closest('[inert]')); if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } } });
    w.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-ai-close]')) return this.close();
      if (t.closest('[data-ai-form]')) { this.close(); return; }
      if (t.closest('[data-ai-reset]')) { this.log = []; this.list().innerHTML = ''; this.st = this.fresh(); sessionStorage.removeItem('site:ai'); return this.open(); }
      const q = t.closest('[data-say]'); if (q && q.dataset.say === '__cart') { const s = this.st; Shop.setDevice(s.device); Shop.add(s.service, 'compatible', true); this.close(); setTimeout(() => Shop.openCart(), 280); return; }
      if (q && !this.busy) return this.hear(q.dataset.say, { label: q.textContent });
      if (t.closest('[data-type]')) { inp.placeholder = this.st.mode === 'model' || !this.st.device ? 'Type your phone model, e.g. Galaxy S21' : 'Type a message…'; if (!this.st.brand && !this.st.device) this.st.brand = 'Other'; this.st.mode = 'model'; return inp.focus(); }
      const day = t.closest('[data-day]'); if (day) { const c = day.closest('[data-slots]'); $$('[data-day]', c).forEach(b => b.setAttribute('aria-selected', String(b === day))); $$('[data-times]', c).forEach(x => x.hidden = x.dataset.times !== day.dataset.day); return; }
      const sl = t.closest('[data-slot]'); if (sl && !this.busy) { const [date, time] = sl.dataset.slot.split('|'); this.st.slot = { date, time }; this.user(fmtSlot(this.st.slot)); return this.next(); }
      const ed = t.closest('[data-edit]'); if (ed && !this.busy) { const f = ed.dataset.edit, s = this.st; this.user('Change ' + ({ device: 'device', service: 'repair', handoff: 'drop-off / pickup', slot: 'time', contact: 'contact details' })[f]);
        if (f === 'device') { s.device = null; s.brand = null; } if (f === 'service') { s.service = null; s.quoted = false; } if (f === 'handoff') { s.handoff = null; s.branch = null; s.address = ''; } if (f === 'slot') s.slot = null; if (f === 'contact') s.phone = '';
        return this.next(); }
      if (t.closest('[data-confirm]') && !this.busy) { t.closest('[data-confirm]').disabled = true; return this.confirm(); }
      const ics = t.closest('[data-ics]'); if (ics) return downloadIcs(ics.dataset.ics, this.st);
    });
    w.addEventListener('submit', e => { const f = e.target.closest('[data-contact]'); if (!f) return; e.preventDefault();
      const name = f.name.value.trim(), phone = f.phone.value.replace(/[\s-]/g, '').replace(/^\+?88/, ''), er = f.querySelector('.c-err');
      if (name.length < 2) { er.textContent = 'Please enter your name.'; return f.name.focus(); }
      if (!/^01[3-9]\d{8}$/.test(phone)) { er.textContent = 'Enter an 11-digit Bangladeshi mobile number, e.g. 01712345678.'; return f.phone.focus(); }
      this.st.name = name.replace(/\b\w/g, c => c.toUpperCase()); this.st.phone = phone; this.user(this.st.name + ' · ' + phone); this.next(); });
  }
};

function downloadIcs(code, s) {
  if (!s || !s.slot) return; const [h] = s.slot.time.split(':'); const d = s.slot.date.replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dhanmondi Mobile Care//EN', 'BEGIN:VEVENT', 'UID:' + code + '@dhanmondimobile.care', `DTSTART:${d}T${h}0000`, `DTEND:${d}T${pad(+h + 1)}0000`, `SUMMARY:${s.handoff === 'pickup' ? 'Courier pickup' : 'Drop off phone'} — ${code}`, `LOCATION:${s.handoff === 'pickup' ? s.address : (SHOP.branches.find(b => b.id === s.branch) || SHOP.branches[0]).addr}`, 'DESCRIPTION:Repair ' + code + ' (' + s.device.model + ')', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  downloadFile(code + '.ics', ics, 'text/calendar');
}

/* shared tracking card (assistant + tracking section) */
function trackCard(r, compact) {
  const j = r.job, cur = stageIndex(j.status), t = r.totals, declined = j.status === 'cancelled' && j.quote && j.quote.state === 'declined';
  const copy = declined ? ['You declined the quote', 'No charge. Collect your phone any time during opening hours.'] : STATUS_COPY[j.status];
  const q = j.quote, fb = (DB.feedback || []).find(f => f.jobId === j.id);
  const qBox = j.status === 'quote' && q && q.state === 'pending' ? `<div class="trk-q" role="group" aria-label="Approve your quote"><div class="tq-h"><small>Quote for ${esc(j.brand)} ${esc(j.model)}</small><b>${fmtBDT(q.amount)}</b>${j.online && j.estimate && q.amount > j.estimate ? `<em>Booked at ${fmtBDT(j.estimate)}</em>` : ''}</div>${q.note ? `<p>${esc(q.note)}</p>` : ''}<div class="tq-a"><button class="s-btn primary" type="button" data-quote="yes" data-code="${esc(j.code)}">${ic('check', 18)}Approve ${fmtBDT(q.amount)}</button><button class="s-btn" type="button" data-quote="no" data-code="${esc(j.code)}">Decline</button></div><small class="tq-f">Declining is free — we return your phone as it was.</small></div>` : '';
  const rvBox = j.status !== 'delivered' || compact ? '' : fb ? `<div class="trk-rv done">${ic('star', 16)}<span>You rated this repair <b>${fb.rating}/5</b>${fb.text ? ` — “${esc(fb.text)}”` : ''}. Thank you.</span></div>` : `<form class="trk-rv" data-review="${esc(j.code)}" novalidate><b>How did we do?</b><div class="rv-stars" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="rating" value="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"><span aria-hidden="true">★</span></label>`).join('')}</div><textarea name="text" rows="2" maxlength="600" placeholder="Anything we should know? (optional)"></textarea><div class="rv-a"><small>Shown on our website with your first name.</small><button class="s-btn primary sm" type="submit">Send review</button></div><p class="rv-e" role="alert"></p></form>`;
  const steps = STAGES.map(([k, l], n) => `<li class="${n < cur ? 'done' : n === cur ? 'cur' : ''}"><i>${n < cur ? ic('check', 12) : ''}</i><span>${l}</span></li>`).join('');
  const tl = [...j.timeline].reverse().slice(0, compact ? 3 : 6).map(x => `<li><b>${esc(x.text.replace(/^Status: .* → /, 'Now: '))}</b><small>${fmtTs(x.ts)}</small></li>`).join('');
  return `<div class="trk ${compact ? 'compact' : ''}" data-trk="${esc(j.code)}" data-compact="${compact ? 1 : ''}"><div class="trk-h"><div><small>${esc(j.code)} · ${esc(j.brand)} ${esc(j.model)}</small><h3>${copy[0]}</h3><p>${copy[1]}</p></div>${j.status === 'cancelled' ? '' : `<span class="trk-st ${j.status === 'ready' || j.status === 'delivered' ? 'ok' : j.status === 'quote' ? 'warn' : ''}">${j.status === 'waiting_parts' ? 'Waiting for part' : j.status === 'quote' ? 'Needs your OK' : STAGES[cur][1]}</span>`}</div>${qBox}
    ${j.status === 'cancelled' ? '' : `<ol class="stepper" aria-label="Repair progress">${steps}</ol>`}
    <dl class="trk-kv"><div><dt>Estimated ready</dt><dd>${fmtDate(j.due)}</dd></div>${j.tag ? `<div><dt>Sealed bag</dt><dd>#${esc(j.tag)}</dd></div>` : ''}${['received', 'diagnosing'].includes(j.status) ? `<div><dt>Estimate</dt><dd>${j.estimate ? 'from ' + fmtBDT(j.estimate) : 'After the free check'}</dd></div>` : `<div><dt>${t.due > 0 ? 'Balance due' : 'Paid'}</dt><dd>${t.total ? fmtBDT(t.due > 0 ? t.due : t.paid) : 'Quote pending'}</dd></div>`}</dl>
    <ul class="trk-tl">${tl}</ul>${rvBox}</div>`;
}
