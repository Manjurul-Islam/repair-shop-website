'use strict';
/* ---------- session ---------- */
const SESS = 'qf:session';
function getSessionUser() {
  let s = null; try { s = JSON.parse(sessionStorage.getItem(SESS) || localStorage.getItem(SESS) || 'null'); } catch (e) { }
  if (!s) return null; const u = getUsers().find(x => x.id === s.uid); if (!u || u.status === 'inactive') return null; return u;
}
function startSession(u, remember = true) {
  localStorage.removeItem(SESS); sessionStorage.removeItem(SESS);
  (remember ? localStorage : sessionStorage).setItem(SESS, JSON.stringify({ uid: u.id, at: Date.now() }));
  u.lastLogin = Date.now(); u.failed = 0; u.lockUntil = 0; saveUser(u); loadWorkspace(u);
}
function loadWorkspace(u) { USER = u; DB = LS.get('qf:ws:' + u.wsId, null); if (!DB) { DB = newDB('My shop'); DB.id = u.wsId; saveNow(); } if (ensureShopConfig(DB)) saveNow(); }
function logout(msg) {
  saveNow(); localStorage.removeItem(SESS); sessionStorage.removeItem(SESS); USER = null; DB = null; closeMenu(); [...STACK].forEach(h => h.close(true));
  Shell.teardown && Shell.teardown(); location.hash = '#/login'; if (msg) setTimeout(() => toast(msg), 200);
}
async function makeUser({ name, email, password, role, wsId, phone = '' }) {
  const salt = uid('s'); return { id: uid('u'), name, email: email.toLowerCase().trim(), salt, hash: await hashPw(password, salt), role, wsId, phone, status: 'active', createdAt: Date.now(), lastLogin: 0, failed: 0, lockUntil: 0 };
}
async function createAccount({ name, email, password, shop }) {
  const db = newDB(shop); const u = await makeUser({ name, email, password, role: 'owner', wsId: db.id });
  setUsers([...getUsers(), u]); LS.set('qf:ws:' + db.id, db); return { u, db };
}
async function addSampleData(db, owner) {
  const staff = [['Rahim Uddin', 'rahim', 'technician'], ['Sabbir Khan', 'sabbir', 'technician'], ['Nusrat Jahan', 'nusrat', 'cashier']];
  const made = []; for (const [n, e, r] of staff) made.push(await makeUser({ name: n, email: `${e}@${db.id.slice(2, 8)}.benchly.demo`, password: 'Welcome123', role: r, wsId: db.id, phone: '01712' + String(Math.floor(Math.random() * 900000 + 100000)) }));
  setUsers([...getUsers(), ...made]);
  seedSample(db, [owner.id, made[0].id, made[1].id], made[2].id);
}
async function ensureDemo() {
  const legacy = getUsers().find(u => u.email === 'demo@quickfix.app'); if (legacy) { legacy.email = 'demo@benchly.app'; saveUser(legacy); const w = LS.get('qf:ws:' + legacy.wsId, null); if (w && w.settings.shop === 'QuickFix') { w.settings.shop = 'Dhanmondi Mobile Care'; LS.set('qf:ws:' + w.id, w); } }
  if (getUsers().some(u => u.email === 'demo@benchly.app')) return;
  const { u, db } = await createAccount({ name: 'Demo Owner', email: 'demo@benchly.app', password: 'Demo@1234', shop: 'Dhanmondi Mobile Care' });
  await addSampleData(db, u); db.onboarding.dismissed = true; LS.set('qf:ws:' + db.id, db);
}
function pwStrength(p) { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(4, s); }

/* ---------- auth screens ---------- */
/* Login illustration: the repair bench — a cutting mat, the phone being fixed, its part
   tray and the receipt. Each feature step lights up its part of the bench. */
function benchArt() {
  const grid = Array.from({ length: 11 }, (_, i) => `<path d="M${20 + i * 40} 20V300"/>`).join('') + Array.from({ length: 8 }, (_, i) => `<path d="M20 ${20 + i * 40}H420"/>`).join('');
  return `<svg class="bench" viewBox="0 0 440 320" role="img" aria-label="A phone on a repair bench with its replacement part and receipt">
  <defs><linearGradient id="bnScr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B76E8"/><stop offset="1" stop-color="#1B3F9E"/></linearGradient>
  <linearGradient id="bnMat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity=".02"/></linearGradient>
  <radialGradient id="bnGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6FA3FF" stop-opacity=".45"/><stop offset="1" stop-color="#6FA3FF" stop-opacity="0"/></radialGradient></defs>
  <rect x="20" y="20" width="400" height="280" rx="22" fill="url(#bnMat)" stroke="rgba(255,255,255,.14)"/>
  <g class="bn-grid" stroke="rgba(255,255,255,.06)">${grid}</g>
  <g class="bn-ruler" fill="rgba(255,255,255,.35)">${Array.from({ length: 20 }, (_, i) => `<rect x="${34 + i * 19}" y="28" width="1" height="${i % 5 ? 5 : 9}"/>`).join('')}</g>
  <ellipse class="bn-glow" cx="160" cy="170" rx="120" ry="110" fill="url(#bnGlow)"/>
  <!-- tools -->
  <g class="bn-tool" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none" stroke-linecap="round"><path d="M58 248l40-40"/><path d="M96 204l8-8 6 6-8 8z" fill="rgba(255,255,255,.2)"/><path d="M60 272l52-6" opacity=".6"/></g>
  <!-- phone -->
  <g class="bn-phone" transform="rotate(-8 160 165)">
    <rect x="112" y="62" width="100" height="200" rx="20" fill="#0A1A44" stroke="rgba(255,255,255,.75)" stroke-width="2"/>
    <rect x="120" y="70" width="84" height="184" rx="14" fill="url(#bnScr)"/>
    <rect x="148" y="76" width="28" height="7" rx="3.5" fill="#0A1A44"/>
    <g class="bn-crack" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"><path pathLength="1" d="M182 98l-18 34 10 10-22 42 6 8-12 24"/><path pathLength="1" d="M164 132l-20 -6M174 142l18 10M152 184l-14 4"/></g>
    <g class="bn-ok"><circle cx="162" cy="162" r="22" fill="rgba(255,255,255,.16)"/><path d="M151 162l8 8 15-16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
  </g>
  <!-- bag tag on a string -->
  <g class="bn-tag"><path d="M212 96c22-8 34-2 46 10" stroke="rgba(255,255,255,.4)" fill="none" stroke-dasharray="3 3"/>
    <g transform="rotate(10 282 112)"><rect x="254" y="98" width="72" height="28" rx="6" fill="#F8FAFF"/><circle cx="264" cy="112" r="3" fill="#0A1A44"/><text x="272" y="116" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="700" fill="#0A1A44">#A-2291</text></g></g>
  <!-- part tray -->
  <g class="bn-tray" transform="translate(0 -6)"><rect x="268" y="150" width="128" height="86" rx="14" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.22)" stroke-dasharray="4 4"/>
    <g class="bn-part"><rect x="286" y="164" width="52" height="60" rx="8" fill="#0F2A6B" stroke="#A9C4FF" stroke-width="1.5"/><path d="M298 176h28M298 184h20" stroke="#A9C4FF" stroke-width="1.5" opacity=".7"/><rect x="346" y="176" width="34" height="8" rx="4" fill="#A9C4FF" opacity=".5"/><rect x="346" y="190" width="22" height="8" rx="4" fill="#A9C4FF" opacity=".3"/></g></g>
  <!-- receipt -->
  <g class="bn-receipt-w" transform="translate(4 16)"><g class="bn-receipt"><path d="M290 258h96v-6l-8 4-8-4-8 4-8-4-8 4-8-4-8 4-8-4-8 4-8-4-8 4-8-4z" fill="#F8FAFF"/><rect x="290" y="222" width="96" height="36" fill="#F8FAFF"/><rect x="300" y="232" width="40" height="5" rx="2.5" fill="#C9D6EF"/><rect x="300" y="243" width="26" height="5" rx="2.5" fill="#C9D6EF"/><text x="378" y="248" text-anchor="end" font-family="Inter,system-ui,sans-serif" font-size="12" font-weight="700" fill="#15803D">PAID</text></g></g>
  </svg>`;
}
function mountAuthStory() {
  const story = document.querySelector('.auth-story');
  if (!story || story.dataset.mounted) return;
  story.dataset.mounted = 'true';
  /* cursor spotlight on the grid — eased so it glides, never snaps */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pat = story.querySelector('.story-pattern'); let tx = 0, ty = 0, x = 0, y = 0, on = 0, ton = 0, raf = 0;
    const content = () => [...story.querySelectorAll('.story-brand,.story-copy,.story-steps')];
    const setCut = () => { const r = story.getBoundingClientRect(), c = story.querySelector('.story-copy'); if (c) pat.style.setProperty('--cut', Math.round(c.getBoundingClientRect().top - r.top - 24) + 'px'); };
    setCut(); addEventListener('resize', setCut);
    const loop = () => { x += (tx - x) * .085; y += (ty - y) * .085; on += (ton - on) * .07;
      pat.style.setProperty('--mx', x.toFixed(1) + 'px'); pat.style.setProperty('--my', y.toFixed(1) + 'px'); pat.style.setProperty('--on', on.toFixed(3));
      raf = (Math.abs(tx - x) > .2 || Math.abs(ty - y) > .2 || Math.abs(ton - on) > .002) && story.isConnected ? requestAnimationFrame(loop) : 0; };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    story.addEventListener('pointermove', e => { const r = story.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top;
      const over = content().some(el => { const b = el.getBoundingClientRect(); return e.clientX >= b.left - 12 && e.clientX <= b.right + 12 && e.clientY >= b.top - 12 && e.clientY <= b.bottom + 12; });
      if (on < .02) { x = tx; y = ty; } ton = over ? 0 : 1; kick(); });
    story.addEventListener('pointerleave', () => { ton = 0; kick(); });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 0, elapsed = 0, last = performance.now(), paused = reduced.matches;
  const buttons = [...story.querySelectorAll('[data-feature]')];
  const paint = () => {
    buttons.forEach((b,n) => { b.classList.toggle('current',n===phase); b.setAttribute('aria-pressed',String(n===phase)); b.querySelector('.feature-progress i').style.transform = `scaleX(${n===phase ? elapsed/6000 : 0})`; });
    story.querySelectorAll('[data-scene]').forEach((p,n) => { p.classList.toggle('active',n===phase); p.setAttribute('aria-hidden',String(n!==phase)); });
    story.querySelector('[data-story]').dataset.phase = phase;
  };
  buttons.forEach((b,n) => b.addEventListener('click',() => { phase=n;elapsed=0;last=performance.now();paint(); }));
  const timer = setInterval(() => {
    if (!story.isConnected) { clearInterval(timer); return; }
    const now=performance.now(), delta=now-last;last=now;
    if (!paused && !document.hidden && !buttons.some(b=>b.matches(':hover') || b===document.activeElement)) {
      elapsed+=Math.min(delta,150); if(elapsed>=6000){ phase=(phase+1)%3;elapsed=0; } paint();
    }
  },80);
  paint();
}
function authShell(inner, mode = 'onboarding') {
  queueMicrotask(mountAuthStory);
  const features=[['wrench','Repairs','Check-in to handoff'],['package','Inventory','Parts always accounted for'],['wallet','Payments','Invoices and cash, clear']];
  const slides=[
    {icon:'wrench',label:'Repair RJ-1087',title:'iPhone 13 · Screen replacement',status:'Ready for pickup',rows:[['Received','18 Nov'],['Repaired','20 Nov'],['Quality check','Passed']]},
    {icon:'package',label:'Inventory',title:'iPhone 13 OLED display',status:'12 in stock',rows:[['Reorder level','4 units'],['Used this week','3'],['Supplier','Star Display House']]},
    {icon:'wallet',label:'Invoice INV-0128',title:'৳3,200.00 received',status:'Paid in full',rows:[['Parts','৳2,400.00'],['Labour','৳800.00'],['Method','bKash']]}];
  return `<div class="auth-stage"><div class="auth auth-redesign" data-auth-mode="${mode}">
    <aside class="auth-story" aria-label="About Benchly"><a href="#/login" class="story-brand" aria-label="Benchly home">${LOGO(32)}<span>Benchly</span></a>
    <div class="story-pattern" aria-hidden="true"><i class="sp-grid"></i><i class="sp-glow"></i><span class="sp-hover"><i class="sp-spot"></i><i class="sp-lit"></i></span></div><span data-story hidden></span>
    <div class="story-copy"><h2>Run your repair shop<br>from one calm workspace.</h2><p>Repairs, parts, payments and your team — connected from check-in to handoff.</p></div>
    <div class="story-steps" role="group" aria-label="Benchly features">${features.map(([i,t,s],n)=>`<button type="button" class="feature-step ${n===0?'current':''}" data-feature="${n}" aria-pressed="${n===0}"><span class="feature-top">${ic(i,18)}</span><b>${t}</b><small>${s}</small><span class="feature-progress"><i></i></span></button>`).join('')}</div>
    </aside>
    <main class="auth-main"><div class="auth-brand mobile-brand">${LOGO(28)}<span>Benchly</span></div><div class="auth-box">${inner}</div><div class="auth-foot"><span>© ${new Date().getFullYear()} Benchly</span><span>${ic('lock',14)}Data stays in this browser (demo)</span></div></main>
  </div></div>`;
}
const pwField = (name, label, ac, extra = '', aside = '') => `<div class="field" data-f="${name}"><div class="label-row"><label for="a_${name}">${label}</label>${aside}</div><div class="inp-wrap pw"><input class="inp" type="password" id="a_${name}" name="${name}" autocomplete="${ac}" ${extra}><button type="button" class="pw-t" data-pw aria-label="Show password" aria-pressed="false">${ic('eye', 18)}</button></div><div class="caps" hidden>${ic('alert',14)}Caps Lock is on</div><div class="err" role="alert"></div></div>`;
const txtField = (name, label, type = 'text', ac = 'off', extra = '', hint = '') => `<div class="field" data-f="${name}"><label for="a_${name}">${label}</label><input class="inp" type="${type}" id="a_${name}" name="${name}" autocomplete="${ac}" ${extra}>${hint}<div class="err" role="alert"></div></div>`;
const pwRules = () => `<ul class="pw-rules" id="pwRules" aria-live="polite"><li data-r="len">${ic('check',14)}At least 8 characters</li><li data-r="let">${ic('check',14)}A letter</li><li data-r="num">${ic('check',14)}A number</li></ul>`;
const formError = () => `<div class="form-err" id="formErr" role="alert"></div>`;

function authView(mode) {
  const root = $('#root'); root.className = ''; let h = '';
  if (mode === 'login') h = `<div class="auth-head"><h1>Sign in to Benchly</h1><p class="sub">Welcome back. Pick up where your shop left off.</p></div>
  <form id="authForm" novalidate>${txtField('email', 'Email', 'email', 'username', 'placeholder="you@shop.com" inputmode="email"')}${pwField('password', 'Password', 'current-password', '', '<a href="#/forgot" class="lnk sm">Forgot password?</a>')}
  <label class="check remember"><input type="checkbox" name="remember" checked><span>Keep me signed in on this device</span></label>
  ${formError()}<button class="btn primary lg block" type="submit">Sign in</button></form>
  <div class="or"><span>or</span></div><button type="button" class="btn lg block" id="demoBtn">${ic('zap',18)}Explore the demo workspace</button>
  <div class="auth-card-bottom">New to Benchly? <a href="#/signup" class="lnk">Create an account</a></div>`;
  if (mode === 'signup') h = `<div class="auth-head"><h1>Create your workspace</h1><p class="sub">Set up your shop in under two minutes. No card needed.</p></div>
  <form id="authForm" novalidate><div class="two">${txtField('name', 'Your name', 'text', 'name', 'placeholder="Rafiq Ahmed"')}${txtField('shop', 'Shop name', 'text', 'organization', 'placeholder="Dhanmondi Mobile Care"')}</div>${txtField('email', 'Work email', 'email', 'username', 'placeholder="you@shop.com" inputmode="email"')}
  ${pwField('password', 'Password', 'new-password', 'aria-describedby="pwRules"')}${pwRules()}
  ${formError()}<button class="btn primary lg block" type="submit">Create workspace</button><p class="legal">By creating an account you agree to the Terms of Service and Privacy Policy.</p></form>
  <div class="auth-card-bottom">Already have an account? <a href="#/login" class="lnk">Sign in</a></div>`;
  if (mode === 'forgot') h = `<a href="#/login" class="back">${ic('left', 16)}Back to sign in</a><div class="auth-head"><h1>Reset your password</h1><p class="sub">Enter your account email and we’ll send a 6-digit code.</p></div>
  <form id="authForm" novalidate>${txtField('email', 'Email', 'email', 'username', 'placeholder="you@shop.com"')}${formError()}<button class="btn primary lg block" type="submit">Send reset code</button></form>`;
  if (mode === 'reset') { const r = LS.get('qf:reset', null) || {}; h = `<a href="#/forgot" class="back">${ic('left', 16)}Use a different email</a><div class="auth-head"><h1>Check your code</h1><p class="sub">We sent a 6-digit code to <b>${esc(r.email || '')}</b>.</p></div>
  <div class="mail-preview"><div class="mp-h">${ic('mail', 16)}Demo mode: no email service is connected</div><div>Your reset code is <b class="mp-code">${esc(r.code || '')}</b></div></div>
  <form id="authForm" novalidate>${txtField('code', '6-digit code', 'text', 'one-time-code', 'inputmode="numeric" maxlength="6" placeholder="000000"')}${pwField('password', 'New password', 'new-password', 'aria-describedby="pwRules"')}${pwRules()}${formError()}<button class="btn primary lg block" type="submit">Update password</button></form>`; }
  root.innerHTML = authShell(h, mode);
  const form = $('#authForm'); const err = m => { const e = $('#formErr'); if (e) { e.innerHTML = m ? ic('alert', 16) + '<span>' + esc(m) + '</span>' : ''; e.classList.toggle('on', !!m); } };
  const fe = (n, m) => setErr(form, n, m);
  $$('[data-pw]').forEach(b => b.onclick = () => { const i = b.previousElementSibling; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = ic(show ? 'eyeoff' : 'eye', 18); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.setAttribute('aria-pressed', String(show)); });
  const rules = $('#pwRules'); if (rules) $('input[name=password]', form).addEventListener('input', e => { const v = e.target.value, ok = { len: v.length >= 8, let: /[A-Za-z]/.test(v), num: /\d/.test(v) }; $$('li', rules).forEach(li => li.classList.toggle('ok', ok[li.dataset.r])); });
  $$('.pw input', form).forEach(i => ['keyup', 'keydown'].forEach(t => i.addEventListener(t, e => { const c = i.closest('.field').querySelector('.caps'); if (c && e.getModifierState) c.hidden = !e.getModifierState('CapsLock'); })));
  form && form.addEventListener('input', e => { const f = e.target.closest('[data-f]'); f && f.classList.remove('bad'); err(''); });
  const busy = (on) => { const b = $('button[type=submit]', form); b.disabled = on; b.classList.toggle('loading', on); };
  const em = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  if (mode === 'login') {
    $('#demoBtn').onclick = async e => { const b = e.currentTarget; b.disabled = true; b.classList.add('loading-dark'); b.innerHTML = 'Opening demo…'; await ensureDemo(); const u = getUsers().find(x => x.email === 'demo@benchly.app'); startSession(u, false); location.hash = '#/dashboard'; };
    form.addEventListener('submit', async e => {
      e.preventDefault(); const email = form.email.value.trim().toLowerCase(), pw = form.password.value; let bad = false;
      if (!em(email)) { fe('email', 'Enter a valid email address'); bad = true; } if (!pw) { fe('password', 'Enter your password'); bad = true; } if (bad) { form.querySelector('.field.bad input').focus(); return; }
      busy(true); await new Promise(r => setTimeout(r, 350));
      const u = getUsers().find(x => x.email === email);
      if (u && u.lockUntil > Date.now()) { busy(false); return err(`Too many attempts. Try again in ${Math.ceil((u.lockUntil - Date.now()) / 60000)} min.`); }
      if (!u || await hashPw(pw, u.salt) !== u.hash) { if (u) { u.failed = (u.failed || 0) + 1; if (u.failed >= 5) { u.lockUntil = Date.now() + 5 * 60000; u.failed = 0; } saveUser(u); } busy(false); return err('Incorrect email or password.'); }
      if (u.status === 'inactive') { busy(false); return err('This account has been deactivated. Contact your shop owner.'); }
      startSession(u, form.remember.checked); location.hash = '#/dashboard';
    });
  }
  if (mode === 'signup') {
    form.addEventListener('submit', async e => {
      e.preventDefault(); const v = { name: form.name.value.trim(), shop: form.shop.value.trim(), email: form.email.value.trim().toLowerCase(), pw: form.password.value }; let bad = false;
      if (v.name.length < 2) { fe('name', 'Enter your name'); bad = true; } if (v.shop.length < 2) { fe('shop', 'Enter your shop name'); bad = true; } if (!em(v.email)) { fe('email', 'Enter a valid email'); bad = true; }
      if (v.pw.length < 8) { fe('password', 'At least 8 characters'); bad = true; } else if (!/\d/.test(v.pw) || !/[A-Za-z]/.test(v.pw)) { fe('password', 'Use letters and numbers'); bad = true; }
      if (bad) { const f1 = form.querySelector('.field.bad input'); f1 && f1.focus(); return; }
      if (getUsers().some(u => u.email === v.email)) return fe('email', 'An account with this email already exists');
      busy(true); const { u } = await createAccount({ name: v.name, email: v.email, password: v.pw, shop: v.shop }); startSession(u, true); location.hash = '#/onboarding';
    });
  }
  if (mode === 'forgot') form.addEventListener('submit', e => {
    e.preventDefault(); const email = form.email.value.trim().toLowerCase(); if (!em(email)) return fe('email', 'Enter a valid email');
    const u = getUsers().find(x => x.email === email); const code = String(Math.floor(100000 + Math.random() * 900000));
    LS.set('qf:reset', { email, code: u ? code : String(Math.floor(100000 + Math.random() * 900000)), exp: Date.now() + 15 * 60000, exists: !!u }); location.hash = '#/reset';
  });
  if (mode === 'reset') form.addEventListener('submit', async e => {
    e.preventDefault(); const r = LS.get('qf:reset', null); const code = form.code.value.trim(), pw = form.password.value; let bad = false;
    if (!/^\d{6}$/.test(code)) { fe('code', 'Enter the 6-digit code'); bad = true; } if (pw.length < 8 || !/\d/.test(pw)) { fe('password', '8+ characters including a number'); bad = true; } if (bad) return;
    if (!r || Date.now() > r.exp) return err('This code has expired. Request a new one.'); if (code !== r.code || !r.exists) return fe('code', 'Incorrect code');
    busy(true); const u = getUsers().find(x => x.email === r.email); u.salt = uid('s'); u.hash = await hashPw(pw, u.salt); u.failed = 0; u.lockUntil = 0; saveUser(u); LS.del('qf:reset');
    location.hash = '#/login'; setTimeout(() => toast('Password updated. Sign in with your new password'), 200);
  });
  const first = $('input', form); first && first.focus();
}

/* ---------- onboarding ---------- */
function onboardingView() {
  const root = $('#root'); root.className = ''; const st = { step: 1, intent: new Set(['jobs']), sample: true };
  const INTENTS = [['jobs', 'wrench', 'Track repair jobs'], ['pos', 'receipt', 'Sell accessories (POS)'], ['stock', 'package', 'Manage parts & stock'], ['money', 'wallet', 'Watch profit & expenses']];
  const draw = () => {
    let body = '';
    if (st.step === 1) body = `<div class="auth-head"><h1>Tell us about your shop</h1><p class="sub">This appears on invoices and job slips. You can change it later.</p></div><form id="ob" novalidate>
      ${txtField('shop', 'Shop name', 'text', 'off', `value="${esc(DB.settings.shop)}"`)}${txtField('phone', 'Shop phone', 'tel', 'off', 'placeholder="01XXXXXXXXX"')}${txtField('address', 'Address', 'text', 'off', 'placeholder="Street, area, city"')}
      <div class="two">${txtField('branch', 'First branch name', 'text', 'off', `value="${esc(DB.settings.branches[0])}"`)}${txtField('currency', 'Currency symbol', 'text', 'off', `value="${esc(DB.settings.currency)}" maxlength="3"`)}</div><button class="btn primary lg block" type="submit">Continue</button></form>`;
    if (st.step === 2) body = `<div class="auth-head"><h1>What do you want to do first?</h1><p class="sub">Pick anything that applies — we’ll point you to the right place.</p></div><div class="intents">${INTENTS.map(([k, i, l]) => `<button type="button" class="intent ${st.intent.has(k) ? 'on' : ''}" data-k="${k}">${ic(i, 20)}<span>${l}</span><i>${ic('check', 14)}</i></button>`).join('')}</div><div class="row-btns"><button class="btn lg" data-back>Back</button><button class="btn primary lg" data-next>Continue</button></div>`;
    if (st.step === 3) body = `<div class="auth-head"><h1>Start with some data?</h1><p class="sub">Explore with realistic repair jobs, stock and sales — or start with a clean slate.</p></div><div class="choices"><button type="button" class="choice ${st.sample ? 'on' : ''}" data-s="1"><b>Sample data</b><span>~2 months of jobs, sales, expenses and stock. Delete it anytime from Settings → Data.</span></button><button type="button" class="choice ${!st.sample ? 'on' : ''}" data-s="0"><b>Empty workspace</b><span>Start clean. We'll guide you through setup with a checklist.</span></button></div><div class="row-btns"><button class="btn lg" data-back>Back</button><button class="btn primary lg" data-finish>Open my workspace</button></div>`;
    $('#root').innerHTML = authShell(`<div class="steps">${[1, 2, 3].map(n => `<i class="${n <= st.step ? 'on' : ''}"></i>`).join('')}</div>` + body);
    const f = $('#ob'); f && (f.onsubmit = e => {
      e.preventDefault(); const v = k => f.elements[k].value.trim(); if (!v('shop')) return setErr(f, 'shop', 'Required'); if (!v('branch')) return setErr(f, 'branch', 'Required');
      Object.assign(DB.settings, { shop: v('shop'), phone: v('phone'), address: v('address'), currency: v('currency') || '৳', branches: [v('branch')] }); st.step = 2; draw();
    });
    $$('.intent').forEach(b => b.onclick = () => { st.intent.has(b.dataset.k) ? st.intent.delete(b.dataset.k) : st.intent.add(b.dataset.k); draw(); });
    $$('.choice').forEach(b => b.onclick = () => { st.sample = b.dataset.s === '1'; draw(); });
    const bk = $('[data-back]'); bk && (bk.onclick = () => { st.step--; draw(); }); const nx = $('[data-next]'); nx && (nx.onclick = () => { st.step = 3; draw(); });
    const fin = $('[data-finish]'); fin && (fin.onclick = async () => {
      fin.disabled = true; fin.textContent = 'Setting things up…'; DB.onboarding.intent = [...st.intent];
      if (st.sample) await addSampleData(DB, USER);
      saveNow(); const first = st.intent.has('pos') && !st.intent.has('jobs') ? 'sales' : 'dashboard'; location.hash = '#/' + first; setTimeout(() => toast(`Welcome to ${esc(DB.settings.shop)}!`), 300);
    });
  };
  draw();
}
