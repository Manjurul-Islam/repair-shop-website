'use strict';
/* ---------- workspace + helpers ---------- */
function newDB(shop, extra = {}) {
  return {
    id: uid('ws'), v: 1, createdAt: Date.now(),
    settings: { shop, currency: '৳', phone: '', email: '', address: '', invPrefix: 'INV', warrantyDays: 90, footer: 'Thank you for choosing us. Keep this invoice for warranty claims.', branches: ['Main branch'], ...extra },
    counters: {}, customers: [], jobs: [], items: [], suppliers: [], purchases: [], sales: [], invoices: [], payments: [], expenses: [], warranties: [], moves: [], activity: [], notifRead: [], onboarding: { dismissed: false }
  };
}
const nextN = (k, start = 0) => { DB.counters[k] = (DB.counters[k] || start) + 1; return DB.counters[k]; };
const jobCode = () => 'RJ-' + nextN('job', 1000);
const invCode = () => DB.settings.invPrefix + '-' + String(nextN('inv', 0)).padStart(4, '0');
const poCode = () => 'PO-' + String(nextN('po', 0)).padStart(4, '0');
const saleCode = () => 'POS-' + String(nextN('sale', 0)).padStart(4, '0');
const warCode = () => 'W-' + String(nextN('war', 0)).padStart(4, '0');
const custOf = id => byId(DB.customers, id);
const custName = id => (custOf(id) || { name: 'Walk-in customer' }).name;
const userOf = id => getUsers().find(u => u.id === id);
const userName = id => (userOf(id) || { name: 'Unassigned' }).name;
const itemOf = id => byId(DB.items, id);
const supOf = id => byId(DB.suppliers, id);
const jobOf = id => byId(DB.jobs, id);
const invOf = id => byId(DB.invoices, id);
const techs = () => wsUsers().filter(u => u.status !== 'inactive' && u.role !== 'cashier');
function logAct(text, ref, ts) { DB.activity.unshift({ ts: ts || window.__seedTs || Date.now(), text, ref: ref || '', by: USER ? USER.id : null }); if (DB.activity.length > 300) DB.activity.length = 300; }
function logJob(job, text, ts) { job.timeline.push({ ts: ts || window.__seedTs || Date.now(), text, by: USER ? USER.id : null }); }

/* ---------- inventory ---------- */
function moveStock(itemId, delta, reason, ref, date) {
  const it = itemOf(itemId); if (!it) return;
  it.stock = +(it.stock + delta).toFixed(3);
  DB.moves.push({ id: uid('mv'), itemId, ts: date ? parseD(date).getTime() + 12 * 3600e3 : (window.__seedTs || Date.now()), date: date || (window.__seedTs ? iso(window.__seedTs) : todayS()), delta, reason, ref: ref || '', balance: it.stock, by: USER ? USER.id : null });
  if (DB.moves.length > 3000) DB.moves.splice(0, DB.moves.length - 3000);
}
const itemState = i => i.stock <= 0 ? 'out' : i.stock <= i.reorder ? 'low' : 'ok';

/* ---------- payments / invoices ---------- */
function addPayment({ amount, method = 'Cash', invoiceId = null, jobId = null, date, note = '', branch }) {
  const p = { id: uid('p'), date: date || todayS(), ts: date ? parseD(date).getTime() + 13 * 3600e3 : Date.now(), amount: +(+amount).toFixed(2), method, invoiceId, jobId, note, branch: branch || '', by: USER ? USER.id : null };
  DB.payments.push(p); return p;
}
const invPaid = inv => sum(DB.payments.filter(p => p.invoiceId === inv.id), p => p.amount);
const invBalance = inv => inv.void ? 0 : Math.max(0, +(inv.amount - invPaid(inv)).toFixed(2));
function invStatus(inv) { if (inv.void) return 'void'; const p = invPaid(inv); if (p >= inv.amount - 0.005) return 'paid'; if (p > 0.004) return 'partial'; return 'unpaid'; }
const INV_ST = { paid: ['Paid', 'green'], partial: ['Partial', 'amber'], unpaid: ['Unpaid', 'red'], void: ['Void', 'grey'] };
const invPill = inv => { const s = invStatus(inv); return pill(INV_ST[s][0], INV_ST[s][1]); };
function voidInvoice(inv, refund = true) {
  if (inv.void) return;
  const paid = invPaid(inv); inv.void = true;
  if (refund && paid > 0) addPayment({ amount: -paid, method: 'Cash', invoiceId: inv.id, note: 'Refund — invoice voided', branch: inv.branch });
  if (inv.type === 'sale') { const s = byId(DB.sales, inv.saleId); if (s && !s.void) { s.void = true; s.lines.forEach(l => l.itemId && moveStock(l.itemId, l.qty, 'Sale voided', s.code)); } DB.warranties.filter(w => w.saleId === inv.saleId).forEach(w => w.voided = true); }
  logAct(`Voided invoice ${inv.code}`, 'invoices/' + inv.code);
}

/* ---------- jobs ---------- */
function jobTotals(j) {
  const partsT = sum(j.parts, p => p.qty * p.price), cogs = sum(j.parts, p => p.qty * p.cost);
  const total = Math.max(0, partsT + (+j.labor || 0) - (+j.discount || 0));
  const paid = j.invoiceId ? invPaid(invOf(j.invoiceId) || {}) : sum(DB.payments.filter(p => p.jobId === j.id), p => p.amount);
  return { partsT, cogs, labor: +j.labor || 0, discount: +j.discount || 0, total, paid, due: Math.max(0, total - paid) };
}
function createJob(d) {
  let custId = d.custId;
  if (custId === '__new') { const c = { id: uid('c'), name: d.newName, phone: d.newPhone || '', email: '', address: '', notes: '', createdAt: todayS() }; DB.customers.push(c); custId = c.id; logAct(`Added customer ${c.name}`, 'customers/' + c.id); }
  const j = { id: uid('j'), code: jobCode(), custId, brand: d.brand, model: d.model, imei: d.imei || '', issue: d.issue, accessories: d.accessories || '', priority: d.priority || 'normal', techId: d.techId || null, branch: d.branch || DB.settings.branches[0], status: 'received', createdAt: d.date || todayS(), due: d.due || addDays(d.date || todayS(), 3), estimate: +d.estimate || 0, labor: +d.estimate || 0, discount: 0, parts: [], notes: '', timeline: [], deliveredAt: null, invoiceId: null, isWarranty: !!d.isWarranty, warrantyId: d.warrantyId || null, tag: bagTag(DB), svcIds: d.svcIds || [], grade: d.grade || '' };
  logJob(j, 'Repair job received' + (d.isWarranty ? ' (warranty claim)' : ''), d.ts);
  DB.jobs.push(j);
  if (+d.advance > 0) { addPayment({ amount: d.advance, method: d.method || 'Cash', jobId: j.id, note: 'Advance payment', date: d.date, branch: j.branch }); logJob(j, `Advance of ${money(d.advance)} collected`, d.ts); }
  logAct(`New repair ${j.code}: ${j.brand} ${j.model} for ${custName(custId)}`, 'jobs/' + j.code, d.ts);
  return j;
}
function addJobPart(j, item, qty) {
  qty = +qty; if (!(qty > 0)) return 'Enter a quantity';
  if (item.stock < qty) return `Only ${item.stock} in stock`;
  const price = j.isWarranty ? 0 : item.price;
  const ex = j.parts.find(p => p.itemId === item.id);
  if (ex) ex.qty += qty; else j.parts.push({ id: uid('pt'), itemId: item.id, name: item.name, qty, price, cost: item.cost });
  moveStock(item.id, -qty, 'Used in repair', j.code); logJob(j, `Added part: ${item.name} × ${qty}`); return null;
}
function removeJobPart(j, partId) {
  const p = j.parts.find(x => x.id === partId); if (!p) return;
  j.parts = j.parts.filter(x => x.id !== partId); if (itemOf(p.itemId)) moveStock(p.itemId, p.qty, 'Removed from repair', j.code); logJob(j, `Removed part: ${p.name}`);
}
function setJobStatus(j, st, note) {
  if (j.status === st) return; const from = j.status; j.status = st;
  logJob(j, `Status: ${JOB_ST[from].l} → ${JOB_ST[st].l}${note ? ' — ' + note : ''}`);
  logAct(`${j.code} moved to ${JOB_ST[st].l}`, 'jobs/' + j.code);
}
function deliverJob(j, { date, pay = 0, method = 'Cash', warrantyDays = 0 }) {
  if (j.intake && j.intake.pass) { j.intake.pass = ''; j.intake.passErased = true; }
  date = date || todayS(); const t = jobTotals(j);
  const lines = []; if (t.labor) lines.push({ desc: 'Repair labor / service', qty: 1, price: t.labor, cost: 0 });
  j.parts.forEach(p => lines.push({ itemId: p.itemId, desc: p.name, qty: p.qty, price: p.price, cost: p.cost }));
  const inv = { id: uid('i'), code: invCode(), type: 'job', jobId: j.id, custId: j.custId, date, due: date, amount: t.total, cogs: t.cogs, branch: j.branch, techId: j.techId, lines, discount: t.discount, void: false };
  DB.invoices.push(inv); j.invoiceId = inv.id;
  DB.payments.filter(p => p.jobId === j.id && !p.invoiceId).forEach(p => p.invoiceId = inv.id);
  if (pay > 0) addPayment({ amount: pay, method, invoiceId: inv.id, jobId: j.id, date, note: 'Payment on delivery', branch: j.branch });
  j.status = 'delivered'; j.deliveredAt = date; logJob(j, `Delivered to customer · invoice ${inv.code}`, parseD(date).getTime() + 15 * 3600e3);
  logAct(`${j.code} delivered: ${inv.code} ${money(inv.amount)}`, 'jobs/' + j.code, parseD(date).getTime() + 15 * 3600e3);
  if (warrantyDays > 0) {
    const w = { id: uid('w'), code: warCode(), kind: 'repair', jobId: j.id, saleId: null, custId: j.custId, title: `${j.brand} ${j.model}`, covers: j.parts.length ? j.parts.map(p => p.name).join(', ') : 'Repair labor', start: date, days: warrantyDays, expires: addDays(date, warrantyDays), claims: [], voided: false };
    DB.warranties.push(w);
  }
  if (j.warrantyId) { const w = byId(DB.warranties, j.warrantyId); if (w) w.claims.forEach(c => { if (c.jobId === j.id) c.status = 'resolved'; }); }
  return inv;
}
function cancelJob(j, reason, refund) {
  j.parts.forEach(p => itemOf(p.itemId) && moveStock(p.itemId, p.qty, 'Job cancelled', j.code)); j.parts = [];
  const adv = sum(DB.payments.filter(p => p.jobId === j.id && !p.invoiceId), p => p.amount);
  if (refund && adv > 0) { addPayment({ amount: -adv, jobId: j.id, note: 'Advance refunded (job cancelled)', branch: j.branch }); }
  setJobStatus(j, 'cancelled', reason);
  const w = j.warrantyId && byId(DB.warranties, j.warrantyId); if (w) w.claims.forEach(c => { if (c.jobId === j.id) c.status = 'rejected'; });
}

/* ---------- sales ---------- */
function createSale({ lines, custId, discount = 0, method = 'Cash', received, branch, date }) {
  date = date || todayS();
  const sale = { id: uid('s'), code: saleCode(), date, ts: date === todayS() ? Date.now() : parseD(date).getTime() + 14 * 3600e3, custId: custId || null, lines, discount, method, branch: branch || DB.settings.branches[0], by: USER ? USER.id : null, void: false };
  const total = Math.max(0, sum(lines, l => l.qty * l.price) - discount);
  DB.sales.push(sale);
  lines.forEach(l => l.itemId && moveStock(l.itemId, -l.qty, 'Sold (POS)', sale.code, date));
  const recv = received ?? total;
  const inv = { id: uid('i'), code: invCode(), type: 'sale', saleId: sale.id, custId: sale.custId, date, due: recv >= total ? date : addDays(date, 7), amount: total, cogs: sum(lines, l => l.qty * l.cost), branch: sale.branch, techId: null, lines: lines.map(l => ({ itemId: l.itemId, desc: l.name, qty: l.qty, price: l.price, cost: l.cost })), discount, void: false };
  DB.invoices.push(inv); sale.invoiceId = inv.id;
  const pay = Math.min(received ?? total, total); if (pay > 0) addPayment({ amount: pay, method, invoiceId: inv.id, date, note: 'POS sale', branch: sale.branch });
  lines.forEach(l => { const it = l.itemId && itemOf(l.itemId); if (it && it.warrantyDays > 0) DB.warranties.push({ id: uid('w'), code: warCode(), kind: 'product', jobId: null, saleId: sale.id, custId: sale.custId, title: it.name, covers: 'Manufacturing defects', start: date, days: it.warrantyDays, expires: addDays(date, it.warrantyDays), claims: [], voided: false }); });
  logAct(`Sale ${sale.code}: ${money(total)}`, 'invoices/' + inv.code, sale.ts);
  return { sale, inv };
}

/* ---------- warranty ---------- */
function warStatus(w) {
  if (w.voided) return 'void'; if (w.claims.some(c => c.status === 'open')) return 'claimed';
  const left = diffDays(w.expires, todayS()); if (left < 0) return 'expired'; if (left <= 7) return 'expiring'; return 'active';
}
const WAR_ST = { active: ['Active', 'green'], expiring: ['Expiring soon', 'amber'], expired: ['Expired', 'grey'], claimed: ['In claim', 'violet'], void: ['Void', 'red'] };

/* ---------- purchases ---------- */
const poTotal = p => sum(p.lines, l => l.qty * l.cost);
const poPaid = p => sum(p.payments, x => x.amount);
const supDue = id => sum(DB.purchases.filter(p => p.supplierId === id && p.status !== 'cancelled'), p => poTotal(p) - poPaid(p));
function receivePO(p, date) {
  p.lines.forEach(l => { const it = itemOf(l.itemId); if (!it) return; const old = Math.max(0, it.stock); it.cost = old > 0 ? +((old * it.cost + l.qty * l.cost) / (old + l.qty)).toFixed(2) : l.cost; moveStock(l.itemId, l.qty, 'Purchase received', p.code, date); });
  p.status = 'received'; p.receivedAt = date || todayS(); logAct(`Received ${p.code} from ${(supOf(p.supplierId) || {}).name}`, 'purchases/' + p.code);
}

/* ---------- analytics ---------- */
function periodStats(from, to, f = {}) {
  const inR = d => d >= from && d <= to;
  const jobs = new Map(DB.jobs.map(j => [j.id, j]));
  const jobOk = j => (!f.branch || j.branch === f.branch) && (!f.tech || j.techId === f.tech) && (!f.status || j.status === f.status);
  const inv = DB.invoices.filter(i => !i.void && inR(i.date) && (!f.branch || i.branch === f.branch) && (i.type === 'job' ? jobOk(jobs.get(i.jobId) || { branch: i.branch }) : !(f.tech || f.status)));
  const revenue = sum(inv, i => i.amount), cogs = sum(inv, i => i.cogs);
  const noCost = sum(inv, i => i.lines.filter(l => l.itemId && !(l.cost > 0)).length);
  const opex = (f.tech || f.status) ? 0 : sum(DB.expenses.filter(e => inR(e.date) && (!f.branch || e.branch === f.branch)), e => e.amount);
  const taken = DB.jobs.filter(j => inR(j.createdAt) && jobOk(j)).length;
  const deliveredJobs = DB.jobs.filter(j => j.deliveredAt && inR(j.deliveredAt) && jobOk(j));
  const jobRev = sum(inv.filter(i => i.type === 'job'), i => i.amount);
  const collected = sum(DB.payments.filter(p => inR(p.date) && (!f.branch || p.branch === f.branch) && (!(f.tech || f.status) || (p.jobId && jobOk(jobs.get(p.jobId) || {}) ))), p => p.amount);
  const days = []; for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  const rm = {}, gm = {}; inv.forEach(i => { rm[i.date] = (rm[i.date] || 0) + i.amount; gm[i.date] = (gm[i.date] || 0) + i.amount - i.cogs; });
  const daily = days.map(d => ({ d, revenue: rm[d] || 0, gross: gm[d] || 0 }));
  return { revenue, cogs, gross: revenue - cogs, opex, net: revenue - cogs - opex, taken, delivered: deliveredJobs.length, avgDelivered: deliveredJobs.length ? jobRev / deliveredJobs.length : 0, collected, noCost, daily, margin: revenue ? (revenue - cogs) / revenue * 100 : 0 };
}
function presetRange(p) {
  const t = todayS(), d = todayD();
  switch (p) {
    case 'today': return [t, t];
    case 'yesterday': return [addDays(t, -1), addDays(t, -1)];
    case '7d': return [addDays(t, -6), t];
    case '30d': return [addDays(t, -29), t];
    case 'month': return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), t];
    case 'lastmonth': return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))];
    case 'year': return [iso(new Date(d.getFullYear(), 0, 1)), t];
  }
  return [addDays(t, -29), t];
}

/* ---------- notifications / attention ---------- */
function attentionItems() {
  const out = []; const t = todayS(); const open = DB.jobs.filter(j => !['delivered', 'cancelled'].includes(j.status));
  open.filter(j => j.due < t).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4).forEach(j => out.push({ id: 'od:' + j.id, tone: 'red', icon: 'clock', t: `${j.code} is ${diffDays(t, j.due)}d overdue`, s: `${custName(j.custId)} · ${j.brand} ${j.model}`, href: 'jobs/' + j.code, cta: 'Open job' }));
  open.filter(j => j.online && j.status === 'received' && j.online.slot && j.online.slot.date === t).sort((a, b) => a.online.slot.time.localeCompare(b.online.slot.time)).slice(0, 3).forEach(j => out.push({ id: 'appt:' + j.id, tone: 'blue', icon: 'calendar', t: `${j.code} ${j.online.handoff === 'pickup' ? 'courier pickup' : 'drop-off'} today at ${j.online.slot.time}`, s: `${custName(j.custId)} · ${j.brand} ${j.model} · booked online`, href: 'jobs/' + j.code, cta: 'Open booking' }));
  open.filter(j => j.status === 'quote').slice(0, 3).forEach(j => out.push({ id: 'quote:' + j.id, tone: 'amber', icon: 'clock', t: `${j.code} is waiting for customer approval`, s: `${money((j.quote || {}).amount || 0)} quoted ${j.quote ? ago(j.quote.sentAt) : ''} · ${custName(j.custId)}`, href: 'jobs/' + j.code, cta: 'Follow up' }));
  const ready = open.filter(j => j.status === 'ready'); if (ready.length) out.push({ id: 'ready:' + ready.length, tone: 'green', icon: 'phoneDev', t: `${ready.length} device${ready.length > 1 ? 's' : ''} ready for pickup`, s: 'Let customers know to collect them', href: 'jobs', cta: 'View jobs' });
  if (isMgr()) {
    DB.items.filter(i => itemState(i) !== 'ok').sort((a, b) => a.stock - b.stock).slice(0, 3).forEach(i => out.push({ id: 'ls:' + i.id + ':' + i.stock, tone: i.stock <= 0 ? 'red' : 'amber', icon: 'package', t: i.stock <= 0 ? `${i.name} is out of stock` : `Low stock: ${i.name}`, s: `${i.stock} left · reorder at ${i.reorder}`, href: 'inventory/' + i.id, cta: 'Restock' }));
    const unpaid = DB.invoices.filter(i => !i.void && invBalance(i) > 0 && diffDays(t, i.due) >= 3);
    if (unpaid.length) out.push({ id: 'unpaid:' + unpaid.length, tone: 'amber', icon: 'file', t: `${unpaid.length} invoice${unpaid.length > 1 ? 's' : ''} with balance due`, s: `${money(sum(unpaid, invBalance))} outstanding`, href: 'invoices', cta: 'Review' });
  }
  DB.warranties.filter(w => warStatus(w) === 'expiring').slice(0, 2).forEach(w => out.push({ id: 'wx:' + w.id, tone: 'blue', icon: 'shield', t: `Warranty ${w.code} expires in ${Math.max(0, diffDays(w.expires, t))}d`, s: `${w.title} · ${custName(w.custId)}`, href: 'warranty', cta: 'View' }));
  return out;
}
function navCounts() {
  const open = DB.jobs.filter(j => !['delivered', 'cancelled'].includes(j.status)).length;
  return { jobs: open, inventory: DB.items.filter(i => itemState(i) !== 'ok').length, invoices: DB.invoices.filter(i => !i.void && invBalance(i) > 0).length, warranty: DB.warranties.filter(w => ['claimed', 'expiring'].includes(warStatus(w))).length };
}

/* ---------- sample data ---------- */
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedSample(db, techIds, cashierId) {
  const prev = DB, prevU = USER; DB = db; USER = null;
  const R = rng(20261114), pick = a => a[Math.floor(R() * a.length)], ri = (a, b) => Math.floor(R() * (b - a + 1)) + a;
  const T = todayS();
  db.settings.branches = ['Main branch', 'Mirpur branch']; db.settings.phone = '01711-482091'; db.settings.email = 'hello@dhanmondimobile.care'; db.settings.address = '42/B Elephant Road, Dhaka 1205';
  ['Dhaka Mobile Parts Ltd', 'Star Display House', 'Gadget Gate Imports', 'Elite Battery Co.', 'Bashundhara Accessories'].forEach((n, i) => db.suppliers.push({ id: uid('s'), name: n, contact: pick(['Mahfuz Hasan', 'Rubel Ahmed', 'Tanvir Alam', 'Shafiq Khan', 'Mizanur Rahman']), phone: '017' + ri(10000000, 99999999), email: n.split(' ')[0].toLowerCase() + '@supplier.bd', address: pick(['Gulshan 1, Dhaka', 'Chawkbazar, Dhaka', 'Motijheel, Dhaka', 'Multiplan Center, Dhaka']), notes: '' }));
  const S = db.suppliers;
  const CATALOG = [
    ['iPhone 11 LCD Display', 'Screens', 4500, 6800, 1, 90], ['iPhone 12 OLED Display', 'Screens', 9500, 13500, 1, 90], ['iPhone 13 OLED Display', 'Screens', 12000, 16500, 1, 90],
    ['Galaxy A54 Display', 'Screens', 5200, 7500, 1, 90], ['Galaxy A32 Display', 'Screens', 3300, 4800, 1, 90], ['Redmi Note 12 Display', 'Screens', 2400, 3600, 1, 90], ['Realme C55 Display', 'Screens', 2200, 3300, 1, 90], ['Vivo Y20 Display', 'Screens', 1900, 2900, 1, 90],
    ['iPhone 11 Battery', 'Batteries', 1100, 1900, 3, 180], ['iPhone 12 Battery', 'Batteries', 1300, 2200, 3, 180], ['Galaxy A-series Battery', 'Batteries', 700, 1300, 3, 180], ['Redmi 5000mAh Battery', 'Batteries', 650, 1200, 3, 180],
    ['Charging Port Flex (iPhone)', 'Parts', 350, 800, 0, 60], ['Charging Port (Type-C)', 'Parts', 180, 500, 0, 60], ['iPhone 12 Back Glass', 'Parts', 1800, 3200, 0, 30], ['Speaker Module', 'Parts', 180, 450, 0, 60], ['Camera Module (rear)', 'Parts', 900, 1800, 0, 90], ['Power Button Flex', 'Parts', 90, 300, 0, 60], ['Samsung Back Cover', 'Parts', 280, 700, 0, 30],
    ['Tempered Glass 25D', 'Accessories', 40, 150, 4, 0], ['Silicone Case', 'Accessories', 90, 280, 4, 0], ['20W Fast Charger', 'Accessories', 380, 750, 4, 90], ['USB-C Cable 1m', 'Accessories', 70, 220, 4, 30], ['Wireless Earbuds', 'Accessories', 300, 650, 4, 90], ['Power Bank 10000mAh', 'Accessories', 1100, 1800, 4, 90],
    ['Pry Opening Kit', 'Tools', 120, 300, 2, 0], ['Adhesive Tape Roll', 'Tools', 30, 100, 2, 0]
  ];
  CATALOG.forEach((c, i) => db.items.push({ id: uid('it'), sku: c[1].slice(0, 3).toUpperCase() + '-' + String(100 + i), name: c[0], category: c[1], cost: c[2], price: c[3], stock: 400, reorder: c[1] === 'Accessories' ? 8 : 3, supplierId: S[c[4]].id, warrantyDays: c[5] }));
  const NAMES = ['Rafiq Ahmed', 'Nusrat Jahan', 'Tanvir Hasan', 'Sadia Islam', 'Mehedi Hasan', 'Farhana Akter', 'Imran Hossain', 'Shirin Sultana', 'Arif Chowdhury', 'Jannat Ferdous', 'Rakib Mahmud', 'Mitu Rahman', 'Kamal Uddin', 'Tasnim Khan', 'Shakil Ahmed', 'Rupa Das', 'Habib Rahman', 'Lamia Haque', 'Sohel Rana', 'Nabila Karim', 'Zahid Hasan', 'Mim Akter', 'Faisal Kabir', 'Anika Tabassum', 'Rony Sarker', 'Sumaiya Begum', 'Asif Iqbal', 'Rina Parvin', 'Jubayer Alam', 'Tania Sharmin'];
  NAMES.forEach(n => db.customers.push({ id: uid('c'), name: n, phone: '01' + pick([3, 5, 6, 7, 8, 9]) + ri(10000000, 99999999), email: R() < .4 ? n.split(' ')[0].toLowerCase() + ri(1, 99) + '@gmail.com' : '', address: pick(['Dhanmondi, Dhaka', 'Mirpur 10, Dhaka', 'Uttara Sector 7', 'Mohammadpur, Dhaka', 'Banani, Dhaka', 'Badda, Dhaka', 'Gulshan 2, Dhaka']), notes: '', createdAt: addDays(T, -ri(5, 90)) }));
  const DEV = [['Apple', 'iPhone 11'], ['Apple', 'iPhone 12'], ['Apple', 'iPhone 13'], ['Samsung', 'Galaxy A54'], ['Samsung', 'Galaxy A32'], ['Xiaomi', 'Redmi Note 12'], ['Realme', 'C55'], ['Vivo', 'Y20'], ['Oppo', 'A57'], ['Infinix', 'Hot 30'], ['Symphony', 'Z60']];
  const ISSUES = [['Cracked screen', 'Screens', 3], ['Battery drains very fast', 'Batteries', 2], ['Not charging', 'Parts', 1.2], ['Water damage, won’t turn on', null, 4], ['No sound from speaker', 'Parts', .8], ['Rear camera blurry', 'Parts', 1.5], ['Back glass broken', 'Parts', 1.5], ['Hangs / software issue', null, 1.5], ['Power button stuck', 'Parts', .7], ['Screen flickering', 'Screens', 1.5]];
  const wIssues = []; ISSUES.forEach(i => { for (let k = 0; k < Math.round(i[2] * 2); k++) wIssues.push(i); });
  const findPart = (cat, model) => { const pool = db.items.filter(i => i.category === cat); const m = pool.filter(i => model.split(' ').some(w => w.length > 2 && i.name.includes(w))); return pick(m.length ? m : pool); };
  const branches = db.settings.branches;
  for (let off = 62; off >= 0; off--) {
    const date = addDays(T, -off); window.__seedTs = parseD(date).getTime() + 11 * 3600e3; const wd = parseD(date).getDay(); const n = wd === 5 ? ri(0, 1) : pick([0, 1, 1, 1, 2, 2, 3]);
    for (let k = 0; k < n; k++) {
      const [brand, model] = pick(DEV), [issue, cat] = pick(wIssues);
      const c = pick(db.customers), tech = pick(techIds), labor = ri(3, 18) * 100;
      const j = createJob({ custId: c.id, brand, model, issue, techId: tech, branch: R() < .72 ? branches[0] : branches[1], date, due: addDays(date, ri(1, 5)), estimate: labor, advance: R() < .25 ? ri(2, 8) * 100 : 0, priority: R() < .1 ? 'urgent' : R() < .2 ? 'high' : 'normal', imei: '35' + ri(1000000, 9999999) + ri(100000, 999999), ts: parseD(date).getTime() + ri(9, 18) * 3600e3 });
      if (cat) addJobPart(j, findPart(cat, model), 1);
      const roll = R();
      const deliver = off > 10 ? (roll < .95 ? 'd' : 'c') : off > 5 ? (roll < .78 ? 'd' : roll < .86 ? 'r' : roll < .91 ? 'p' : roll < .96 ? 'w' : 'c') : off > 1 ? (roll < .3 ? 'd' : pick(['r', 'p', 'w', 'g', 'x'])) : pick(['x', 'g', 'p', 'w', 'x']);
      if (deliver === 'd') { const dd = addDays(date, Math.min(ri(0, 4), off)); const t = jobTotals(j); const full = R() < .9; setJobStatus(j, 'ready'); deliverJob(j, { date: dd, pay: full ? t.due : Math.round(t.due * .6), method: pick(PAY_METHODS), warrantyDays: j.parts.length ? Math.max(...j.parts.map(p => itemOf(p.itemId).warrantyDays || 30)) : 30 }); }
      else if (deliver === 'c') cancelJob(j, 'Customer declined quote', true);
      else if (deliver === 'r') setJobStatus(j, 'ready'); else if (deliver === 'p') setJobStatus(j, 'repairing'); else if (deliver === 'w') setJobStatus(j, 'waiting_parts'); else if (deliver === 'g') setJobStatus(j, 'diagnosing');
    }
    const sn = pick([0, 1, 1, 1, 2]);
    for (let k = 0; k < sn; k++) {
      const pool = db.items.filter(i => ['Accessories', 'Tools'].includes(i.category)); const lines = []; for (let q = 0; q < ri(1, 3); q++) { const it = pick(pool); if (!lines.find(l => l.itemId === it.id)) lines.push({ itemId: it.id, name: it.name, qty: ri(1, 2), price: it.price, cost: it.cost }); }
      createSale({ lines, custId: R() < .2 ? pick(db.customers).id : null, discount: R() < .15 ? 50 : 0, method: pick(['Cash', 'Cash', 'bKash', 'Nagad', 'Card']), branch: R() < .7 ? branches[0] : branches[1], date });
    }
  }
  /* expenses */
  window.__seedTs = null;
  const d0 = todayD();
  for (let m = 2; m >= 0; m--) {
    const first = new Date(d0.getFullYear(), d0.getMonth() - m, 1); const mk = day => { const x = new Date(first.getFullYear(), first.getMonth(), day); return iso(x); };
    [['Rent', 'Shop rent — ' + MON[first.getMonth()], 8000, 1], ['Internet', 'Broadband bill', 1200, 5], ['Utilities', 'Electricity bill', ri(16, 21) * 100, 10], ['Salaries', 'Part-time helper', 6000, 28], ['Marketing', 'Facebook page boost', ri(8, 20) * 100, 14], ['Transport', 'Parts pickup & courier', ri(4, 9) * 100, 18], ['Tools & equipment', 'Soldering station tips', ri(3, 8) * 100, 20]].forEach(([cat, note, amt, day]) => { const dt = mk(day); if (dt <= T) db.expenses.push({ id: uid('e'), date: dt, category: cat, amount: amt, note, method: cat === 'Rent' ? 'Bank transfer' : 'Cash', branch: branches[0], by: null }); });
  }
  /* purchases */
  for (let k = 0; k < 7; k++) {
    const date = addDays(T, -ri(3, 55)); const s = pick(S); const pool = db.items.filter(i => i.supplierId === s.id); if (!pool.length) continue;
    const lines = pool.slice(0, ri(1, 3)).map(it => ({ itemId: it.id, qty: it.cost > 1500 ? ri(1, 2) : it.cost > 500 ? ri(2, 5) : ri(6, 20), cost: it.cost })); const p = { id: uid('po'), code: poCode(), supplierId: s.id, date, status: 'ordered', lines, payments: [], note: '', receivedAt: null };
    db.purchases.push(p); const tot = poTotal(p); p.payments.push({ date, amount: Math.round(tot * pick([1, 1, .5, .7])), method: 'Bank transfer' }); const rd = addDays(date, 2 > off(date) ? 0 : 2); window.__seedTs = parseD(rd).getTime() + 10 * 3600e3; receivePO(p, rd); window.__seedTs = null;
  }
  function off(d) { return diffDays(T, d); }
  { const s = S[1]; const it = db.items.filter(i => i.supplierId === s.id).slice(0, 2); db.purchases.push({ id: uid('po'), code: poCode(), supplierId: s.id, date: addDays(T, -2), status: 'ordered', lines: it.map(i => ({ itemId: i.id, qty: 2, cost: i.cost })), payments: [], note: 'Expected within 3 days', receivedAt: null }); }
  /* final stock */
  db.items.forEach((it, i) => { it.stock = i % 9 === 4 ? ri(0, it.reorder) : i % 11 === 7 ? 0 : ri(it.reorder + 2, 22); });
  db.moves = db.moves.slice(-600);
  /* one warranty claim in progress */
  const w = db.warranties.find(x => x.kind === 'repair' && warStatus(x) === 'active');
  if (w) { const oj = jobOf(w.jobId); const cj = createJob({ custId: w.custId, brand: oj.brand, model: oj.model, issue: 'Warranty claim: issue returned after repair', techId: techIds[0], branch: oj.branch, isWarranty: true, warrantyId: w.id, estimate: 0, priority: 'high', date: addDays(T, -1) }); cj.labor = 0; w.claims.push({ id: uid('cl'), date: addDays(T, -1), note: 'Issue returned after repair', jobId: cj.id, status: 'open' }); setJobStatus(cj, 'diagnosing'); }
  window.__seedTs = null; db.activity.sort((a, b) => b.ts - a.ts); db.activity.length = Math.min(db.activity.length, 60);
  db.jobs.forEach(j => j.timeline.sort((a, b) => a.ts - b.ts));
  DB = prev; USER = prevU;
}
