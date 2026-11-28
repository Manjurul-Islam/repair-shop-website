'use strict';
/* ---------- layer stack, modal, drawer ---------- */
const STACK = [];
function closeTop() { const t = STACK[STACK.length - 1]; if (t) t.close(); return !!t; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (closeTop()) e.stopPropagation(); } });

function modal({ title, sub, body, actions = [], size = 'md', onClose, dismiss = true, cls = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = `<div class="modal ${size} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h"><div><h3>${esc(title)}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
    <div class="modal-b">${body}</div>
    ${actions.length ? `<div class="modal-f">${actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-act="${i}" ${a.submit ? `type="submit" form="${a.form}"` : 'type="button"'}>${a.label}</button>`).join('')}</div>` : ''}
  </div>`;
  $('#layer').appendChild(wrap);
  const h = { el: wrap, box: $('.modal', wrap), closed: false };
  h.q = s => $(s, wrap);
  h.close = () => { if (h.closed) return; h.closed = true; STACK.splice(STACK.indexOf(h), 1); wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 180); onClose && onClose(); };
  h.setBody = html => { $('.modal-b', wrap).innerHTML = html; };
  wrap.addEventListener('mousedown', e => { if (dismiss && e.target === wrap) h.close(); });
  wrap.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return h.close();
    const b = e.target.closest('[data-act]'); if (b && !actions[b.dataset.act].submit) actions[b.dataset.act].fn && actions[b.dataset.act].fn(h, b);
  });
  STACK.push(h);
  requestAnimationFrame(() => { wrap.classList.add('in'); const f = $('input:not([type=hidden]):not([type=checkbox]),select,textarea', wrap); f && f.focus({ preventScroll: true }); });
  return h;
}

let DRAWER = null;
function drawer({ title, sub, render, actions, onClose, width }) {
  if (DRAWER) DRAWER.close(true);
  const wrap = document.createElement('div');
  wrap.className = 'drawer-wrap';
  wrap.innerHTML = `<div class="drawer-scrim"></div><aside class="drawer" role="dialog" aria-modal="true" style="${width ? `width:${width}px` : ''}"><div class="drawer-h"><div class="drawer-t"></div><button class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div><div class="drawer-b"></div><div class="drawer-f"></div></aside>`;
  $('#layer').appendChild(wrap);
  const h = { el: wrap, closed: false, noEvent: false };
  h.refresh = () => {
    if (h.closed) return; const b = $('.drawer-b', wrap); const sc = b.scrollTop;
    const t = typeof title === 'function' ? title() : title; const s = typeof sub === 'function' ? sub() : sub;
    $('.drawer-t', wrap).innerHTML = `<h3>${t}</h3>${s ? `<div class="drawer-sub">${s}</div>` : ''}`;
    b.innerHTML = render();
    const acts = typeof actions === 'function' ? actions() : (actions || []);
    h.acts = acts; const f = $('.drawer-f', wrap); f.innerHTML = acts.map((a, i) => `<button class="btn ${a.kind || ''}" data-dact="${i}">${a.icon ? ic(a.icon, 15) : ''}${a.label}</button>`).join(''); f.style.display = acts.length ? '' : 'none';
    b.scrollTop = sc;
  };
  h.close = (silent) => { if (h.closed) return; h.closed = true; STACK.splice(STACK.indexOf(h), 1); if (DRAWER === h) DRAWER = null; wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 260); if (!silent) onClose && onClose(); };
  wrap.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || e.target.classList.contains('drawer-scrim')) return h.close();
    const b = e.target.closest('[data-dact]'); if (b) h.acts[b.dataset.dact].fn(h, b);
  });
  STACK.push(h); DRAWER = h; h.refresh();
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('in')));
  return h;
}
const closeDrawer = () => DRAWER && DRAWER.close();

/* ---------- confirm / toast / menu ---------- */
function confirmDialog({ title, msg, confirm = 'Confirm', danger = false, extra = '' }) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    modal({ title, size: 'sm', body: `<p class="muted-p">${msg}</p>${extra}`, onClose: () => fin(false), actions: [{ label: 'Cancel', kind: 'ghost', fn: h => h.close() }, { label: confirm, kind: danger ? 'danger' : 'primary', fn: h => { fin(true); h.close(); } }] });
  });
}
function toast(msg, o = {}) {
  const t = document.createElement('div'); t.className = 'toast ' + (o.tone || '');
  t.innerHTML = `<span class="t-ic">${ic(o.tone === 'err' ? 'alert' : 'check', 15)}</span><span class="t-m">${msg}</span>${o.undo ? '<button class="t-undo">Undo</button>' : ''}`;
  $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  const kill = () => { t.classList.remove('in'); setTimeout(() => t.remove(), 220); };
  const timer = setTimeout(kill, o.ms || (o.undo ? 6000 : 3200));
  if (o.undo) $('.t-undo', t).onclick = () => { clearTimeout(timer); o.undo(); kill(); };
  return kill;
}
let MENU = null;
function closeMenu() { if (MENU) { const m = MENU; MENU = null; m.classList.remove('in'); setTimeout(() => m.remove(), 140); } }
function menu(anchor, items, { align = 'right', width } = {}) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; if (width) m.style.minWidth = width + 'px';
  m.innerHTML = items.map((it, i) => it === '-' ? '<div class="menu-sep"></div>' : it.head ? `<div class="menu-head">${it.head}</div>` : `<button class="menu-i ${it.danger ? 'danger' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.i ? ic(it.i, 15) : ''}<span>${it.l}</span>${it.hint ? `<kbd>${it.hint}</kbd>` : ''}</button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); const mw = m.offsetWidth, mh = m.offsetHeight;
  let x = align === 'right' ? r.right - mw : r.left; x = clamp(x, 8, innerWidth - mw - 8);
  let y = r.bottom + 6; if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
  m.style.left = x + 'px'; m.style.top = y + 'px';
  requestAnimationFrame(() => m.classList.add('in'));
  m.addEventListener('click', e => { const b = e.target.closest('.menu-i'); if (b) { closeMenu(); items[b.dataset.i].fn && items[b.dataset.i].fn(); } });
  MENU = m;
}
document.addEventListener('mousedown', e => { if (MENU && !MENU.contains(e.target) && !e.target.closest('[data-menu-anchor]')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('scroll', closeMenu, true);

/* ---------- forms ---------- */
function fieldHtml(f, v) {
  if (f.section) return `<div class="fsec span2">${esc(f.section)}</div>`;
  if (f.type === 'html') return `<div class="field span2">${f.html}</div>`;
  const id = 'f_' + f.name; const val = v[f.name] ?? f.value ?? '';
  let ctl;
  if (f.type === 'select') ctl = `<select class="inp" name="${f.name}" id="${id}">${opts(f.options, val)}</select>`;
  else if (f.type === 'textarea') ctl = `<textarea class="inp" name="${f.name}" id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
  else if (f.type === 'checkbox') return `<div class="field ${f.span === 2 ? 'span2' : ''}" data-f="${f.name}"><label class="check"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}><span>${f.label}</span></label>${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`;
  else { const inp = `<input class="inp" type="${f.type || 'text'}" name="${f.name}" id="${id}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} autocomplete="${f.ac || 'off'}" ${f.readonly ? 'readonly' : ''} ${f.type === 'number' ? 'inputmode="decimal"' : ''}>`; ctl = f.prefix ? `<div class="inp-wrap"><span class="pre">${f.prefix}</span>${inp}</div>` : inp; }
  return `<div class="field ${f.span === 2 ? 'span2' : ''}" data-f="${f.name}"><label for="${id}">${f.label}${f.req ? ' <b>*</b>' : ''}</label>${ctl}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}<div class="err"></div></div>`;
}
function collectForm(form, fields) {
  const out = {};
  fields.forEach(f => {
    if (f.section || f.type === 'html') return; const el = form.elements[f.name]; if (!el) return;
    if (f.type === 'checkbox') out[f.name] = el.checked;
    else if (f.type === 'number') out[f.name] = el.value === '' ? null : +el.value;
    else out[f.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
  });
  return out;
}
function setErr(root, name, msg) { const f = $(`[data-f="${name}"]`, root); if (!f) return; f.classList.toggle('bad', !!msg); const e = $('.err', f); if (e) e.textContent = msg || ''; }
function formModal({ title, sub, fields, values = {}, submit = 'Save', size = 'md', onSubmit, onMount, validate, extraActions = [] }) {
  const fid = uid('fm');
  const h = modal({
    title, sub, size, body: `<form id="${fid}" class="fgrid" novalidate>${fields.map(f => fieldHtml(f, values)).join('')}<button type="submit" hidden></button></form>`,
    actions: [{ label: 'Cancel', kind: 'ghost', fn: h => h.close() }, ...extraActions, { label: submit, kind: 'primary', submit: true, form: fid }]
  });
  const form = $('#' + fid, h.el); h.form = form; h.fields = fields;
  form.addEventListener('input', e => { const f = e.target.closest('[data-f]'); if (f) { f.classList.remove('bad'); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); const v = collectForm(form, fields); let bad = false; let first = null;
    fields.forEach(f => { if (f.section || f.type === 'html') return; setErr(form, f.name, ''); if (f.req && (v[f.name] === '' || v[f.name] === null || v[f.name] === undefined)) { setErr(form, f.name, 'Required'); bad = true; first = first || f.name; } if (f.type === 'number' && v[f.name] !== null && f.min !== undefined && v[f.name] < f.min) { setErr(form, f.name, `Min ${f.min}`); bad = true; first = first || f.name; } if (f.type === 'email' && v[f.name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v[f.name])) { setErr(form, f.name, 'Enter a valid email'); bad = true; first = first || f.name; } });
    if (validate) { const errs = validate(v) || {}; Object.entries(errs).forEach(([k, m]) => { setErr(form, k, m); bad = true; first = first || k; }); }
    if (bad) { const el = form.elements[first]; el && el.focus(); return; }
    const btn = $('[type=submit][form]', h.el); btn && (btn.disabled = true);
    try { const r = await onSubmit(v, h); if (r !== false) h.close(); } finally { btn && (btn.disabled = false); }
  });
  onMount && onMount(h, form);
  return h;
}

/* ---------- misc ui ---------- */
function printDoc(html, title = 'Print') {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d = f.contentWindow.document; d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`); d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 250);
}
const INV_CSS = `.iv{color:#141824;font-variant-numeric:tabular-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:16px;overflow:hidden;background:#fff}.iv *{box-sizing:border-box}
.iv-band{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:28px 28px 64px;color:#fff;background:radial-gradient(120% 140% at 100% 0%,#3A74E4 0%,rgba(58,116,228,0) 55%),linear-gradient(135deg,#0B1A3F 0%,#14306F 55%,#275FCE 100%);overflow:hidden}
.iv-band::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.14) 1px,transparent 1px);background-size:14px 14px;-webkit-mask-image:linear-gradient(90deg,transparent 30%,#000);mask-image:linear-gradient(90deg,transparent 30%,#000);pointer-events:none}
.iv-brand{position:relative;z-index:1;display:flex;gap:12px;align-items:flex-start;min-width:0}.iv-brand>div{display:grid;gap:2px;min-width:0}.iv-brand b{font-size:15px;font-weight:600;line-height:20px}.iv-brand small{font-size:12px;line-height:17px;color:rgba(255,255,255,.72)}
.iv-mark{width:38px;height:38px;flex:none;border-radius:11px;background:#fff;color:#275FCE;display:grid;place-items:center;font-weight:700;font-size:17px;line-height:1}
.iv-ttl{position:relative;z-index:1;text-align:right;display:grid;justify-items:end;gap:4px}.iv-ttl small{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.iv-ttl h2{margin:0;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-.01em}
.iv-st{display:inline-flex;align-items:center;gap:6px;height:24px;margin-top:4px;padding:0 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.22)}.iv-st::before{content:"";width:6px;height:6px;border-radius:50%;background:#FDB022}
.iv-paid .iv-st::before{background:#47CD89}.iv-overdue .iv-st::before{background:#F97066}.iv-void .iv-st::before{background:#98A2B3}
.iv-hero{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.6fr);margin:-40px 20px 0;border-radius:14px;background:#fff;border:1px solid #E6E9EF;box-shadow:0 12px 32px -18px rgba(11,26,63,.35)}
.iv-big{display:grid;align-content:center;gap:4px;padding:20px 22px;border-right:1px solid #EEF1F5}.iv-big small{font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:#667085}
.iv-big b{font-size:28px;line-height:34px;font-weight:600;letter-spacing:-.02em;color:#1F4FB0}.iv-big span{font-size:12px;color:#667085}
.iv-paid .iv-big b{color:#067647}.iv-overdue .iv-big b{color:#B42318}.iv-void .iv-big b{color:#98A2B3;text-decoration:line-through}
.iv-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0}.iv-facts>div{display:grid;align-content:center;gap:4px;padding:20px 18px;min-width:0}.iv-facts>div+div{border-left:1px solid #EEF1F5}
.iv-facts dt{font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:#667085}.iv-facts dd{margin:0;display:grid;gap:1px;min-width:0}
.iv-facts dd b{font-size:13.5px;font-weight:600;line-height:19px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.iv-facts dd span{font-size:12px;color:#667085;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iv-note{margin:20px 28px 0;padding:12px 14px;border-radius:10px;background:#F7F9FC;font-size:12.5px;line-height:18px;color:#475467;display:flex;gap:8px}.iv-note b{color:#141824;font-weight:600;white-space:nowrap}
.iv-t{width:calc(100% - 56px);margin:20px 28px 0;border-collapse:collapse}.iv-t th{font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:#667085;text-align:left;padding:0 0 10px;border-bottom:1px solid #E6E9EF}
.iv-t td{font-size:13.5px;padding:14px 0;border-bottom:1px dashed #E6E9EF;vertical-align:middle}.iv-t tbody tr:last-child td{border-bottom:1px solid #E6E9EF}.iv-t .r{text-align:right;padding-left:16px;white-space:nowrap}.iv-t td:last-child{font-weight:600}
.iv-n{display:inline-block;width:28px;font-size:11px;font-weight:600;color:#98A2B3}
.iv-sum{display:grid;grid-template-columns:1fr minmax(220px,270px);gap:24px;align-items:start;padding:18px 28px 0}
.iv-pay{display:grid;gap:6px;font-size:12px;color:#475467}.iv-pay dt{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#667085;margin-bottom:2px}
.iv-pay span{display:flex;align-items:center;gap:8px}.iv-pay span i{width:6px;height:6px;border-radius:50%;background:#47CD89;flex:none}.iv-pay b{margin-left:auto;font-weight:600;color:#141824;max-width:110px;text-align:right}
.iv-tot{display:grid;gap:2px;font-size:13px}.iv-tot>div{display:flex;justify-content:space-between;padding:5px 0;color:#475467}.iv-tot>div span:last-child{color:#141824}
.iv-tot .g{margin-top:8px;padding:12px 14px;border-radius:10px;background:linear-gradient(135deg,#14306F,#275FCE);font-size:15px;font-weight:600}.iv-tot .g span{color:#fff!important}
.iv-paid .iv-tot .g{background:linear-gradient(135deg,#05603A,#12B76A)}.iv-void .iv-tot .g{background:#98A2B3}
.iv-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:28px 0 0;padding:16px 28px;background:#F7F9FC;border-top:1px solid #EEF1F5;font-size:12px;color:#667085}.iv-foot b{font-weight:500;color:#344054}
.iv-void .iv-t,.iv-void .iv-sum{opacity:.6}.iv{container-type:inline-size}
.iv .iv-t{width:calc(100% - 56px)!important;margin:20px 28px 0!important}
.iv .iv-t th:first-child,.iv .iv-t td:first-child{padding-left:0}
@container (max-width:640px){.iv-hero{grid-template-columns:1fr}.iv-big{border-right:0;border-bottom:1px solid #EEF1F5;grid-template-columns:1fr auto;align-items:end}.iv-big small{grid-column:1/-1}.iv-big span{text-align:right}
.iv-facts>div{padding:14px 16px}.iv-sum{grid-template-columns:1fr}.iv-tot{order:-1}.iv-pay b{max-width:none}.iv-foot{flex-direction:column;align-items:flex-start;gap:4px}}@container (max-width:460px){.iv-band{flex-direction:column;padding:20px 20px 56px}.iv-ttl{text-align:left;justify-items:start}.iv-facts{grid-template-columns:1fr}.iv-facts>div+div{border-left:0;border-top:1px solid #EEF1F5}.iv-facts>div{grid-template-columns:96px 1fr;align-items:baseline}.iv-hero{margin:-36px 12px 0}.iv .iv-t{width:calc(100% - 32px)!important;margin:16px 16px 0!important}.iv-sum{padding:16px 16px 0}.iv-note{margin:16px 16px 0}.iv-foot{padding:14px 16px}.iv-big b{font-size:24px}}`;
const PRINT_CSS = INV_CSS + `@page{margin:12mm}.iv{max-width:760px;margin:0 auto;border:1px solid #E6E9EF}.sig{display:flex;gap:32px;margin-top:36px}.sig div{flex:1;font-size:11px;color:#6b6b74}.sig span{display:block;border-top:1px solid #141416;margin-bottom:6px;height:28px}*{box-sizing:border-box}body{font:13px/1.5 Inter,system-ui,sans-serif;color:#141416;margin:0;padding:32px}h1,h2,h3,p{margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.brand{font-size:20px;font-weight:600}.muted{color:#6b6b74}table{width:100%;border-collapse:collapse;margin:16px 0}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b6b74;border-bottom:1px solid #ddd;padding:8px 0}td{padding:10px 0;border-bottom:1px solid #eee}td.r,th.r{text-align:right}.tot{margin-left:auto;width:260px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .g{font-weight:600;font-size:16px;border-top:1px solid #ddd;margin-top:6px;padding-top:10px}.badge{display:inline-block;border:1px solid #141416;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;text-transform:uppercase}.foot{margin-top:32px;color:#6b6b74;font-size:12px;border-top:1px solid #eee;padding-top:12px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}.sm{font-size:12px}.slip{max-width:380px}`;

function segmented(name, options, active) {
  return `<div class="seg" data-seg="${name}">${options.map(([v, l, i]) => `<button type="button" class="${v === active ? 'on' : ''}" data-v="${v}">${i ? ic(i, 14) : ''}${l}</button>`).join('')}</div>`;
}
function emptyState(icon, title, msg, action = '') { return `<div class="empty"><div class="empty-ic">${ic(icon, 22)}</div><h4>${title}</h4><p>${msg}</p>${action}</div>`; }
function kvList(rows) { return `<dl class="kv">${rows.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v ?? '—'}</dd></div>`).join('')}</dl>`; }
function statCell(label, value, sub = '') { return `<div class="stat"><div class="stat-l">${label}</div><div class="stat-v">${value}</div>${sub ? `<div class="stat-s">${sub}</div>` : ''}</div>`; }

/* ---------- generic list view ---------- */
const LVS = {};
function listHtml(cfg) {
  const st = LVS[cfg.id] || (LVS[cfg.id] = { q: '', tab: cfg.tabs ? cfg.tabs[0].k : 'all', page: 1, sort: cfg.sort || null, dir: cfg.dir || 'desc', f: {} });
  return `<div class="lv" id="lv-${cfg.id}">
    <div class="lv-tabs"></div>
    <div class="lv-bar"><label class="search">${ic('search', 15)}<input type="search" placeholder="${esc(cfg.searchPh || 'Search…')}" value="${esc(st.q)}" aria-label="Search"></label>
    ${(cfg.filters || []).map(f => `<select class="inp sm lv-f" data-f="${f.k}" aria-label="${esc(f.l)}"><option value="">${esc(f.l)}</option>${opts(f.opts(), st.f[f.k] || '')}</select>`).join('')}
    <div class="grow"></div>${cfg.toolbar || ''}<button class="btn sm" data-lv="csv">${ic('download', 14)}Export CSV</button></div>
    <div class="lv-body"></div></div>`;
}
function listMount(cfg) {
  const root = $('#lv-' + cfg.id); const st = LVS[cfg.id]; const PER = cfg.per || 12;
  const pipeline = (ignoreTab) => {
    let rows = cfg.rows();
    (cfg.filters || []).forEach(f => { const v = st.f[f.k]; if (v) rows = rows.filter(r => f.fn(r, v)); });
    const base = rows;
    if (!ignoreTab && cfg.tabs) { const t = cfg.tabs.find(t => t.k === st.tab); if (t && t.fn) rows = rows.filter(t.fn); }
    if (st.q) { const toks = st.q.toLowerCase().split(/\s+/).filter(Boolean); rows = rows.filter(r => { const s = cfg.search(r).toLowerCase(); return toks.every(t => s.includes(t)); }); }
    if (st.sort != null) { const c = cfg.cols.find(c => c.k === st.sort); if (c && c.sort) { const dir = st.dir === 'asc' ? 1 : -1; rows = [...rows].sort((a, b) => { const x = c.sort(a), y = c.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; }); } }
    return { rows, base };
  };
  const draw = () => {
    const { rows, base } = pipeline(); const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PER)); st.page = clamp(st.page, 1, pages);
    const slice = rows.slice((st.page - 1) * PER, st.page * PER);
    if (cfg.tabs) $('.lv-tabs', root).innerHTML = cfg.tabs.map(t => { const n = t.fn ? base.filter(t.fn).length : base.length; return `<button class="tab ${st.tab === t.k ? 'on' : ''}" data-tab="${t.k}">${t.l}<span class="cnt">${n}</span></button>`; }).join('');
    else $('.lv-tabs', root).style.display = 'none';
    const anyData = cfg.rows().length > 0; let html;
    if (!total) html = emptyState(anyData ? 'search' : (cfg.emptyIcon || 'box'), anyData ? 'Nothing matches' : (cfg.emptyTitle || 'Nothing here yet'), anyData ? 'Try a different search or clear the filters.' : (cfg.emptyMsg || ''), anyData ? '<button class="btn sm" data-lv="clear">Clear filters</button>' : (cfg.emptyAction || ''));
    else html = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cfg.cols.map(c => `<th class="${c.align === 'right' ? 'r' : ''} ${c.hide ? 'hide-' + c.hide : ''}" ${c.sort ? `data-sort="${c.k}" tabindex="0"` : ''} ${c.w ? `style="width:${c.w}"` : ''}>${c.label}${c.sort ? `<span class="sort ${st.sort === c.k ? 'on' : ''}">${st.sort === c.k ? ic(st.dir === 'asc' ? 'up' : 'down', 12) : ic('down', 12)}</span>` : ''}</th>`).join('')}${cfg.menu ? '<th class="w-more"></th>' : ''}</tr></thead><tbody>${slice.map(r => `<tr data-id="${esc(r.id)}" tabindex="0" class="${cfg.rowCls ? cfg.rowCls(r) : ''}">${cfg.cols.map(c => `<td class="${c.align === 'right' ? 'r' : ''} ${c.hide ? 'hide-' + c.hide : ''}">${c.render(r)}</td>`).join('')}${cfg.menu ? `<td class="w-more"><button class="icon-btn" data-rowmenu="${esc(r.id)}" data-menu-anchor aria-label="Row actions">${ic('more')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
    <div class="pager"><span>Showing ${(st.page - 1) * PER + 1}–${Math.min(total, st.page * PER)} of ${total}</span><div><button class="icon-btn" data-page="${st.page - 1}" ${st.page <= 1 ? 'disabled' : ''} aria-label="Previous">${ic('left')}</button><span class="pg">${st.page} / ${pages}</span><button class="icon-btn" data-page="${st.page + 1}" ${st.page >= pages ? 'disabled' : ''} aria-label="Next">${ic('right')}</button></div></div>`;
    $('.lv-body', root).innerHTML = html;
  };
  const search = $('.search input', root);
  search.addEventListener('input', debounce(() => { st.q = search.value; st.page = 1; draw(); }, 140));
  root.addEventListener('change', e => { const s = e.target.closest('.lv-f'); if (s) { st.f[s.dataset.f] = s.value; st.page = 1; draw(); } });
  root.addEventListener('click', e => {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-tab]'))) { st.tab = b.dataset.tab; st.page = 1; draw(); return; }
    if ((b = t.closest('[data-page]'))) { st.page = +b.dataset.page; draw(); return; }
    if ((b = t.closest('th[data-sort]'))) { const k = b.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'asc'; } draw(); return; }
    if ((b = t.closest('[data-rowmenu]'))) { e.stopPropagation(); const r = cfg.rows().find(r => String(r.id) === b.dataset.rowmenu); r && menu(b, cfg.menu(r)); return; }
    if ((b = t.closest('[data-lv]'))) {
      if (b.dataset.lv === 'clear') { st.q = ''; st.f = {}; search.value = ''; $$('.lv-f', root).forEach(s => s.value = ''); draw(); }
      if (b.dataset.lv === 'csv') { const { rows } = pipeline(); const cols = cfg.cols.filter(c => !c.noCsv); downloadFile((cfg.csvName || cfg.id) + '-' + todayS() + '.csv', [cols.map(c => csvCell(c.csvLabel || c.label)).join(','), ...rows.map(r => cols.map(c => csvCell(c.csv ? c.csv(r) : c.sort ? c.sort(r) : '')).join(','))].join('\n'), 'text/csv'); toast(`Exported ${rows.length} rows`); }
      return;
    }
    if (t.closest('a,button,input,select,label')) return;
    const tr = t.closest('tr[data-id]'); if (tr && cfg.onRow) cfg.onRow(tr.dataset.id);
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-id]'); if (tr && e.target === tr && cfg.onRow) cfg.onRow(tr.dataset.id); } });
  draw(); cfg.redraw = draw; return draw;
}

/* ---------- Shared timeline (dashboard activity, job history) ---------- */
function tlKind(text) {
  const t = String(text || '');
  if (/cancel|void|refund/i.test(t)) return ['x', 't-bad'];
  if (/delivered|collected by|picked up/i.test(t)) return ['check', 't-ok'];
  if (/ready for pickup/i.test(t)) return ['check', 't-ok'];
  if (/advance|payment|paid|collected|৳|invoice|sale/i.test(t)) return ['wallet', 't-money'];
  if (/quote|approv|estimate/i.test(t)) return ['file', ''];
  if (/part|stock|purchase|supplier/i.test(t)) return ['package', 't-stock'];
  if (/reminder|whatsapp|sms|notified|message/i.test(t)) return ['bell', ''];
  if (/warranty|claim/i.test(t)) return ['shield', ''];
  if (/assigned|technician/i.test(t)) return ['user', ''];
  if (/note|condition|intake/i.test(t)) return ['edit', 't-set'];
  if (/received|booked|new repair|created/i.test(t)) return ['wrench', ''];
  if (/→|moved|status|diagnos|repair/i.test(t)) return ['arrow', ''];
  if (/website|review/i.test(t)) return ['eye', 't-web'];
  if (/settings|staff|updated/i.test(t)) return ['sliders', 't-set'];
  return ['clock', 't-set'];
}
function timelineHtml(items, o = {}) {
  if (!items.length) return `<p class="act-empty">${o.empty || 'Nothing yet'}</p>`;
  return `<div class="act-tl${o.dense ? ' dense' : ''}">${items.map(a => { const k = a.icon ? [a.icon, a.tone || ''] : tlKind(a.text); const tag = a.ref ? 'button' : 'div';
    return `<${tag} class="act-i"${a.ref ? ` type="button" data-actref="${esc(a.ref)}"` : ''}><span class="act-ic ${k[1]}">${ic(k[0], 15)}</span><span class="act-t"><b>${esc(String(a.text).replace(/ — /g, ': '))}</b><small>${a.meta}</small></span></${tag}>`; }).join('')}</div>`;
}
