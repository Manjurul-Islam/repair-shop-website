'use strict';
/* Customer accounts (separate from Benchly staff users).
   Accounts are linked to the shop's customer records by mobile number, so every
   repair booked with that number, online or at the counter, shows up here. */
const digits10 = p => String(p || '').replace(/\D/g, '').slice(-10);
const validPhone = p => /^01[3-9]\d{8}$/.test(String(p).replace(/[\s-]/g, '').replace(/^\+?88/, ''));
const normPhone = p => String(p).replace(/[\s-]/g, '').replace(/^\+?88/, '');
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pwOk = p => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const Acc = {
  all() { return LS.get('site:accounts', []); },
  saveAll(a) { LS.set('site:accounts', a); },
  me() { let s = null; try { s = JSON.parse(sessionStorage.getItem('site:session') || localStorage.getItem('site:session') || 'null'); } catch (e) { } return s ? this.all().find(a => a.id === s.id) || null : null; },
  start(a, remember = true) { localStorage.removeItem('site:session'); sessionStorage.removeItem('site:session'); (remember ? localStorage : sessionStorage).setItem('site:session', JSON.stringify({ id: a.id, at: Date.now() })); a.lastLogin = Date.now(); a.failed = 0; this.update(a); },
  signOut() { localStorage.removeItem('site:session'); sessionStorage.removeItem('site:session'); },
  update(a) { const all = this.all(); const i = all.findIndex(x => x.id === a.id); if (i >= 0) all[i] = a; else all.push(a); this.saveAll(all); },
  find(idf) { idf = String(idf || '').trim().toLowerCase(); const d = digits10(idf); return this.all().find(a => a.email === idf || (d.length === 10 && digits10(a.phone) === d)); },
  async create({ name, email, phone, password }) {
    const salt = uid('s');
    const a = { id: uid('ca'), name: name.trim().replace(/\b\w/g, c => c.toUpperCase()), email: email.trim().toLowerCase(), phone: normPhone(phone), salt, hash: await hashPw(password, salt), createdAt: Date.now(), addresses: [], devices: Shop.dev ? [{ id: uid('d'), ...devRef(Shop.dev), primary: true }] : [], prefs: { sms: true, email: true, offers: false }, failed: 0, lockUntil: 0 };
    this.update(a); return a;
  },
  async signIn(idf, pw) {
    const a = this.find(idf); if (a && a.lockUntil > Date.now()) return { error: `Too many attempts. Try again in ${Math.ceil((a.lockUntil - Date.now()) / 60000)} min.` };
    if (!a || await hashPw(pw, a.salt) !== a.hash) { if (a) { a.failed = (a.failed || 0) + 1; if (a.failed >= 5) { a.lockUntil = Date.now() + 5 * 60e3; a.failed = 0; } this.update(a); } return { error: 'That email or number and password don’t match.' }; }
    return { a };
  },
  bookings(a) {
    Bridge.reload(); const d = digits10(a.phone);
    return DB.jobs.filter(j => { const c = custOf(j.custId); return (j.online && j.online.accountId === a.id) || (c && digits10(c.phone) === d); }).sort((x, y) => (y.online ? y.online.bookedAt : 0) - (x.online ? x.online.bookedAt : 0) || y.createdAt.localeCompare(x.createdAt) || y.code.localeCompare(x.code));
  },
  /* demo account: linked to a real sample customer with an active repair */
  ensureDemo() {
    if (this.all().some(a => a.demo)) return; Bridge.reload();
    const j = [...DB.jobs].reverse().find(x => ['repairing', 'diagnosing', 'ready'].includes(x.status) && custOf(x.custId) && validPhone(custOf(x.custId).phone)); if (!j) return;
    const c = custOf(j.custId); const dev = MODELS.find(m => m.model === j.model) || { id: 'custom', brand: j.brand, model: j.model, tier: 2 };
    hashPw('Demo@1234', 'sdemo').then(hash => { if (this.all().some(a => a.demo)) return; this.update({ id: 'ca_demo', demo: true, name: c.name, email: 'customer@demo.care', phone: normPhone(c.phone), salt: 'sdemo', hash, createdAt: Date.now() - 40 * DAY, addresses: [{ id: uid('ad'), label: 'Home', line: 'House 18, Road 7', area: 'Dhanmondi, Dhaka 1209', primary: true }], devices: [{ id: uid('d'), ...devRef(dev), primary: true }], prefs: { sms: true, email: true, offers: false }, failed: 0, lockUntil: 0 }); });
  }
};
const devRef = d => ({ modelId: d.id, brand: d.brand, model: d.model, tier: d.tier || 2 });
const devFrom = r => MODELS.find(m => m.id === r.modelId) || { id: 'custom', brand: r.brand, model: r.model, tier: r.tier || 2 };

/* ---------- shared bits ---------- */
const pwRulesHtml = id => `<ul class="pw-rules" id="${id}" aria-live="polite"><li data-r="len">${ic('check', 12)}8+ characters</li><li data-r="let">${ic('check', 12)}A letter</li><li data-r="num">${ic('check', 12)}A number</li></ul>`;
function bindPwRules(input, list) { input.addEventListener('input', () => { const v = input.value, ok = { len: v.length >= 8, let: /[A-Za-z]/.test(v), num: /\d/.test(v) }; $$('li', list).forEach(li => li.classList.toggle('ok', ok[li.dataset.r])); }); }
const pwInput = (id, name, label, ac, extra = '') => `<div class="f"><div class="f-top"><label for="${id}">${label}</label>${extra}</div><div class="pw"><input id="${id}" name="${name}" type="password" autocomplete="${ac}"><button type="button" class="pw-t" data-pw aria-label="Show password" aria-pressed="false">${ic('eye', 18)}</button></div><p class="f-e"></p></div>`;
function fErr(form, name, msg) { const i = form.querySelector(`[name="${name}"]`); const f = i.closest('.f'); f.classList.add('bad'); f.querySelector('.f-e').textContent = msg; return i; }
function bindForm(form) {
  form.addEventListener('input', e => { const f = e.target.closest('.f'); f && f.classList.remove('bad'); const fe = form.querySelector('.form-e'); fe && fe.classList.remove('on'); });
  form.addEventListener('click', e => { const b = e.target.closest('[data-pw]'); if (!b) return; const i = b.previousElementSibling, show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = ic(show ? 'eyeoff' : 'eye', 18); b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });
}
const formE = (form, msg) => { const e = form.querySelector('.form-e'); e.innerHTML = ic('alert', 16) + '<span>' + esc(msg) + '</span>'; e.classList.add('on'); };

/* ================= SIGN-IN PAGE ================= */
const SignIn = {
  init() {
    if (Acc.me() && !location.hash.startsWith('#reset')) { location.replace(qs('next') || 'account.html#overview'); return; }
    addEventListener('hashchange', () => this.draw()); this.draw();
    this.story();
  },
  story() {
    const st = $('.au-story'); if (!st || st.dataset.on) return; st.dataset.on = 1;
    const mk = $('[data-logo]', st); if (mk && typeof LOGO === 'function') mk.innerHTML = LOGO(32);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, steps = $$('[data-au-step]', st), cards = $$('[data-scene]', st), DUR = 6000;
    let ph = 0, t = 0, last = performance.now(), hold = false;
    const paint = () => { steps.forEach((b, n) => { b.classList.toggle('current', n === ph); b.setAttribute('aria-pressed', String(n === ph)); $('.aus-bar i', b).style.transform = `scaleX(${n === ph ? Math.min(1, t / DUR) : 0})`; }); cards.forEach((c, n) => c.classList.toggle('on', n === ph)); };
    steps.forEach((b, n) => b.addEventListener('click', () => { ph = n; t = 0; last = performance.now(); paint(); }));
    st.addEventListener('pointerenter', () => hold = true); st.addEventListener('pointerleave', () => { hold = false; last = performance.now(); });
    const tick = now => { if (!st.isConnected) return; if (!hold && !reduce && !document.hidden) { t += now - last; if (t >= DUR) { t = 0; ph = (ph + 1) % steps.length; } } last = now; paint(); requestAnimationFrame(tick); };
    paint(); requestAnimationFrame(tick);
    /* cursor spotlight on the grid, eased and kept off text and cards */
    if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const pat = $('.au-pat', st); const setCut = () => { const c = $('.au-copy', st); if (c) pat.style.setProperty('--cut', Math.round(c.getBoundingClientRect().top - st.getBoundingClientRect().top - 24) + 'px'); }; setCut(); addEventListener('resize', setCut); let tx = 0, ty = 0, x = 0, y = 0, on = 0, ton = 0, raf = 0;
      const blocks = () => $$('.au-brand,.au-card.on,.au-copy,.au-steps', st);
      const loopP = () => { x += (tx - x) * .085; y += (ty - y) * .085; on += (ton - on) * .07; pat.style.setProperty('--mx', x.toFixed(1) + 'px'); pat.style.setProperty('--my', y.toFixed(1) + 'px'); pat.style.setProperty('--on', on.toFixed(3));
        raf = (Math.abs(tx - x) > .2 || Math.abs(ty - y) > .2 || Math.abs(ton - on) > .002) ? requestAnimationFrame(loopP) : 0; };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loopP); };
      st.addEventListener('pointermove', e => { const r = st.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
        const over = blocks().some(el => { const b = el.getBoundingClientRect(); return e.clientX >= b.left - 12 && e.clientX <= b.right + 12 && e.clientY >= b.top - 12 && e.clientY <= b.bottom + 12; });
        if (on < .02) { x = tx; y = ty; } ton = over ? 0 : 1; kick(); });
      st.addEventListener('pointerleave', () => { ton = 0; kick(); });
    }
  },
  storyMode(mode) {
    const T = { signup: ['Create your account in a minute', 'Your past repairs link to your mobile number, so everything you’ve booked with us shows up straight away.'],
      signin: ['Every repair you book, in one place', 'Follow each repair as it happens, book again in a tap and keep your warranties together.'] }[mode === 'signup' ? 'signup' : 'signin'];
    const a = $('[data-au-title]'), b = $('[data-au-sub]'); if (a && a.textContent !== T[0]) { a.textContent = T[0]; b.textContent = T[1]; }
  },
  next() { const n = qs('next'); return n && !/^https?:|^\/\//.test(n) ? n : 'account.html#overview'; },
  draw() {
    const mode = (location.hash.replace('#', '') || 'signin').split('=')[0]; const box = $('#authBox'); let h = ''; this.storyMode(mode);
    if (mode === 'signin') h = `<div class="au-h"><h1>Welcome back</h1><p>Sign in to see your repairs, rebook in a tap and check out faster.</p></div>
      <form id="af" novalidate><div class="f"><label for="aId">Email or mobile number</label><input id="aId" name="id" autocomplete="username" placeholder="you@example.com or 01XXXXXXXXX"><p class="f-e"></p></div>
      ${pwInput('aPw', 'pw', 'Password', 'current-password', '<a class="lnk sm" href="#forgot">Forgot password?</a>')}
      <label class="check"><input type="checkbox" name="remember" checked><span>Keep me signed in</span></label>
      <div class="form-e" role="alert"></div><button class="s-btn primary block lg" type="submit">Sign in</button></form>
      <div class="or"><span>or</span></div><button class="s-btn block lg" type="button" id="demoAcc">${ic('zap', 18)}Explore with a demo account</button>
      <p class="au-alt">New here? <a class="lnk" href="#signup">Create an account</a>. You need one to place a booking.</p>`;
    if (mode === 'signup') h = `<div class="au-h"><h1>Create your account</h1><p>Use the mobile number you give at the counter, and we’ll link your past repairs automatically.</p></div>
      <form id="af" novalidate><div class="f"><label for="aName">Full name</label><input id="aName" name="name" autocomplete="name" placeholder="Sadia Islam"><p class="f-e"></p></div>
      <div class="f-2"><div class="f"><label for="aPhone">Mobile number</label><input id="aPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX"><p class="f-e"></p></div><div class="f"><label for="aEmail">Email</label><input id="aEmail" name="email" type="email" autocomplete="email" placeholder="you@example.com"><p class="f-e"></p></div></div>
      ${pwInput('aPw', 'pw', 'Password', 'new-password')}${pwRulesHtml('aRules')}
      <div class="form-e" role="alert"></div><button class="s-btn primary block lg" type="submit">Create account</button><p class="legal">By creating an account you agree to our Terms and Privacy Policy. We only text you about your repairs.</p></form>
      <p class="au-alt">Already have an account? <a class="lnk" href="#signin">Sign in</a></p>`;
    if (mode === 'forgot') h = `<a class="back" href="#signin">${ic('left', 16)}Back to sign in</a><div class="au-h"><h1>Reset your password</h1><p>Enter the email or mobile number on your account and we’ll send a 6-digit code.</p></div>
      <form id="af" novalidate><div class="f"><label for="aId">Email or mobile number</label><input id="aId" name="id" autocomplete="username"><p class="f-e"></p></div><div class="form-e" role="alert"></div><button class="s-btn primary block lg" type="submit">Send code</button></form>`;
    if (mode === 'reset') { const r = JSON.parse(sessionStorage.getItem('site:reset') || 'null') || {};
      h = `<a class="back" href="#forgot">${ic('left', 16)}Use a different email or number</a><div class="au-h"><h1>Enter your code</h1><p>We sent a 6-digit code to <b>${esc(r.to || 'your account')}</b>.</p></div>
      <div class="demo-code">${ic('mail', 16)}<span>Demo mode: no SMS is sent. Your code is <b>${esc(r.code || '')}</b></span></div>
      <form id="af" novalidate><div class="f"><label for="aCode">6-digit code</label><input id="aCode" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><p class="f-e"></p></div>${pwInput('aPw', 'pw', 'New password', 'new-password')}${pwRulesHtml('aRules')}<div class="form-e" role="alert"></div><button class="s-btn primary block lg" type="submit">Update password</button></form>`; }
    box.innerHTML = h; box.dataset.mode = mode;
    const f = $('#af'); bindForm(f); const rl = $('#aRules'); rl && bindPwRules($('#aPw'), rl);
    const first = f.querySelector('input'); first && first.focus({ preventScroll: true });
    const busy = on => { const b = f.querySelector('[type=submit]'); b.disabled = on; b.classList.toggle('loading', on); };
    if (mode === 'signin') {
      $('#demoAcc').onclick = async () => { const a = Acc.all().find(x => x.demo); if (!a) return formE(f, 'The demo account is still loading. Try again in a moment.'); Acc.start(a); location.href = this.next(); };
      f.onsubmit = async e => { e.preventDefault(); const id = f.id.value.trim(), pw = f.pw.value; let bad = null;
        if (!id) bad = bad || fErr(f, 'id', 'Enter your email or mobile number'); if (!pw) bad = bad || fErr(f, 'pw', 'Enter your password'); if (bad) return bad.focus();
        busy(true); await new Promise(r => setTimeout(r, 300)); const r = await Acc.signIn(id, pw); busy(false); if (r.error) return formE(f, r.error);
        Acc.start(r.a, f.remember.checked); location.href = this.next(); }; }
    if (mode === 'signup') f.onsubmit = async e => { e.preventDefault(); const v = { name: f.name.value.trim(), phone: normPhone(f.phone.value), email: f.email.value.trim().toLowerCase(), pw: f.pw.value }; let bad = null;
      if (v.name.length < 2) bad = bad || fErr(f, 'name', 'Enter your name'); if (!validPhone(v.phone)) bad = bad || fErr(f, 'phone', 'Enter an 11-digit mobile number'); if (!validEmail(v.email)) bad = bad || fErr(f, 'email', 'Enter a valid email'); if (!pwOk(v.pw)) bad = bad || fErr(f, 'pw', 'Use 8+ characters with a letter and a number'); if (bad) return bad.focus();
      if (Acc.find(v.email)) return fErr(f, 'email', 'This email already has an account. Sign in instead.').focus(); if (Acc.find(v.phone)) return fErr(f, 'phone', 'This number already has an account. Sign in instead.').focus();
      busy(true); const a = await Acc.create({ name: v.name, email: v.email, phone: v.phone, password: v.pw }); Acc.start(a); const n = Acc.bookings(a).length;
      sessionStorage.setItem('site:welcome', n ? `Welcome! We found ${n} repair${n > 1 ? 's' : ''} linked to your number.` : 'Welcome! Your account is ready.'); location.href = this.next(); };
    if (mode === 'forgot') f.onsubmit = e => { e.preventDefault(); const id = f.id.value.trim(); if (!id) return fErr(f, 'id', 'Enter your email or mobile number').focus(); const a = Acc.find(id);
      sessionStorage.setItem('site:reset', JSON.stringify({ id: a ? a.id : null, to: id, code: String(Math.floor(100000 + Math.random() * 900000)), exp: Date.now() + 15 * 60e3 })); location.hash = '#reset'; };
    if (mode === 'reset') f.onsubmit = async e => { e.preventDefault(); const r = JSON.parse(sessionStorage.getItem('site:reset') || 'null'); let bad = null;
      if (!/^\d{6}$/.test(f.code.value.trim())) bad = bad || fErr(f, 'code', 'Enter the 6-digit code'); if (!pwOk(f.pw.value)) bad = bad || fErr(f, 'pw', 'Use 8+ characters with a letter and a number'); if (bad) return bad.focus();
      if (!r || Date.now() > r.exp) return formE(f, 'This code has expired. Request a new one.'); if (f.code.value.trim() !== r.code || !r.id) return fErr(f, 'code', 'That code isn’t right').focus();
      const a = Acc.all().find(x => x.id === r.id); a.salt = uid('s'); a.hash = await hashPw(f.pw.value, a.salt); a.failed = 0; a.lockUntil = 0; Acc.update(a); sessionStorage.removeItem('site:reset'); Acc.start(a); sessionStorage.setItem('site:welcome', 'Password updated. You’re signed in.'); location.href = this.next(); };
  }
};

/* ================= ACCOUNT PAGE ================= */
const ACC_NAV = [['overview', 'grid', 'Overview'], ['bookings', 'wrench', 'My bookings'], ['devices', 'phoneDev', 'Devices'], ['addresses', 'mapPin', 'Addresses'], ['profile', 'user', 'Profile'], ['security', 'lock', 'Security']];
const stPill = j => { const tone = { ready: 'ok', delivered: 'mute', cancelled: 'bad', waiting_parts: 'warn' }[j.status] || 'info'; return `<span class="pill ${tone}"><i></i>${j.status === 'waiting_parts' ? 'Waiting for part' : j.status === 'received' ? (j.online ? 'Booked' : 'Received') : JOB_ST[j.status].l}</span>`; };
const Account = {
  me: null,
  init() {
    this.me = Acc.me(); if (!this.me) { location.replace('signin.html?next=' + encodeURIComponent('account.html' + location.hash)); return; }
    addEventListener('hashchange', () => this.draw(true)); this.draw();
    const w = sessionStorage.getItem('site:welcome'); if (w) { sessionStorage.removeItem('site:welcome'); setTimeout(() => say(`${ic('okCircle', 18)}<span>${esc(w)}</span>`), 300); }
    $('#accMain').addEventListener('click', e => this.click(e)); $('#accMain').addEventListener('submit', e => this.submit(e)); $('#accMain').addEventListener('change', e => this.change(e));
  },
  route() { const h = location.hash.slice(1) || 'overview'; const [k, v] = h.split('='); return { k: ACC_NAV.some(n => n[0] === k) || k === 'booking' ? k : 'overview', v }; },
  draw(focus) {
    this.me = Acc.me(); if (!this.me) return location.replace('signin.html'); const { k, v } = this.route(); const me = this.me;
    $('#accSide').innerHTML = `<div class="as-me">${avatarHtml(me.name, 44)}<div><b>${esc(me.name)}</b><small>Member since ${MON[new Date(me.createdAt).getMonth()]} ${new Date(me.createdAt).getFullYear()}</small></div></div>
      <nav aria-label="Account">${ACC_NAV.map(([id, i, l]) => `<a href="#${id}" class="${id === k || (k === 'booking' && id === 'bookings') ? 'on' : ''}" ${id === k ? 'aria-current="page"' : ''}>${ic(i, 18)}<span>${l}</span>${id === 'bookings' ? `<em>${Acc.bookings(me).filter(j => !['delivered', 'cancelled'].includes(j.status)).length || ''}</em>` : ''}</a>`).join('')}<button type="button" data-signout>${ic('logout', 18)}<span>Sign out</span></button></nav>`;
    const m = $('#accMain'); m.innerHTML = this[k](v); paintIcons(m);
    if (focus) { const h = m.querySelector('h1'); h.tabIndex = -1; h.focus({ preventScroll: true }); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    const pw = m.querySelector('#nPw'); pw && bindPwRules(pw, $('#nRules')); $$('form', m).forEach(bindForm);
  },
  jobRow(j) { const t = jobTotals(j); return `<a class="bk-row" href="#booking=${j.code}"><span class="br-art">${art(svcArt(j.issue))}</span><div class="br-t"><b>${esc(j.issue.split(/ [—:] /)[0])}</b><small>${esc(j.code)} · ${esc(j.model)} · ${j.online && j.online.slot ? fmtSlot(j.online.slot) : fmtDate(j.createdAt)}</small></div>${stPill(j)}<span class="br-p">${t.total ? fmtBDT(t.total) : 'Quote pending'}</span>${ic('right', 18)}</a>`; },
  overview() {
    const me = this.me, all = Acc.bookings(me), act = all.filter(j => !['delivered', 'cancelled'].includes(j.status)), done = all.filter(j => j.status === 'delivered');
    const dev = (me.devices.find(d => d.primary) || me.devices[0]); const hr = new Date().getHours();
    return `<header class="acc-h"><div><p class="eyebrow">${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}</p><h1>Welcome back, ${esc(me.name.split(' ')[0])}</h1></div><a class="s-btn primary" href="repairs.html">${ic('plus', 18)}Book a repair</a></header>
      <div class="acc-stats"><div><small>Active repairs</small><b>${act.length}</b></div><div><small>Completed</small><b>${done.length}</b></div><div><small>Under warranty</small><b>${done.filter(j => DB.warranties.some(w => w.jobId === j.id && warStatus(w) !== 'expired' && !w.voided)).length}</b></div><div><small>Saved device</small><b class="sm">${dev ? esc(dev.model) : 'None'}</b></div></div>
      <section class="acc-card"><div class="ac-h"><h2>In progress</h2>${act.length ? `<a class="lnk sm" href="#bookings">View all</a>` : ''}</div>
      ${act.length ? act.slice(0, 3).map(j => { const si = stageIndex(j.status), pct = Math.round(si / (STAGES.length - 1) * 100), nx = STAGES[si + 1];
        return `<a class="lv" href="#booking=${j.code}" style="--p:${pct}%"><div class="lv-top"><span class="lv-dev">${ic('phoneDev', 20)}</span><div class="lv-id"><b>${STATUS_COPY[j.status][0]}</b><small>${esc(j.brand)} ${esc(j.model)} · <span class="lv-code">${esc(j.code)}</span></small></div>${stPill(j)}</div>
        <div class="lv-track" role="img" aria-label="Step ${si + 1} of ${STAGES.length}: ${STAGES[si][1]}"><div class="lv-bar"><i></i></div><ol>${STAGES.map(([s, l], n) => `<li class="${n < si ? 'done' : n === si ? 'cur' : ''}"><i></i><span>${l}</span></li>`).join('')}</ol></div>
        <div class="lv-foot"><p>${STATUS_COPY[j.status][1]}</p><span class="lv-go">${nx ? 'Next: ' + nx[1] : 'Details'}${ic('right', 14)}</span></div></a>`; }).join('') : `<div class="acc-empty">${ic('wrench', 22)}<h3>No repairs in progress</h3><p>When you book, you’ll follow every step here.</p><div><a class="s-btn primary sm" href="repairs.html">Browse repairs</a><button class="s-btn sm" type="button" data-ai-open>Ask the assistant</button></div></div>`}</section>
      <div class="acc-2"><section class="acc-card"><div class="ac-h"><h2>Quick actions</h2></div><div class="qa-grid"><a href="repairs.html">${ic('cart', 20)}<b>Browse repairs</b><small>Prices for ${dev ? esc(dev.model) : 'your phone'}</small></a><button type="button" data-ai-open>${ic('chat', 20)}<b>Ask the assistant</b><small>Describe a problem</small></button><a href="#devices">${ic('phoneDev', 20)}<b>Add a device</b><small>Get the right prices</small></a><a href="index.html#visit">${ic('mapPin', 20)}<b>Visit a branch</b><small>${esc(openState().text)}</small></a></div></section>
      <section class="acc-card"><div class="ac-h"><h2>History</h2></div>${done.length ? done.slice(0, 4).map(j => this.jobRow(j)).join('') : `<p class="muted">Completed repairs and their warranties will appear here.</p>`}</section></div>`;
  },
  bookings() {
    const all = Acc.bookings(this.me), f = this.filter || 'all';
    const list = all.filter(j => f === 'all' || (f === 'active' ? !['delivered', 'cancelled'].includes(j.status) : f === 'done' ? j.status === 'delivered' : j.status === 'cancelled'));
    const c = k => all.filter(j => k === 'all' || (k === 'active' ? !['delivered', 'cancelled'].includes(j.status) : k === 'done' ? j.status === 'delivered' : j.status === 'cancelled')).length;
    return `<header class="acc-h"><div><h1>My bookings</h1><p class="sub">Every repair linked to ${esc(this.me.phone)}.</p></div><a class="s-btn primary" href="repairs.html">${ic('plus', 18)}New booking</a></header>
      <div class="tabs" role="tablist">${[['all', 'All'], ['active', 'In progress'], ['done', 'Completed'], ['cancelled', 'Cancelled']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${f === k}" data-filter="${k}">${l}<span>${c(k)}</span></button>`).join('')}</div>
      <section class="acc-card flush">${list.length ? list.map(j => this.jobRow(j)).join('') : `<div class="acc-empty">${ic('wrench', 22)}<h3>Nothing here yet</h3><p>${f === 'all' ? 'Book your first repair online or at a branch.' : 'No bookings with this status.'}</p>${f === 'all' ? `<div><a class="s-btn primary sm" href="repairs.html">Browse repairs</a></div>` : ''}</div>`}</section>`;
  },
  booking(code) {
    const j = Acc.bookings(this.me).find(x => x.code === code); if (!j) return `<header class="acc-h"><h1>Booking not found</h1></header><p class="muted">This booking isn’t linked to your account. <a class="lnk" href="#bookings">Back to bookings</a></p>`;
    const t = jobTotals(j), o = j.online || {}, br = SHOP.branches.find(b => b.id === j.branch) || SHOP.branches[0], can = j.status === 'received';
    const items = (o.items || []).map(it => { const s = svcById(it.id); return s ? `<li><span class="l-art">${art(META[s.id].art)}</span><div><b>${s.name}</b><small>${GRADED.includes(s.id) && GRADES[it.q] ? GRADES[it.q][0] : s.time}</small></div></li>` : ''; }).join('') + j.parts.map(p => `<li><span class="l-art">${art(addonArt(p.name))}</span><div><b>${esc(p.name)}</b><small>${p.qty} × ${fmtBDT(p.price)}</small></div></li>`).join('');
    return `<a class="back" href="#bookings">${ic('left', 16)}All bookings</a>
      <header class="acc-h"><div><p class="eyebrow">${esc(j.brand)} ${esc(j.model)}${o.bookedAt ? ' · booked ' + fmtTs(o.bookedAt) : ''}</p><h1>Booking ${esc(j.code)}</h1></div></header>
      <div class="acc-detail"><div>${trackCard({ job: j, customer: custOf(j.custId), totals: t }, false).replace('<div class="trk ', '<div class="trk acc-card ')}
        ${items ? `<section class="acc-card"><div class="ac-h"><h2>What’s booked</h2></div><ul class="bd-items">${items}</ul></section>` : `<section class="acc-card"><div class="ac-h"><h2>Repair</h2></div><p>${esc(j.issue)}</p></section>`}</div>
        <aside class="acc-side2"><section class="acc-card"><dl class="kv"><div><dt>${o.handoff === 'pickup' ? 'Pickup' : 'Drop-off'}</dt><dd>${o.handoff === 'pickup' ? esc(o.address) : br.name + ' branch'}</dd></div><div><dt>When</dt><dd>${o.slot ? fmtSlot(o.slot) : fmtDate(j.createdAt)}</dd></div><div><dt>Ready by</dt><dd>${fmtDate(j.due)}</dd></div><div><dt>Payment</dt><dd>${esc(o.pay || 'At collection')}</dd></div><div class="tot2"><dt>${t.due > 0 ? 'Estimated total' : 'Paid'}</dt><dd>${t.total ? fmtBDT(t.due > 0 ? t.total : t.paid) : 'After check'}</dd></div></dl></section>
        <section class="acc-card acts">${can ? `<button class="s-btn block" type="button" data-resched="${j.code}">${ic('calendar', 18)}Reschedule</button>` : ''}<button class="s-btn block" type="button" data-ai-open data-ai-say="I have a question about ${esc(j.code)}">${ic('chat', 18)}Ask about this repair</button>${(o.items || []).length ? `<button class="s-btn block" type="button" data-rebook="${j.code}">${ic('refresh', 18)}Book this again</button>` : ''}${can ? `<button class="s-btn block danger-o" type="button" data-cancel="${j.code}">${ic('x', 18)}Cancel booking</button>` : ''}
        ${can ? '' : `<p class="muted sm">${j.status === 'cancelled' ? 'This booking was cancelled.' : `You can’t change the booking once your phone is with us. Call ${esc(SHOP.phone)} if plans change.`}</p>`}</section></aside></div>`;
  },
  devices() {
    const me = this.me, brands = [...new Set(MODELS.map(m => m.brand))];
    return `<header class="acc-h"><div><h1>Devices</h1><p class="sub">Your primary device sets the prices you see across the site.</p></div></header>
      <section class="acc-card flush">${me.devices.length ? me.devices.map(d => `<div class="dv-row"><span class="br-art">${art('screen')}</span><div class="br-t"><b>${esc(d.model)}</b><small>${esc(d.brand)}${d.primary ? ' · Primary' : ''}</small></div>${d.primary ? `<span class="pill info"><i></i>Primary</span>` : `<button class="s-btn sm" type="button" data-dev-primary="${d.id}">Make primary</button>`}<a class="s-btn sm ghost" href="repairs.html" data-dev-shop="${d.id}">See prices</a><button class="icon-x" type="button" data-dev-rm="${d.id}" aria-label="Remove ${esc(d.model)}">${ic('trash', 18)}</button></div>`).join('') : `<div class="acc-empty">${ic('phoneDev', 22)}<h3>No devices yet</h3><p>Add your phone to see the right prices instantly.</p></div>`}</section>
      <form class="acc-card form-card" id="devForm" novalidate><h2>Add a device</h2><div class="f-2"><div class="f"><label for="dvBrand">Brand</label><div class="sel"><select id="dvBrand" name="brand">${brands.map(b => `<option>${b}</option>`).join('')}<option>Other</option></select>${ic('down', 18)}</div></div><div class="f"><label for="dvModel">Model</label><div class="sel" id="dvModelWrap"><select id="dvModel" name="model">${MODELS.filter(m => m.brand === brands[0]).map(m => `<option value="${m.id}">${m.model}</option>`).join('')}</select>${ic('down', 18)}</div><p class="f-e"></p></div></div><div class="f-act"><button class="s-btn primary" type="submit">${ic('plus', 18)}Add device</button></div></form>`;
  },
  addresses() {
    const me = this.me;
    return `<header class="acc-h"><div><h1>Addresses</h1><p class="sub">Saved for courier pickup at checkout.</p></div></header>
      <div class="addr-grid">${me.addresses.map(a => `<div class="acc-card addr"><div class="ad-h"><b>${esc(a.label)}</b>${a.primary ? `<span class="pill info"><i></i>Default</span>` : ''}</div><p>${esc(a.line)}<br>${esc(a.area)}</p><div class="ad-a">${a.primary ? '' : `<button class="lnk sm" type="button" data-addr-primary="${a.id}">Make default</button>`}<button class="lnk sm" type="button" data-addr-edit="${a.id}">Edit</button><button class="lnk sm danger" type="button" data-addr-rm="${a.id}">Remove</button></div></div>`).join('')}
      <button class="acc-card addr add" type="button" data-addr-new>${ic('plus', 22)}<b>Add an address</b></button></div>
      <div id="addrFormWrap"></div>`;
  },
  addrForm(a) { return `<form class="acc-card form-card" id="addrForm" novalidate data-id="${a ? a.id : ''}"><h2>${a ? 'Edit address' : 'New address'}</h2><div class="f-2"><div class="f"><label for="adLabel">Label</label><input id="adLabel" name="label" value="${esc(a ? a.label : 'Home')}" placeholder="Home, Office…"><p class="f-e"></p></div><div class="f"><label for="adArea">Area & city</label><input id="adArea" name="area" value="${esc(a ? a.area : '')}" placeholder="Banani, Dhaka 1213"><p class="f-e"></p></div></div><div class="f"><label for="adLine">House, road, flat</label><input id="adLine" name="line" autocomplete="street-address" value="${esc(a ? a.line : '')}" placeholder="Flat 4B, House 18, Road 7"><p class="f-e"></p></div><label class="check"><input type="checkbox" name="primary" ${!a || a.primary ? 'checked' : ''}><span>Use as default pickup address</span></label><div class="f-act"><button class="s-btn ghost" type="button" data-addr-cancel>Cancel</button><button class="s-btn primary" type="submit">Save address</button></div></form>`; },
  profile() {
    const me = this.me;
    return `<header class="acc-h"><div><h1>Profile</h1><p class="sub">Your details and how we contact you.</p></div></header>
      <form class="acc-card form-card" id="profForm" novalidate><h2>Personal details</h2><div class="f-2"><div class="f"><label for="pName">Full name</label><input id="pName" name="name" autocomplete="name" value="${esc(me.name)}"><p class="f-e"></p></div><div class="f"><label for="pEmail">Email</label><input id="pEmail" name="email" type="email" autocomplete="email" value="${esc(me.email)}"><p class="f-e"></p></div></div>
      <div class="f"><label for="pPhone">Mobile number</label><input id="pPhone" name="phone" type="tel" autocomplete="tel" value="${esc(me.phone)}"><p class="f-h">Repairs are linked to this number. Changing it shows repairs for the new number.</p><p class="f-e"></p></div>
      <h2 class="mt">Notifications</h2><div class="toggles">${[['sms', 'Repair updates by SMS', 'Status changes, ready for pickup'], ['email', 'Receipts by email', 'Invoices and warranty documents'], ['offers', 'Occasional offers', 'At most once a month']].map(([k, l, d]) => `<label class="tg"><span><b>${l}</b><small>${d}</small></span><input type="checkbox" role="switch" name="pref_${k}" ${me.prefs[k] ? 'checked' : ''}><i aria-hidden="true"></i></label>`).join('')}</div>
      <div class="f-act"><button class="s-btn primary" type="submit">Save changes</button></div></form>`;
  },
  security() {
    return `<header class="acc-h"><div><h1>Security</h1><p class="sub">Password and account access.</p></div></header>
      <form class="acc-card form-card" id="pwForm" novalidate><h2>Change password</h2>${pwInput('cPw', 'cur', 'Current password', 'current-password')}${pwInput('nPw', 'pw', 'New password', 'new-password')}${pwRulesHtml('nRules')}<div class="form-e" role="alert"></div><div class="f-act"><button class="s-btn primary" type="submit">Update password</button></div></form>
      <section class="acc-card"><h2>Signed-in device</h2><div class="sess"><span>${ic('phoneDev', 20)}</span><div><b>This browser</b><small>Last sign-in ${fmtTs(this.me.lastLogin || Date.now())}</small></div><button class="s-btn sm" type="button" data-signout>Sign out</button></div></section>
      <section class="acc-card danger-zone"><h2>Delete account</h2><p>Removes your online account and saved details. Your repair records and warranties stay with the shop.</p><button class="s-btn danger-o" type="button" data-del-acc>${ic('trash', 18)}Delete my account</button></section>`;
  },
  click(e) {
    const t = e.target, me = this.me;
    const f = t.closest('[data-filter]'); if (f) { this.filter = f.dataset.filter; return this.draw(); }
    const rs = t.closest('[data-resched]'); if (rs) return this.resched(rs.dataset.resched);
    const cn = t.closest('[data-cancel]'); if (cn) return this.confirmBox('Cancel this booking?', 'We’ll release your time slot and any reserved add-ons. You can book again anytime.', 'Cancel booking', () => {
      Bridge.reload(); const j = DB.jobs.find(x => x.code === cn.dataset.cancel); if (!j || j.status !== 'received') return; USER = null; [...j.parts].forEach(p => removeJobPart(j, p.id)); setJobStatus(j, 'cancelled', 'Cancelled by customer online'); saveNow(); this.draw(); say(`${ic('okCircle', 18)}<span>Booking ${esc(j.code)} cancelled</span>`); });
    const rb = t.closest('[data-rebook]'); if (rb) { const j = Acc.bookings(me).find(x => x.code === rb.dataset.rebook); Shop.setDevice(MODELS.find(m => m.model === j.model) || { id: 'custom', brand: j.brand, model: j.model, tier: 2 }); (j.online.items || []).forEach(it => Shop.add(it.id, it.q === 'tbd' ? 'compatible' : it.q, true)); return Shop.openCart(); }
    const dp = t.closest('[data-dev-primary]'); if (dp) { me.devices.forEach(d => d.primary = d.id === dp.dataset.devPrimary); Acc.update(me); Shop.setDevice(devFrom(me.devices.find(d => d.primary))); return this.draw(); }
    const ds = t.closest('[data-dev-shop]'); if (ds) { Shop.setDevice(devFrom(me.devices.find(d => d.id === ds.dataset.devShop))); return; }
    const dr = t.closest('[data-dev-rm]'); if (dr) { const was = me.devices.find(d => d.id === dr.dataset.devRm); me.devices = me.devices.filter(d => d !== was); if (was.primary && me.devices[0]) me.devices[0].primary = true; Acc.update(me); this.draw(); return say(`${ic('okCircle', 18)}<span>${esc(was.model)} removed</span>`); }
    if (t.closest('[data-addr-new]')) { $('#addrFormWrap').innerHTML = this.addrForm(null); bindForm($('#addrForm')); return $('#adLabel').focus(); }
    const ae = t.closest('[data-addr-edit]'); if (ae) { $('#addrFormWrap').innerHTML = this.addrForm(me.addresses.find(a => a.id === ae.dataset.addrEdit)); bindForm($('#addrForm')); return $('#adLine').focus(); }
    if (t.closest('[data-addr-cancel]')) { $('#addrFormWrap').innerHTML = ''; return; }
    const ap = t.closest('[data-addr-primary]'); if (ap) { me.addresses.forEach(a => a.primary = a.id === ap.dataset.addrPrimary); Acc.update(me); return this.draw(); }
    const ar = t.closest('[data-addr-rm]'); if (ar) { const was = me.addresses.find(a => a.id === ar.dataset.addrRm); me.addresses = me.addresses.filter(a => a !== was); if (was.primary && me.addresses[0]) me.addresses[0].primary = true; Acc.update(me); return this.draw(); }
    if (t.closest('[data-del-acc]')) return this.confirmBox('Delete your account?', 'Type DELETE to confirm. This can’t be undone.', 'Delete account', () => { Acc.saveAll(Acc.all().filter(a => a.id !== me.id)); Acc.signOut(); location.href = 'index.html'; }, 'DELETE');
  },
  change(e) { if (e.target.id === 'dvBrand') { const b = e.target.value, w = $('#dvModelWrap'); w.innerHTML = b === 'Other' ? `<input id="dvModel" name="model" placeholder="e.g. Nokia G42">` : `<select id="dvModel" name="model">${MODELS.filter(m => m.brand === b).map(m => `<option value="${m.id}">${m.model}</option>`).join('')}</select>${ic('down', 18)}`; } },
  async submit(e) {
    e.preventDefault(); const f = e.target, me = this.me;
    if (f.id === 'devForm') { const b = f.brand.value, v = f.model.value.trim(); if (!v) return fErr(f, 'model', 'Enter your model').focus(); const d = b === 'Other' ? { id: 'custom', brand: 'Other', model: v.replace(/\b\w/g, c => c.toUpperCase()), tier: 2 } : MODELS.find(m => m.id === v);
      if (me.devices.some(x => x.model === d.model)) return fErr(f, 'model', 'Already saved').focus(); me.devices.forEach(x => x.primary = false); me.devices.push({ id: uid('d'), ...devRef(d), primary: true }); Acc.update(me); Shop.setDevice(d); this.draw(); return say(`${ic('okCircle', 18)}<span>${esc(d.model)} added and set as primary</span>`); }
    if (f.id === 'addrForm') { const v = { label: f.label.value.trim() || 'Address', area: f.area.value.trim(), line: f.line.value.trim() }; let bad = null; if (v.line.length < 5) bad = bad || fErr(f, 'line', 'Enter house, road and flat'); if (v.area.length < 3) bad = bad || fErr(f, 'area', 'Enter the area'); if (bad) return bad.focus();
      let a = me.addresses.find(x => x.id === f.dataset.id); if (!a) { a = { id: uid('ad') }; me.addresses.push(a); } Object.assign(a, v); if (f.primary.checked || me.addresses.length === 1) me.addresses.forEach(x => x.primary = x === a); Acc.update(me); this.draw(); return say(`${ic('okCircle', 18)}<span>Address saved</span>`); }
    if (f.id === 'profForm') { const v = { name: f.name.value.trim(), email: f.email.value.trim().toLowerCase(), phone: normPhone(f.phone.value) }; let bad = null;
      if (v.name.length < 2) bad = bad || fErr(f, 'name', 'Enter your name'); if (!validEmail(v.email)) bad = bad || fErr(f, 'email', 'Enter a valid email'); if (!validPhone(v.phone)) bad = bad || fErr(f, 'phone', 'Enter an 11-digit mobile number'); if (bad) return bad.focus();
      const o1 = Acc.find(v.email), o2 = Acc.find(v.phone); if (o1 && o1.id !== me.id) return fErr(f, 'email', 'Another account uses this email').focus(); if (o2 && o2.id !== me.id) return fErr(f, 'phone', 'Another account uses this number').focus();
      Object.assign(me, v, { name: v.name.replace(/\b\w/g, c => c.toUpperCase()) }); ['sms', 'email', 'offers'].forEach(k => me.prefs[k] = f.elements['pref_' + k].checked); Acc.update(me); renderChrome(); initNav(); this.draw(); return say(`${ic('okCircle', 18)}<span>Profile saved</span>`); }
    if (f.id === 'pwForm') { if (!f.cur.value) return fErr(f, 'cur', 'Enter your current password').focus(); if (!pwOk(f.pw.value)) return fErr(f, 'pw', 'Use 8+ characters with a letter and a number').focus();
      if (await hashPw(f.cur.value, me.salt) !== me.hash) return fErr(f, 'cur', 'That isn’t your current password').focus(); me.salt = uid('s'); me.hash = await hashPw(f.pw.value, me.salt); Acc.update(me); f.reset(); $$('#nRules li').forEach(l => l.classList.remove('ok')); return say(`${ic('okCircle', 18)}<span>Password updated</span>`); }
  },
  resched(code) {
    Bridge.reload(); const j = DB.jobs.find(x => x.code === code); const days = slotDays(5); let sel = j.online.slot; let day = days.find(d => sel && d.date === sel.date) || days[0];
    const body = () => `<div class="seg days" role="radiogroup" aria-label="Day">${days.map(x => `<button type="button" role="radio" aria-checked="${x.date === day.date}" data-rd="${x.date}">${x.label}</button>`).join('')}</div><div class="times">${day.times.map(t => `<button type="button" data-rt="${t}" aria-pressed="${!!(sel && sel.date === day.date && sel.time === t)}">${t}</button>`).join('')}</div>`;
    openLayer('rs', `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="rsT"><h2 id="rsT">Pick a new time</h2><p class="muted">${esc(code)} · currently ${fmtSlot(j.online.slot)}</p><div id="rsBody">${body()}</div><div class="dlg-a"><button class="s-btn ghost" type="button" data-close-layer>Keep current time</button><button class="s-btn primary" type="button" data-rs-ok>Save new time</button></div></div>`, w => {
      w.addEventListener('click', e => { const d = e.target.closest('[data-rd]'); if (d) { day = days.find(x => x.date === d.dataset.rd); $('#rsBody').innerHTML = body(); }
        const tm = e.target.closest('[data-rt]'); if (tm) { sel = { date: day.date, time: tm.dataset.rt }; $('#rsBody').innerHTML = body(); }
        if (e.target.closest('[data-rs-ok]')) { if (!sel || sel.date !== day.date && !days.some(x => x.date === sel.date)) return; Bridge.reload(); const jj = DB.jobs.find(x => x.code === code); const old = fmtSlot(jj.online.slot); jj.online.slot = sel; jj.due = addDays(sel.date, 1); USER = null; logJob(jj, `Customer rescheduled online: ${old} → ${fmtSlot(sel)}`); saveNow(); closeLayer(); this.draw(); say(`${ic('okCircle', 18)}<span>Moved to ${fmtSlot(sel)}</span>`); } }); });
  },
  confirmBox(title, text, cta, fn, typed) {
    openLayer('cf', `<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="cfT"><h2 id="cfT">${title}</h2><p class="muted">${text}</p>${typed ? `<div class="f"><label for="cfIn" class="sr">Type ${typed}</label><input id="cfIn" autocomplete="off" placeholder="${typed}"></div>` : ''}<div class="dlg-a"><button class="s-btn ghost" type="button" data-close-layer>Keep it</button><button class="s-btn danger" type="button" data-cf-ok ${typed ? 'disabled' : ''}>${cta}</button></div></div>`, w => {
      const ok = w.querySelector('[data-cf-ok]'); if (typed) w.querySelector('#cfIn').addEventListener('input', e => ok.disabled = e.target.value.trim() !== typed);
      ok.onclick = () => { closeLayer(); fn(); }; });
  }
};
const svcArt = issue => { const s = SERVICES.find(x => issue.toLowerCase().startsWith(x.name.toLowerCase())) || SERVICES.find(x => x.re.test(issue.toLowerCase())); return s ? META[s.id].art : 'diag'; };
