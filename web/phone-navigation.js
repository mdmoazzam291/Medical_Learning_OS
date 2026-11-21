// Phone navigation (ADR-155). Works on top of the shared shell rendered by navigation.js:
// - tap another bottom tab: back to where you left off in that area
// - tap the current tab, press-and-hold any tab, or tap the area chip: area menu sheet
// - resume bar for an unfinished study session, reading mode, page/action search hints
import { routeIdentity, navigationFor, preferenceStore } from '/src/domain/app-navigation.js';
import { areaMenuModel, isPhoneArea, areaLabel, searchSuggestions, resumeRecordFor } from '/src/domain/phone-navigation.js';
import { mutatePreference } from '/web/navigation-preferences.js';
import { readStudyResume } from '/web/study-resume.js';

const VISITS_KEY = 'mlos-nav-visits-v1', LAST_KEY = 'mlos-nav-last-v1', DISMISSED_KEY = 'mlos-resume-dismissed-v1';
const store = preferenceStore();
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Optional device memory. */ } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shell = () => document.getElementById('mlos-navigation');
const isAdmin = () => globalThis.mlosNavigationAdmin === true;
const identity = () => routeIdentity(location.pathname, location.search, location.hash);
const active = () => document.body.dataset.navigationLayout === 'phone' && Boolean(shell()?.querySelector('.mlos-tabbar'));
const conceptId = () => new URLSearchParams(location.search).get('concept') || '';
const conceptLabel = () => ['.cw-concept-heading h2', '.vault-concept h1', '.vault-note h1'].map(sel => document.querySelector(sel)?.textContent?.trim()).find(Boolean)?.slice(0, 60) || '';

let lastGesture = 0, drawerFromSheet = false, learnerId = '', visitRecorded = false, sheetArea = '', sheetOpener = null, showAll = false, holdTimer = 0, held = false, lastY = 0;

function recordVisit() {
  if (visitRecorded) return;
  const { master, section } = identity();
  if (!isPhoneArea(master)) return;
  visitRecorded = true;
  const visits = read(VISITS_KEY, {}), key = master + ':' + section;
  visits[key] = Math.min(9999, (Number(visits[key]) || 0) + 1);
  write(VISITS_KEY, visits);
  const last = read(LAST_KEY, {});
  last[master] = location.pathname + location.search;
  write(LAST_KEY, last);
}

function currentSectionLabel() {
  const { master, section } = identity();
  return navigationFor(master, { isAdmin: isAdmin() }).find(r => r.id === section)?.label || areaLabel(master);
}

function decorate() {
  const root = shell();
  if (!active()) { root?.querySelectorAll('.mlos-crumb, .mlos-resume, .mlos-nav-pill').forEach(n => n.remove()); closeSheet(false); delete document.body.dataset.navCollapsed; delete document.body.dataset.phoneAreaNav; return; }
  recordVisit();
  const { master } = identity();
  // The ≡ drawer gives way to the area menu only inside the four learning areas.
  if (isPhoneArea(master)) document.body.dataset.phoneAreaNav = 'true'; else delete document.body.dataset.phoneAreaNav;
  const last = read(LAST_KEY, {});
  root.querySelectorAll('.mlos-tabbar a[data-tab]').forEach(a => {
    const area = a.dataset.tab, current = area === master;
    if (!current && typeof last[area] === 'string' && last[area].startsWith('/')) a.setAttribute('href', last[area]);
    a.setAttribute('aria-haspopup', 'dialog');
    a.setAttribute('aria-expanded', String(sheetArea === area));
    a.setAttribute('aria-label', areaLabel(area) + (current ? ': show its pages' : ''));
  });
  if (isPhoneArea(master) && !root.querySelector('.mlos-crumb')) {
    const header = root.querySelector('.mlos-header');
    const crumb = document.createElement('div');
    crumb.className = 'mlos-crumb';
    crumb.innerHTML = '<button type="button" data-area-menu="' + esc(master) + '" aria-haspopup="dialog" aria-label="' + esc(areaLabel(master) + ', ' + currentSectionLabel() + ': show ' + areaLabel(master) + ' pages') + '"><span>' + esc(areaLabel(master)) + '</span><span aria-hidden="true">›</span><strong>' + esc(currentSectionLabel()) + '</strong><span aria-hidden="true" class="mlos-crumb-caret">▾</span></button>';
    header?.after(crumb);
  }
  renderResume();
  if (!root.querySelector('.mlos-nav-pill')) {
    const pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'mlos-nav-pill'; pill.dataset.navExpand = '';
    pill.innerHTML = '<span aria-hidden="true">▴</span> ' + esc(areaLabel(master) || 'Menu');
    pill.setAttribute('aria-label', 'Show navigation');
    root.append(pill);
  }
}

function renderResume() {
  const root = shell(); root.querySelector('.mlos-resume')?.remove();
  if (location.pathname.endsWith('/medical.html')) return;
  const record = resumeRecordFor(readStudyResume(), learnerId);
  if (!record || read(DISMISSED_KEY, '') === record.sessionId) return;
  const bar = document.createElement('div');
  bar.className = 'mlos-resume';
  const pct = Math.round(Math.min(1, record.position / record.total) * 100);
  bar.innerHTML = '<a href="' + esc(record.href) + '"><span class="mlos-resume-play" aria-hidden="true">▶</span><span><strong>Resume study session</strong><span>Question ' + (record.position + 1) + ' of ' + record.total + '</span></span></a><button type="button" data-resume-dismiss="' + esc(record.sessionId) + '" aria-label="Hide resume bar">✕</button><span class="mlos-resume-progress" aria-hidden="true" style="width:' + pct + '%"></span>';
  root.querySelector('.mlos-tabbar')?.before(bar);
}

function rowMarkup(row, { showArea = false } = {}) {
  const meta = (showArea ? esc(row.areaLabel) + ' · ' : '') + esc(row.description);
  return '<li class="mlos-sheet-row"><a href="' + esc(row.href) + '"' + (row.current ? ' aria-current="page"' : '') + '><span><span class="mlos-sheet-label">' + esc(row.label) + '</span>' + (meta ? '<span class="mlos-sheet-meta">' + meta + '</span>' : '') + '</span>' + (row.current ? '<span class="mlos-sheet-check" aria-hidden="true">✓</span>' : '') + '</a><button type="button" class="mlos-sheet-pin" data-sheet-pin="' + esc(row.key) + '" aria-pressed="' + row.pinned + '" aria-label="' + (row.pinned ? 'Unpin ' : 'Pin ') + esc(row.label) + '">' + (row.pinned ? '★' : '☆') + '</button></li>';
}

function sheetMarkup(model) {
  const concept = model.concept ? '<section class="mlos-sheet-concept" aria-label="Shortcuts for this concept"><h3>For ' + esc(model.concept.label) + '</h3><div>' + model.concept.links.map(l => '<a href="' + esc(l.href) + '"' + (l.current ? ' aria-current="page"' : '') + '>' + esc(l.label) + '</a>').join('') + '</div></section>' : '';
  const pinned = model.pinned.length ? '<h3>★ Pinned</h3><ul>' + model.pinned.map(r => rowMarkup(r, { showArea: true })).join('') + '</ul>' : '';
  const yours = '<h3>Your pages</h3><ul>' + model.yours.map(r => rowMarkup(r)).join('') + '</ul>';
  const all = '<button type="button" class="mlos-sheet-all" data-sheet-all aria-expanded="' + showAll + '" aria-controls="mlos-sheet-groups">All ' + model.count + ' ' + esc(model.label) + ' pages <span aria-hidden="true">' + (showAll ? '▴' : '▾') + '</span></button><div id="mlos-sheet-groups"' + (showAll ? '' : ' hidden') + '>' + model.groups.map(g => (g.name ? '<h3>' + esc(g.name) + '</h3>' : '') + '<ul>' + g.rows.map(r => rowMarkup(r)).join('') + '</ul>').join('') + '</div>';
  return '<button type="button" class="mlos-sheet-backdrop" data-sheet-close tabindex="-1" aria-label="Close ' + esc(model.label) + ' pages"></button>' +
    '<section class="mlos-sheet" role="dialog" aria-modal="false" aria-labelledby="mlos-sheet-title"><div class="mlos-sheet-head"><span class="mlos-sheet-grip" aria-hidden="true"></span><div><h2 id="mlos-sheet-title" tabindex="-1">' + esc(model.label) + '</h2>' + (model.start ? '<a class="mlos-sheet-start" href="' + esc(model.start.href) + '">Open ' + esc(model.start.label) + ' ›</a>' : '') + '<button type="button" class="mlos-sheet-close" data-sheet-close aria-label="Close">✕</button></div></div>' +
    '<div class="mlos-sheet-body">' + concept + pinned + yours + all + '<a class="mlos-sheet-search" href="#" data-sheet-search>Looking for a topic or an action? Search everything</a><button type="button" class="mlos-sheet-more" data-sheet-drawer>All sections &amp; settings</button></div></section>';
}

function renderSheet(focus = true) {
  let host = document.getElementById('mlos-area-sheet');
  if (!host) { host = document.createElement('div'); host.id = 'mlos-area-sheet'; document.body.append(host); }
  const prefs = store.read();
  const model = areaMenuModel(sheetArea, { isAdmin: isAdmin(), current: identity(), visits: read(VISITS_KEY, {}), pins: prefs.pins || [], conceptId: conceptId(), conceptLabel: conceptLabel() });
  if (!model) return closeSheet(false);
  host.innerHTML = sheetMarkup(model);
  host.hidden = false;
  document.body.dataset.areaSheet = 'open';
  shell()?.querySelectorAll('.mlos-tabbar a[data-tab]').forEach(a => a.setAttribute('aria-expanded', String(a.dataset.tab === sheetArea)));
  shell()?.querySelector('.mlos-tabbar a[data-tab="' + sheetArea + '"]')?.classList.add('mlos-tab-open');
  if (focus) host.querySelector('#mlos-sheet-title')?.focus();
}

function openSheet(area, opener) {
  if (!isPhoneArea(area)) return;
  expandBars();
  sheetArea = area; sheetOpener = opener || null; showAll = false;
  renderSheet();
}

function closeSheet(restoreFocus = true) {
  const host = document.getElementById('mlos-area-sheet');
  if (!sheetArea && !host) return;
  sheetArea = '';
  if (host) { host.hidden = true; host.innerHTML = ''; }
  delete document.body.dataset.areaSheet;
  shell()?.querySelectorAll('.mlos-tabbar a[data-tab]').forEach(a => { a.setAttribute('aria-expanded', 'false'); a.classList.remove('mlos-tab-open'); });
  if (restoreFocus) sheetOpener?.focus?.();
  sheetOpener = null;
}

function togglePin(key) {
  mutatePreference(store, { type: 'pin', id: key }, next => window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs: next } })));
  renderSheet(false);
  document.querySelector('#mlos-area-sheet [data-sheet-pin="' + CSS.escape(key) + '"]')?.focus();
}

function expandBars() { delete document.body.dataset.navCollapsed; }

// Reading mode: scrolling down tucks the header and bottom bar away; scrolling up brings them back.
function onScroll() {
  if (!active() || sheetArea || document.body.dataset.drawer === 'open') { lastY = scrollY; return; }
  const y = scrollY, dy = y - lastY;
  // Only the learner's own swipe/wheel collapses the bars; anchor jumps and focus scrolling never hide them.
  const byLearner = Date.now() - lastGesture < 600;
  if (y < 80 || dy < -12) expandBars();
  else if (byLearner && y > 160 && dy > 12) document.body.dataset.navCollapsed = 'true';
  if (Math.abs(dy) > 12 || y < 80) lastY = y;
}

function renderSuggestions(input) {
  const form = input.closest('form');
  if (!form || !active()) return;
  let box = form.parentElement.querySelector('#mlos-search-suggestions');
  const { actions, pages } = searchSuggestions(input.value, { isAdmin: isAdmin() });
  if (!actions.length && !pages.length) { box?.remove(); input.removeAttribute('aria-describedby'); return; }
  if (!box) { box = document.createElement('div'); box.id = 'mlos-search-suggestions'; box.className = 'mlos-search-suggestions'; form.after(box); }
  const list = (title, items) => items.length ? '<h3>' + title + '</h3><ul>' + items.map(i => '<li><a href="' + esc(i.href) + '"><strong>' + esc(i.label) + '</strong><span>' + esc(i.detail) + '</span></a></li>').join('') + '</ul>' : '';
  box.innerHTML = list('Do', actions) + list('Go to', pages) + '<p>Press Search to find “' + esc(input.value.trim()) + '” in questions and notes.</p>';
  box.style.top = Math.round(input.getBoundingClientRect().bottom + 8) + 'px';
  input.setAttribute('aria-describedby', 'mlos-search-suggestions');
}

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const chip = target.closest('[data-area-menu]');
  if (chip) { event.preventDefault(); openSheet(chip.dataset.areaMenu, chip); return; }
  if (target.closest('[data-sheet-close]')) { closeSheet(); return; }
  const pin = target.closest('[data-sheet-pin]');
  if (pin) { togglePin(pin.dataset.sheetPin); return; }
  if (target.closest('[data-sheet-all]')) { showAll = !showAll; renderSheet(false); document.querySelector('#mlos-area-sheet [data-sheet-all]')?.focus(); return; }
  if (target.closest('[data-sheet-search]')) {
    event.preventDefault(); closeSheet(false);
    shell()?.classList.add('mlos-search-open'); shell()?.querySelector('#mlos-global-search')?.focus(); return;
  }
  if (target.closest('[data-sheet-drawer]')) { closeSheet(false); drawerFromSheet = true; setTimeout(() => shell()?.querySelector('.mlos-mobile-menu')?.click(), 0); return; }
  if (target.closest('#mlos-area-sheet a[href]')) { closeSheet(false); return; }
  const dismiss = target.closest('[data-resume-dismiss]');
  if (dismiss) { write(DISMISSED_KEY, dismiss.dataset.resumeDismiss); shell()?.querySelector('.mlos-resume')?.remove(); return; }
  if (target.closest('[data-nav-expand]')) { expandBars(); shell()?.querySelector('.mlos-tabbar a[aria-current="page"]')?.focus(); }
});

// Capture phase: the shared shell treats Library links as in-page view switches, so the
// tab decision (open menu vs. navigate) must happen before its handler sees the click.
document.addEventListener('click', event => {
  const tab = event.target instanceof Element ? event.target.closest('.mlos-tabbar a[data-tab]') : null;
  if (!tab || !active()) return;
  const area = tab.dataset.tab;
  const stop = () => { event.preventDefault(); event.stopPropagation(); };
  if (held) { held = false; stop(); return; }
  if (sheetArea === area) { stop(); closeSheet(); return; }
  if (area === identity().master) { stop(); openSheet(area, tab); return; }
  closeSheet(false);
}, true);

document.addEventListener('pointerdown', event => {
  const tab = event.target instanceof Element ? event.target.closest('.mlos-tabbar a[data-tab]') : null;
  if (!tab || !active()) return;
  clearTimeout(holdTimer); held = false;
  holdTimer = setTimeout(() => { held = true; openSheet(tab.dataset.tab, tab); }, 450);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'scroll']) document.addEventListener(type, () => clearTimeout(holdTimer), { passive: true, capture: true });
document.addEventListener('contextmenu', event => { if (event.target instanceof Element && event.target.closest('.mlos-tabbar') && active()) event.preventDefault(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && sheetArea) { event.preventDefault(); closeSheet(); } });
document.addEventListener('focusin', event => { if (event.target instanceof Element && event.target.closest('#mlos-navigation')) expandBars(); });
document.addEventListener('input', event => { if (event.target instanceof Element && event.target.id === 'mlos-global-search') renderSuggestions(event.target); });
window.addEventListener('scroll', onScroll, { passive: true });
for (const type of ['touchmove', 'wheel']) window.addEventListener(type, () => { lastGesture = Date.now(); }, { passive: true });
window.addEventListener('hashchange', expandBars);
window.addEventListener('mlos:navigation-rendered', event => {
  learnerId = event.detail?.learnerId || ''; decorate();
  // A drawer opened from the area menu returns focus to the area chip (the hidden ≡ cannot take it).
  if (drawerFromSheet && document.body.dataset.drawer !== 'open') { drawerFromSheet = false; setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) shell()?.querySelector('[data-area-menu]')?.focus(); }, 0); }
});
window.addEventListener('mlos:preferences', event => { if (event.detail?.prefs) store.write(event.detail.prefs); if (sheetArea) renderSheet(false); });
window.addEventListener('popstate', () => { closeSheet(false); });
