import { navigationFor, routeIdentity, preferenceStore, canSwitchLibraryView, canonicalPagePath } from '/src/domain/app-navigation.js';
import { navigationMarkup, flyoutMarkup } from '/web/navigation-view.js';
import { mutatePreference } from '/web/navigation-preferences.js';
import { resolveAdminAccess } from '/web/navigation-access.js';
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
const store = preferenceStore();
let prefs = store.read(), identity = routeIdentity(location.pathname, location.search, location.hash), isAdmin = globalThis.mlosNavigationAdmin === true, opener = null;
let searchQuery = (new URLSearchParams(location.search).get('search') || '').slice(0, 300);
let accessRead = 0;
let lastAdminTarget = null, lastAdminHash = '';
function restoreAdminTarget(event) {
  if (!isAdmin || canonicalPagePath(location.pathname) !== '/web/admin.html') { lastAdminTarget = null; lastAdminHash = ''; return; }
  if (!location.hash && event?.detail?.explicit === true) {
    const main = document.getElementById('main');
    if (main?.closest('#admin-app')) main.scrollIntoView({ block: 'start' });
    lastAdminTarget = null; lastAdminHash = ''; return;
  }
  const allowed = location.hash && navigationFor('admin', { isAdmin }).flatMap(row => [row, ...row.children]).some(row => row.href === '/web/admin.html' + location.hash);
  if (!allowed) { lastAdminTarget = null; lastAdminHash = ''; return; }
  const target = document.getElementById(location.hash.slice(1));
  if (!target?.closest('#admin-app') || (target === lastAdminTarget && location.hash === lastAdminHash && event?.detail?.layoutChanged !== true && event?.detail?.explicit !== true)) return;
  target.scrollIntoView({ block: 'start' });
  lastAdminTarget = target; lastAdminHash = location.hash;
}
const shell = document.createElement('div');
shell.id = 'mlos-navigation';
document.body.prepend(shell);
document.body.classList.add('mlos-app');
function applyAppearance() {
  document.documentElement.dataset.appearance = prefs.theme;
  document.documentElement.dataset.palette = prefs.palette;
  document.body.dataset.rail = prefs.expanded ? 'expanded' : 'collapsed';
  document.body.dataset.navigationMemory = store.persistence;
}
function render(focusSelector, captureSearch = true) {
  const input = shell.querySelector('#mlos-global-search'), hadSearchFocus = document.activeElement === input;
  if (input && captureSearch) searchQuery = input.value;
  applyAppearance();
  shell.innerHTML = navigationMarkup({ ...identity, prefs, isAdmin, currentHref: location.pathname + location.search + location.hash });
  shell.querySelector('#mlos-global-search').value = searchQuery;
  opener = null;
  if (focusSelector) shell.querySelector(focusSelector)?.focus();
  else if (hadSearchFocus) shell.querySelector('#mlos-global-search').focus();
}
function save(action) { prefs = mutatePreference(store, action, next => { prefs = next; applyAppearance(); window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs: next } })); }); }
function closeFlyout(restoreFocus = false) {
  shell.querySelector('#mlos-flyout').hidden = true;
  shell.querySelectorAll('[data-flyout]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (restoreFocus) opener?.focus();
  opener = null;
}
function navigateAdminLink(anchor, event) {
  if (!anchor || !isAdmin || canonicalPagePath(location.pathname) !== '/web/admin.html' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || (event.button !== undefined && event.button !== 0)) return;
  const target = new URL(anchor.href, location.origin);
  const registered = !target.hash || navigationFor('admin', { isAdmin }).flatMap(row => [row, ...row.children]).some(row => row.href === '/web/admin.html' + target.hash);
  if (target.origin !== location.origin || canonicalPagePath(target.pathname) !== '/web/admin.html' || target.search !== location.search || !registered) return;
  event.preventDefault();
  if (location.hash !== target.hash) {
    history.pushState(null, '', location.pathname + location.search + target.hash);
    window.dispatchEvent(new CustomEvent('mlos:route', { detail: { explicit: true } }));
  } else restoreAdminTarget({ detail: { explicit: true } });
  closeFlyout();
}
shell.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) {
    const group = event.target.closest('summary')?.closest('details[data-group]');
    if (group) {
      // Persist synchronously: a route redraw can precede the native toggle event.
      event.preventDefault();
      group.open = !group.open;
      save({ type: 'group', id: group.dataset.group, open: group.open });
      return;
    }
    const anchor = event.target.closest('a');
    navigateAdminLink(anchor, event);
    if (anchor && canonicalPagePath(location.pathname) === '/web/library.html') {
      const target = new URL(anchor.href, location.origin);
      if (document.querySelector('#library-app [data-view]') && canSwitchLibraryView(location.pathname, location.search, target.pathname, target.search)) {
        event.preventDefault(); window.dispatchEvent(new CustomEvent('mlos:library-view', { detail: { view: target.searchParams.get('view') } })); closeFlyout();
      }
    }
    if (event.target.closest('a') && innerWidth < 700 && prefs.expanded) { save({ type: 'expanded', open: false }); render('[data-rail]'); }
    return;
  }
  if (button.hasAttribute('data-rail')) { save({ type: 'expanded', open: !prefs.expanded }); render('[data-rail]'); }
  if (button.hasAttribute('data-theme')) { save({ type: 'theme' }); render('[data-theme]'); }
  if (button.dataset.pin) {
    event.preventDefault();
    const flyoutKey = opener?.dataset.flyout;
    save({ type: 'pin', id: button.dataset.pin }); render();
    if (flyoutKey) shell.querySelector('[data-flyout="' + flyoutKey + '"]')?.click();
    else shell.querySelector('[data-pin="' + button.dataset.pin + '"]')?.focus();
  }
  if (button.hasAttribute('data-close-flyout')) closeFlyout(true);
  if (button.dataset.flyout) {
    if (opener === button) return closeFlyout(true);
    closeFlyout();
    const [master, id] = button.dataset.flyout.split(':');
    const row = navigationFor(master, { isAdmin }).find(r => r.id === id);
    if (!row) return;
    opener = button; button.setAttribute('aria-expanded', 'true');
    const flyout = shell.querySelector('#mlos-flyout');
    flyout.innerHTML = flyoutMarkup(row, master, prefs, location.pathname + location.search + location.hash); flyout.hidden = false;
    flyout.querySelector('a,button,summary')?.focus();
  }
});
shell.addEventListener('toggle', event => {
  if (event.target.dataset.group) save({ type: 'group', id: event.target.dataset.group, open: event.target.open });
}, true);
function dismissOutside(event) {
  // The shell may replace its children before this click reaches the document.
  if (event.composedPath?.().includes(shell) || event.target.closest('#mlos-navigation')) return;
  closeFlyout(); shell.classList.remove('mlos-search-open');
  if (innerWidth < 700 && prefs.expanded) { save({ type: 'expanded', open: false }); render(); }
}
document.addEventListener('pointerdown', dismissOutside);
document.addEventListener('click', event => { dismissOutside(event); navigateAdminLink(event.target.closest('a'), event); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeFlyout(true); shell.classList.remove('mlos-search-open'); if (innerWidth < 700 && prefs.expanded) { save({ type: 'expanded', open: false }); render('[data-rail]'); } }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); shell.classList.add('mlos-search-open'); shell.querySelector('#mlos-global-search').focus(); }
});
shell.querySelectorAll('form').forEach(form => form.addEventListener('submit', () => closeFlyout()));
shell.addEventListener('submit', event => {
  if (event.target.matches('.mlos-search') && innerWidth < 1050 && !shell.classList.contains('mlos-search-open')) {
    event.preventDefault(); shell.classList.add('mlos-search-open'); shell.querySelector('#mlos-global-search').focus();
  }
});
window.addEventListener('mlos:access', event => {
  accessRead += 1;
  const granted = event.detail?.isAdmin === true;
  if (granted !== isAdmin) { isAdmin = granted; render(); }
  restoreAdminTarget();
});
window.addEventListener('mlos:admin-ready', restoreAdminTarget);
function syncRoute(event) {
  identity = routeIdentity(location.pathname, location.search, location.hash);
  searchQuery = (new URLSearchParams(location.search).get('search') || '').slice(0, 300);
  closeFlyout(); render(undefined, false); restoreAdminTarget(event);
}
for (const event of ['mlos:route', 'popstate', 'hashchange']) window.addEventListener(event, syncRoute);
window.addEventListener('mlos:preferences', event => { const next = event.detail?.prefs ? store.write(event.detail.prefs) : store.read(); if (JSON.stringify(next) !== JSON.stringify(prefs)) { prefs = next; render(); } });
render();
restoreAdminTarget();
// Discover the header Admin destination for signed-in administrators on every page.
 // The role must come from the server; a stored pin or URL is never sufficient.
if (!isAdmin) {
  const auth = createSupabaseAuth(cloudConfig);
  if (auth.currentUser()) {
    const reading = ++accessRead, review = createCloudReview({ ...cloudConfig, auth });
    resolveAdminAccess(() => review.me()).then(granted => {
      if (reading === accessRead) { isAdmin = granted; render(); restoreAdminTarget(); }
    });
  }
}
