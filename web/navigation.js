import { navigationFor, routeIdentity, preferenceStore, changePreference } from '/src/domain/app-navigation.js';
import { navigationMarkup, flyoutMarkup } from '/web/navigation-view.js';
const store = preferenceStore();
let prefs = store.read(), identity = routeIdentity(location.pathname, location.search), isAdmin = globalThis.mlosNavigationAdmin === true, opener = null;
let searchQuery = (new URLSearchParams(location.search).get('search') || '').slice(0, 300);
const shell = document.createElement('div');
shell.id = 'mlos-navigation';
document.body.prepend(shell);
document.body.classList.add('mlos-app');
function applyAppearance() {
  document.documentElement.dataset.appearance = prefs.theme;
  document.body.dataset.rail = prefs.expanded ? 'expanded' : 'collapsed';
  document.body.dataset.navigationMemory = store.persistence;
}
function render(focusSelector) {
  const input = shell.querySelector('#mlos-global-search'), hadSearchFocus = document.activeElement === input;
  if (input) searchQuery = input.value;
  applyAppearance();
  shell.innerHTML = navigationMarkup({ ...identity, prefs, isAdmin });
  shell.querySelector('#mlos-global-search').value = searchQuery;
  opener = null;
  if (focusSelector) shell.querySelector(focusSelector)?.focus();
  else if (hadSearchFocus) shell.querySelector('#mlos-global-search').focus();
}
function save(action) { prefs = store.write(changePreference(prefs, action)); applyAppearance(); }
function closeFlyout(restoreFocus = false) {
  shell.querySelector('#mlos-flyout').hidden = true;
  shell.querySelectorAll('[data-flyout]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (restoreFocus) opener?.focus();
  opener = null;
}
shell.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) {
    const anchor = event.target.closest('a');
    if (anchor && location.pathname === '/web/library.html') {
      const target = new URL(anchor.href, location.origin);
      if (target.pathname === location.pathname && ['notes', 'questions', 'graph'].includes(target.searchParams.get('view'))) {
        event.preventDefault(); window.dispatchEvent(new CustomEvent('mlos:library-view', { detail: { view: target.searchParams.get('view') } })); closeFlyout();
      }
    }
    if (event.target.closest('a') && innerWidth < 700 && prefs.expanded) { save({ type: 'expanded', open: false }); render('[data-rail]'); }
    return;
  }
  if (button.hasAttribute('data-rail')) { save({ type: 'expanded', open: !prefs.expanded }); render('[data-rail]'); }
  if (button.hasAttribute('data-theme')) { save({ type: 'theme' }); render('[data-theme]'); window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs } })); }
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
    flyout.innerHTML = flyoutMarkup(row, master, prefs); flyout.hidden = false;
    flyout.querySelector('a,button,summary')?.focus();
  }
});
shell.addEventListener('toggle', event => {
  if (event.target.dataset.group) save({ type: 'group', id: event.target.dataset.group, open: event.target.open });
}, true);
document.addEventListener('click', event => { if (!event.target.closest('#mlos-navigation')) closeFlyout(); });
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
window.addEventListener('mlos:access', event => { isAdmin = event.detail?.isAdmin === true; render(); });
window.addEventListener('mlos:route', () => { identity = routeIdentity(location.pathname, location.search); closeFlyout(); render(); });
window.addEventListener('mlos:preferences', event => { const next = event.detail?.prefs ? store.write(event.detail.prefs) : store.read(); if (JSON.stringify(next) !== JSON.stringify(prefs)) { prefs = next; render(); } });
render();
