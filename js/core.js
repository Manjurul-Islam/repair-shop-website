'use strict';
/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const iso = d => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const parseD = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const todayD = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayS = () => iso(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / DAY);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = s => { if (!s) return '—'; const d = parseD(s); return pad(d.getDate()) + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtShort = s => { const d = parseD(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
const fmtTs = ts => { const d = new Date(ts); return pad(d.getDate()) + ' ' + MON[d.getMonth()] + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; const h = Math.round(m / 60); if (h < 24) return h + 'h ago'; return Math.round(h / 24) + 'd ago'; };
const sum = (a, f = x => x) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const cur = () => (window.DB && DB.settings && DB.settings.currency) || '৳';
const money = (n, plain) => { n = +n || 0; const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (n < -0.004 ? '−' : '') + (plain ? '' : cur()) + s; };
const moneyW = n => { n = +n || 0; return (n < -0.5 ? '−' : '') + cur() + Math.round(Math.abs(n)).toLocaleString('en-US'); };
const moneyK = n => { const a = Math.abs(n); const s = a >= 1000 ? (a / 1000).toFixed(1) + 'k' : String(Math.round(a)); return (n < 0 ? '−' : '') + cur() + s; };
const num = n => (+n || 0).toLocaleString('en-US');
const pct = (n, d = 1) => (isFinite(n) ? n : 0).toFixed(d) + '%';
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const debounce = (f, t = 180) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => f(...a), t); }; };
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const byId = (arr, id) => arr.find(x => x.id === id);
const PASTELS = [['#DCE8FF', '#3B6FD8'], ['#D9F5E6', '#1E9E61'], ['#FCE1EC', '#C2367A'], ['#FFE4D6', '#D2572B'], ['#EDE4FF', '#7448D6'], ['#FFF5CC', '#A57A00']];
const hashStr = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const avatar = (name, size = 28) => { const [bg, fg] = PASTELS[hashStr(name) % PASTELS.length]; return `<span class="avatar" style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${Math.round(size * .38)}px">${esc(initials(name))}</span>`; };
const pill = (label, tone = 'grey', dot = true) => `<span class="pill ${tone}">${dot ? '<i></i>' : ''}${esc(label)}</span>`;
const opts = (list, sel) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
const downloadFile = (name, text, type = 'text/plain') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
const csvCell = v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

/* ---------- icons (lucide-style) ---------- */
/* Icons: Hugeicons Free (stroke rounded), loaded from js/icons.js. */
const ICONS = (typeof HUGE_ICONS !== 'undefined') ? HUGE_ICONS : {};
const icSize = s => s <= 12 ? 14 : s <= 16 ? 16 : s <= 19 ? 18 : s <= 22 ? 20 : 24;
const ic = (n, s = 18, cls = '') => (s = icSize(s), `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`);
const LOGO = (s = 28) => `<svg class="logo-mark" width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><path d="M11.5 8.5v15M11.5 8.5h5.25a3.6 3.6 0 0 1 0 7.2H11.5M11.5 15.7h6.1a3.9 3.9 0 0 1 0 7.8H11.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22.6" cy="9.6" r="1.7" fill="#9FC0FF"/></svg>`;

/* ---------- storage ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('storage full', e); } },
  del(k) { localStorage.removeItem(k); }
};
window.DB = null; window.USER = null;
let _saveT;
function save() { clearTimeout(_saveT); _saveT = setTimeout(saveNow, 40); }
function saveNow() { clearTimeout(_saveT); if (DB) LS.set('qf:ws:' + DB.id, DB); }
const getUsers = () => LS.get('qf:users', []);
const setUsers = u => LS.set('qf:users', u);
function saveUser(u) { const us = getUsers(); const i = us.findIndex(x => x.id === u.id); if (i >= 0) us[i] = u; else us.push(u); setUsers(us); if (USER && USER.id === u.id) USER = u; }
const wsUsers = () => getUsers().filter(u => u.wsId === DB.id);

async function hashPw(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  let h = 5381; for (const c of salt + pw) h = ((h << 5) + h) ^ c.charCodeAt(0); return 'f' + (h >>> 0).toString(16);
}

/* ---------- constants ---------- */
const JOB_ST = {
  received: { l: 'Received', tone: 'blue' }, diagnosing: { l: 'Diagnosing', tone: 'blue' }, quote: { l: 'Awaiting approval', tone: 'amber' }, waiting_parts: { l: 'Waiting for parts', tone: 'amber' },
  repairing: { l: 'Repairing', tone: 'blue' }, ready: { l: 'Ready for pickup', tone: 'green' }, delivered: { l: 'Delivered', tone: 'grey' }, cancelled: { l: 'Cancelled', tone: 'red' }
};
const JOB_FLOW = ['received', 'diagnosing', 'quote', 'waiting_parts', 'repairing', 'ready', 'delivered'];
const PRIORITY = { normal: { l: 'Normal', tone: 'grey' }, high: { l: 'High', tone: 'amber' }, urgent: { l: 'Urgent', tone: 'red' } };
const EXP_CATS = ['Rent', 'Salaries', 'Utilities', 'Internet', 'Marketing', 'Tools & equipment', 'Transport', 'Other'];
const PAY_METHODS = ['Cash', 'bKash', 'Nagad', 'Card', 'Bank transfer'];
const ITEM_CATS = ['Screens', 'Batteries', 'Parts', 'Accessories', 'Tools'];
const ROLES = {
  owner: { l: 'Owner', desc: 'Full access, billing and workspace settings' },
  manager: { l: 'Manager', desc: 'Everything except workspace settings & owners' },
  technician: { l: 'Technician', desc: 'Jobs, customers, inventory (view), warranty' },
  cashier: { l: 'Cashier', desc: 'POS, invoices, customers, create repairs' }
};
const NAV = [
  { k: 'dashboard', l: 'Dashboard', i: 'grid', r: ['owner', 'manager', 'technician', 'cashier'] },
  { k: 'jobs', l: 'Jobs', i: 'wrench', r: ['owner', 'manager', 'technician', 'cashier'] },
  { k: 'customers', l: 'Customers', i: 'user', r: ['owner', 'manager', 'technician', 'cashier'] },
  { k: 'inventory', l: 'Inventory', i: 'package', r: ['owner', 'manager', 'technician', 'cashier'] },
  { k: 'purchases', l: 'Purchases', i: 'cart', r: ['owner', 'manager'] },
  { k: 'suppliers', l: 'Suppliers', i: 'truck', r: ['owner', 'manager'] },
  { k: 'sales', l: 'Sales (POS)', i: 'receipt', r: ['owner', 'manager', 'cashier'] },
  { k: 'invoices', l: 'Invoices', i: 'file', r: ['owner', 'manager', 'cashier'] },
  { k: 'expenses', l: 'Expenses', i: 'wallet', r: ['owner', 'manager'] },
  { k: 'dayclose', l: 'Day close', i: 'lock', r: ['owner', 'manager', 'cashier'] },
  { k: 'warranty', l: 'Warranty', i: 'shield', r: ['owner', 'manager', 'technician', 'cashier'] },
  { k: 'reviews', l: 'Reviews', i: 'star', r: ['owner', 'manager'] },
  { k: 'staff', l: 'Staff', i: 'users', r: ['owner', 'manager'] },
  { k: 'settings', l: 'Settings', i: 'sliders', r: ['owner', 'manager', 'technician', 'cashier'] },
];
const canSee = k => { const n = NAV.find(x => x.k === k); return !!(n && USER && n.r.includes(USER.role)); };
const isMgr = () => USER && (USER.role === 'owner' || USER.role === 'manager');
const seesMoney = () => isMgr();
