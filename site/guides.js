'use strict';
/* Repair guides — shared by home, catalog and repair pages. */

const GUIDES = [
  { id: 'battery', svc: 'battery', by: 'Rahim Uddin', role: 'Senior technician', tag: 'Battery', date: '18 Nov 2026', read: '3 min', t: '5 signs your battery needs replacing — not your phone', d: 'Most “my phone is dying” problems are a ৳1,800 battery, not a new phone.', body: [['It shuts down at 15–30%', 'A worn cell can’t hold voltage under load, so the phone cuts out even though the percentage says otherwise.'], ['It gets warm doing nothing', 'Heat while idle often means the battery is working too hard — or a background app is. We check both for free.'], ['The back or screen is lifting', 'Stop charging and bring it in today. A swollen battery is a safety issue.'], ['Battery health under 80%', 'On iPhone: Settings → Battery → Battery Health. Below 80% is when most people notice it.'], ['It only works plugged in', 'That’s the battery or the port. A free check tells you which before you pay anything.']] },
  { id: 'water', svc: 'water', by: 'Sabbir Khan', role: 'Board-level repair', tag: 'Emergency', date: '12 Nov 2026', read: '2 min', t: 'Dropped it in water? Do this in the first hour', d: 'What to do — and what rice won’t fix.', body: [['Switch it off now', 'Don’t test if it works. Power plus water is what damages the board.'], ['Skip the rice', 'Rice doesn’t pull water from inside. It just delays a proper clean while corrosion starts.'], ['Don’t charge it', 'Even if it seems fine. Charging a wet phone is the most common way to lose it.'], ['Bring it in within 24 hours', 'Our ultrasonic clean works best early. Data rescue is included in the price.']] },
  { id: 'screen', svc: 'screen', by: 'Rahim Uddin', role: 'Senior technician', tag: 'Buying guide', date: '4 Nov 2026', read: '4 min', t: 'Compatible vs original screens: an honest comparison', d: 'When saving 30% makes sense — and when it doesn’t.', body: [['What “original” means', 'A manufacturer part, where we can source it. Best colour accuracy and brightness.'], ['What “premium compatible” means', 'A tested high-grade panel. Touch, Face ID and True Tone keep working; colours are very close.'], ['Same warranty either way', 'Both carry the same written warranty. If it fails, we replace it free.'], ['Our advice', 'Keeping the phone for 2+ years or using it for photo work? Go original. Otherwise compatible is great value.']] }
];

function openGuide(id) {
  const x = GUIDES.find(z => z.id === id); if (!x) return; const s = svcById(x.svc);
  openLayer('guide', `<article class="rd" role="dialog" aria-modal="true" aria-labelledby="rdT"><button class="x" type="button" data-close-layer aria-label="Close">${ic('x', 20)}</button><div class="rd-art">${art(META[x.svc].art)}</div><div class="rd-in"><span class="gd-tag dark">${x.tag} · ${x.read} read</span><h2 id="rdT">${x.t}</h2><p class="rd-lead">${x.d}</p><ol>${x.body.map(([h, p]) => `<li><b>${h}</b><p>${p}</p></li>`).join('')}</ol>
    <div class="rd-cta"><div><small>${esc(Shop.dev.model)}</small><b>${s.name} · ${s.id === 'diag' ? 'Free' : 'from ' + fmtBDT(fromPrice(s, Shop.dev))}</b></div><a class="s-btn primary" href="repair.html?id=${s.id}">View repair</a><button class="s-btn" type="button" data-rd-ai>Ask the assistant</button></div></div></article>`, w => {
    w.querySelector('[data-rd-ai]').onclick = () => { closeLayer(); AI.open(`${Shop.dev.model} ${s.name.toLowerCase()}`); }; });
}
/* article card (tips rail) */
function guideCard(x) {
  return `<article class="ar-card"><button type="button" class="ar-hit" data-guide="${x.id}" aria-label="Read: ${esc(x.t)}"></button><div class="ar-pic" aria-hidden="true">${art(META[x.svc].art)}<span class="ar-tag">${x.tag}</span></div>
    <div class="ar-body"><small>${x.date} · ${x.read} read</small><h3>${x.t}</h3><p>${x.d}</p><span class="ar-by"><span class="ar-av">${esc(initials(x.by))}</span>${esc(x.by)}<span class="ar-go" aria-hidden="true">${ic('right', 16)}</span></span></div></article>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-guide]'); if (b) openGuide(b.dataset.guide); });
