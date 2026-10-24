import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as nav from '../src/domain/app-navigation.js';
import * as view from '../web/navigation-view.js';
const { navigationMarkup, flyoutMarkup, workspaceMenuMarkup, isPublicGuestNavigation } = view;
import { mutatePreference } from '../web/navigation-preferences.js';
const source = (await readFile(new URL('../web/navigation.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
function open({ ready = true, width = 620 } = {}) {
  const shellHandlers = {}, docHandlers = {}, windowHandlers = {}, classes = new Set(), targets = {};
  const input = { value: '', focus() {} }, flyout = { hidden: true };
  const menu = { hidden: true, innerHTML: '', style: {}, getBoundingClientRect: () => ({ width: 360, height: 300 }), querySelector: () => null };
  const triggers = new Map();
  const shell = { innerHTML: '', classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) }, addEventListener(type, fn) { shellHandlers[type] = fn; }, querySelector(key) { return key === '#mlos-flyout' ? flyout : key === '#mlos-workspace-menu' ? menu : input; }, querySelectorAll: () => [] };
  const body = { dataset: {}, prepend() {}, classList: { add() {} } };
  const context = vm.createContext({ ...nav, URL, URLSearchParams, CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }, navigationMarkup, flyoutMarkup, workspaceMenuMarkup, isPublicGuestNavigation, mutatePreference, preferenceStore: () => nav.preferenceStore(() => { throw Error('blocked'); }), createSupabaseAuth: () => ({ currentUser: () => ({ id: 'fixture-learner' }) }), cloudConfig: {}, createCloudReview: () => ({ me: async () => ({ isAdmin: false }) }), resolveAdminAccess: async () => false, innerWidth: width, innerHeight: 1000, location: { pathname: '/web/library.html', search: '?view=notes', hash: '' }, document: { body, activeElement: null, documentElement: { dataset: {} }, createElement: () => shell, querySelector: () => ready ? {} : null, addEventListener(type, fn) { docHandlers[type] = fn; } }, window: { addEventListener(type, fn) { windowHandlers[type] = fn; }, dispatchEvent(event) { windowHandlers[event.type]?.(event); } } });
  vm.runInContext(source, context);
  context.document.getElementById = id => targets[id] || null;
  return { body, shell, menu, triggers, classes, shellHandlers, docHandlers, input, targets, context, location: context.location, windowHandlers, outside() { docHandlers.click({ target: { closest: () => null } }); } };
}
test('a narrow expanded panel can be dismissed by tapping outside it', () => {
  const h = open(); const button = { dataset: {}, hasAttribute: name => name === 'data-rail' };
  h.shellHandlers.click({ target: { closest: () => button } });
  assert.equal(h.body.dataset.rail, 'expanded'); h.outside(); assert.equal(h.body.dataset.rail, 'collapsed');
});
test('phone to tablet resizing relocates masters and closes the temporary drawer', () => {
  const h = open({ width: 390 });
  assert.match(h.shell.innerHTML.split('</header>')[0], /mlos-mobile-menu/);
  assert.match(h.shell.innerHTML, /<aside[^>]* hidden/);
  h.shellHandlers.click({ target: { closest: () => ({ dataset: {}, hasAttribute: name => name === 'data-rail' }) } });
  assert.equal(h.body.dataset.drawer, 'open');
  h.context.innerWidth = 820; h.windowHandlers.resize();
  assert.equal(h.body.dataset.drawer, 'closed');
  assert.doesNotMatch(h.shell.innerHTML.split('</header>')[0], /mlos-mobile-menu/);
  assert.match(h.shell.innerHTML.split('</header>')[0], /data-workspace-menu="library"/);
});
test('a compact search overlay closes on an outside tap without submitting a search', () => {
  const h = open(); let prevented = false;
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(h.classes.has('mlos-search-open'), true);
  h.outside(); assert.equal(h.classes.has('mlos-search-open'), false);
});

test('route restoration refreshes search while appearance changes keep an unsent draft', () => {
  const h = open(); h.input.value = 'Unsent draft';
  const button = { dataset: {}, hasAttribute: name => name === 'data-theme' };
  h.shellHandlers.click({ target: { closest: () => button } });
  assert.equal(h.input.value, 'Unsent draft');
  h.location.search = '?view=questions&search=Restored'; h.windowHandlers.popstate();
  assert.equal(h.input.value, 'Restored');
  h.location.pathname = '/web/account.html'; h.location.hash = '#research'; h.windowHandlers.hashchange();
  assert.equal(h.input.value, 'Restored');
});

test('a shell action remains inside navigation after its original target is detached during bubbling', () => {
  const h = open(), button = { dataset: {}, hasAttribute: name => name === 'data-rail' };
  const target = { closest: selector => selector === 'button' ? button : null };
  const event = { target, composedPath: () => [target, h.shell] };
  h.shellHandlers.click(event);
  assert.equal(h.body.dataset.rail, 'expanded');
  h.docHandlers.click(event);
  assert.equal(h.body.dataset.rail, 'expanded');
});

test('outside touch dismisses compact search on pointerdown without depending on a compatibility click', () => {
  const h = open();
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() {} });
  assert.equal(h.classes.has('mlos-search-open'), true);
  h.docHandlers.pointerdown?.({ target: { closest: () => null }, pointerType: 'touch', composedPath: () => [] });
  assert.equal(h.classes.has('mlos-search-open'), false);
});

test('the hosted clean Library path intercepts a shared representation menu action', () => {
  const h = open(); h.location.pathname = '/web/library';
  let prevented = false, selectedView = null;
  h.windowHandlers['mlos:library-view'] = event => { selectedView = event.detail.view; };
  const anchor = { href: 'https://example.invalid/web/library.html?view=graph' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(selectedView, 'graph');
});

test('an unavailable Library keeps normal link navigation instead of swallowing a view action', () => {
  const h = open({ ready: false }); h.location.pathname = '/web/library';
  let prevented = false, dispatched = false;
  h.windowHandlers['mlos:library-view'] = () => { dispatched = true; };
  const anchor = { href: 'https://example.invalid/web/library.html?view=graph' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(dispatched, false);
});
test('Admin sidebar fragments restore asynchronous destinations once per target and layout change', () => {
  const h = open(); let scrolls = 0;
  h.location.pathname = '/web/admin'; h.location.hash = '#owner-infrastructure';
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } }); h.windowHandlers.hashchange();
  h.targets['owner-infrastructure'] = { closest: () => ({}), scrollIntoView: () => { scrolls++; } };
  h.windowHandlers['mlos:admin-ready']?.(); h.windowHandlers['mlos:admin-ready']?.();
  assert.equal(scrolls, 1);
  h.windowHandlers['mlos:admin-ready']({ detail: { layoutChanged: true } });
  assert.equal(scrolls, 2);
  h.targets['owner-infrastructure'] = { closest: () => ({}), scrollIntoView: () => { scrolls++; } };
  h.windowHandlers['mlos:admin-ready'](); assert.equal(scrolls, 3);
  h.windowHandlers['mlos:access']({ detail: { isAdmin: false } });
  h.windowHandlers['mlos:admin-ready'](); assert.equal(scrolls, 3);
});
test('Admin scroll restoration ignores arbitrary fragments outside the sidebar catalog', () => {
  const h = open(); let scrolls = 0;
  h.location.pathname = '/web/admin'; h.location.hash = '#owner-learner-query';
  h.targets['owner-learner-query'] = { closest: () => ({}), scrollIntoView: () => { scrolls++; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  h.windowHandlers['mlos:admin-ready']?.(); assert.equal(scrolls, 0);
});
test('hosted Admin sidebar anchors update history in place without reloading owner drafts', () => {
  const h = open(); let prevented = false, entries = 0;
  h.location.pathname = '/web/admin'; h.location.search = ''; h.location.hash = '#owner-users'; h.location.origin = 'https://example.invalid';
  h.context.history = { pushState(_state, _title, href) { entries++; const url = new URL(href, h.location.origin); h.location.pathname = url.pathname; h.location.search = url.search; h.location.hash = url.hash; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  const anchor = { href: 'https://example.invalid/web/admin.html#owner-features' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(entries, 1);
  assert.equal(h.location.pathname, '/web/admin');
  assert.equal(h.location.hash, '#owner-features');
  assert.match(h.shell.innerHTML, /data-flyout="admin:operations" data-active="true"/);
});
test('modified Admin links and unknown fragments retain native navigation', () => {
  const h = open(); h.location.pathname = '/web/admin'; h.location.search = ''; h.location.origin = 'https://example.invalid';
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  for (const [href, ctrlKey] of [['https://example.invalid/web/admin.html#owner-features', true], ['https://example.invalid/web/admin.html#owner-learner-query', false]]) {
    let prevented = false; const anchor = { href };
    h.shellHandlers.click({ ctrlKey, target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
  }
});
test('explicit Admin clicks restore the current section or Overview after manual scrolling', () => {
  const h = open(); let sectionScrolls = 0, rootScrolls = 0;
  h.location.pathname = '/web/admin'; h.location.search = ''; h.location.hash = '#owner-features'; h.location.origin = 'https://example.invalid';
  h.context.history = { pushState(_state, _title, href) { h.location.hash = new URL(href, h.location.origin).hash; } };
  h.targets['owner-features'] = { closest: () => ({}), scrollIntoView: () => { sectionScrolls++; } };
  h.targets.main = { closest: () => ({}), scrollIntoView: () => { rootScrolls++; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  const click = href => h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? { href } : null }, preventDefault() {} });
  click('https://example.invalid/web/admin.html#owner-features');
  assert.equal(sectionScrolls, 2);
  click('https://example.invalid/web/admin.html');
  assert.equal(rootScrolls, 1);
});
test('Admin Overview body shortcuts preserve the workspace with in-place history', () => {
  const h = open(); let prevented = false;
  h.location.pathname = '/web/admin'; h.location.search = ''; h.location.origin = 'https://example.invalid';
  h.context.history = { pushState(_state, _title, href) { h.location.hash = new URL(href, h.location.origin).hash; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  const anchor = { href: 'https://example.invalid/web/admin.html#owner-content' };
  h.docHandlers.click({ target: { closest: key => key === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(h.location.hash, '#owner-content');
});
test('an unchanged Admin access update does not rebuild open navigation controls', () => {
  const h = open(); let renders = 0, html = h.shell.innerHTML;
  Object.defineProperty(h.shell, 'innerHTML', { get: () => html, set: value => { html = value; renders++; } });
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  assert.equal(renders, 1);
  h.windowHandlers['mlos:access']({ detail: { isAdmin: false } });
  assert.equal(renders, 2);
});
test('opening a navigation group persists before a subsequent route redraw', () => {
  const h = open({ width: 1200 }); h.location.pathname = '/web/admin'; h.location.search = '';
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  const group = { dataset: { group: 'admin:overview' }, open: false };
  const summary = { closest: () => group };
  h.shellHandlers.click({ target: { closest: key => key === 'summary' ? summary : null }, preventDefault() {} });
  h.windowHandlers.hashchange();
  assert.match(h.shell.innerHTML, /data-group="admin:overview" open/);
});


test('tablet windows use top tools rather than reserving sidebar width', () => {
  for (const width of [820, 1024, 1180]) {
    const h = open({ width });
    assert.equal(h.body.dataset.rail, 'collapsed');
    assert.equal(h.body.dataset.navigationLayout, 'top');
    assert.doesNotMatch(h.shell.innerHTML, /<aside/);
  }
});
test('rotation keeps legacy expanded preference without reopening a desktop rail', () => {
  const h = open({ width: 820 });
  h.context.innerWidth = 1180; h.windowHandlers.resize();
  assert.equal(h.body.dataset.rail, 'collapsed');
  h.context.innerWidth = 390; h.windowHandlers.resize();
  assert.equal(h.body.dataset.rail, 'collapsed');
  h.context.innerWidth = 820; h.windowHandlers.resize();
  assert.equal(h.body.dataset.navigationLayout, 'top');
});

test('search opens at the exact compact CSS breakpoint instead of submitting a hidden field', () => {
  const h = open({ width: 1050 }); let prevented = false;
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.classes.has('mlos-search-open'), true);
});

test('top workspace menus switch without navigation and close on outside or Escape', () => {
  const h = open({ width: 1440 });
  const trigger = master => ({ dataset: { workspaceMenu: master }, hasAttribute: () => false, setAttribute() {}, focus() {}, getBoundingClientRect: () => ({ left: 450, right: 520, bottom: 56 }) });
  const click = button => h.shellHandlers.click({ target: { closest: () => button } });
  click(trigger('library'));
  assert.equal(h.menu.hidden, false);
  assert.match(h.menu.innerHTML, /Concept Notes/);
  assert.equal(h.location.pathname, '/web/library.html');
  click(trigger('study'));
  assert.match(h.menu.innerHTML, /Mistake Review/);
  assert.doesNotMatch(h.menu.innerHTML, /Reference Tools/);
  h.outside(); assert.equal(h.menu.hidden, true);
  click(trigger('library'));
  h.docHandlers.keydown({ key: 'Escape' });
  assert.equal(h.menu.hidden, true);
});
test('resize and role revocation dismiss top menus while nested preferences survive', () => {
  const h = open({ width: 1440 });
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  const button = { dataset: { workspaceMenu: 'admin' }, hasAttribute: () => false, setAttribute() {}, focus() {}, getBoundingClientRect: () => ({ left: 900, bottom: 56 }) };
  h.shellHandlers.click({ target: { closest: () => button } });
  assert.match(h.menu.innerHTML, /Content Intake/);
  h.windowHandlers['mlos:access']({ detail: { isAdmin: false } });
  assert.equal(h.menu.hidden, true);
  assert.doesNotMatch(h.shell.innerHTML, /data-workspace-menu="admin"/);
  const library = { ...button, dataset: { workspaceMenu: 'library' } };
  h.shellHandlers.click({ target: { closest: () => library } });
  h.context.innerWidth = 1180; h.windowHandlers.resize();
  assert.equal(h.menu.hidden, true);
});

test('a surface edit preserves draft search and sets appearance without touching page content', () => {
  const h = open({ width: 1440 }); h.input.value = 'Private unsent search';
  let pageTouched = false;
  h.context.document.querySelector = () => { pageTouched = true; return {}; };
  h.windowHandlers['mlos:preferences']({ detail: { prefs: { version: 1, palette: 'lavender_precision', theme: 'dark', surfaceStyle: 'glass', groups: ['library:subjects'], pins: ['account:data'] } } });
  assert.equal(h.context.document.documentElement.dataset.surfaceStyle, 'glass');
  assert.equal(h.context.document.documentElement.dataset.palette, 'lavender_precision');
  assert.equal(h.input.value, 'Private unsent search');
  assert.equal(pageTouched, false);
});

test('desktop icon search opens its field instead of submitting an invisible input', () => {
  const h = open({ width: 1440 }); let prevented = false;
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.classes.has('mlos-search-open'), true);
});

test('switching tablet workspace tools returns focus to its visible top disclosure', () => {
  const h = open({ width: 820 }); let focused = false, selectedExpanded = false;
  const launcher = { focus() { focused = true; }, getBoundingClientRect: () => ({ left: 300, bottom: 56 }) };
  const originalQuery = h.shell.querySelector;
  h.shell.querySelector = key => key === '.mlos-header [data-workspace-menu="study"]' ? launcher : originalQuery(key);
  const selected = { setAttribute(key, value) { if (key === 'aria-expanded') selectedExpanded = value === 'true'; } };
  h.menu.querySelector = key => key === '[data-workspace-menu="study"]' ? selected : null;
  // An inner-menu trigger is replaced when the selected workspace's markup changes.
  const trigger = { dataset: { workspaceMenu: 'study' }, closest: key => key === '#mlos-workspace-menu' ? h.menu : null, setAttribute() {}, focus() {}, getBoundingClientRect: () => ({ left: 0, bottom: 0 }) };
  h.shellHandlers.click({ target: { closest: () => trigger } });
  assert.equal(h.menu.style.left, '300px');
  assert.equal(selectedExpanded, true);
  h.docHandlers.keydown({ key: 'Escape' });
  assert.equal(focused, true);
});

test('Escape and resize do not refocus a previously dismissed workspace menu', () => {
  const h = open({ width: 1440 }); let focuses = 0;
  const trigger = { dataset: { workspaceMenu: 'library' }, setAttribute() {}, focus() { focuses++; }, getBoundingClientRect: () => ({ left: 450, bottom: 56 }) };
  h.shellHandlers.click({ target: { closest: () => trigger } });
  h.docHandlers.keydown({ key: 'Escape' });
  assert.equal(focuses, 1);
  h.docHandlers.keydown({ key: 'Escape' }); h.windowHandlers.resize();
  assert.equal(focuses, 1);
});

test('tablet rotation returns focus to the same visible workspace disclosure', () => {
  const h = open({ width: 1180 }); let focused = false;
  const launcher = { focus() { focused = true; } };
  const originalQuery = h.shell.querySelector;
  h.shell.querySelector = key => key === '[data-workspace-menu="library"]' ? launcher : originalQuery(key);
  const trigger = { dataset: { workspaceMenu: 'library' }, setAttribute() {}, focus() {}, getBoundingClientRect: () => ({ left: 450, bottom: 56 }) };
  h.shellHandlers.click({ target: { closest: () => trigger } });
  h.context.innerWidth = 820; h.windowHandlers.resize();
  assert.equal(h.menu.hidden, true);
  assert.equal(focused, true);
});

// The portrait tablet must expose the same workspaces as landscape, not a launcher.
test('tablet portrait and landscape retain all top workspace links', () => {
  for (const width of [701, 744, 768, 820, 999, 1180]) {
    const h = open({ width });
    h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
    const header = h.shell.innerHTML.split('</header>')[0];
    for (const master of ['home', 'study', 'library', 'exams']) {
      assert.ok(header.includes('data-master="' + master + '"'), width + ': visible ' + master + ' workspace');
      assert.ok(header.includes('data-workspace-menu="' + master + '"'), width + ': ' + master + ' disclosure');
    }
  }
});

test('rotating an open Admin phone drawer restores focus to its new local trigger', () => {
  const h = open({ width: 390 }); let focused = 0;
  h.location.pathname = '/web/admin'; h.location.search = '';
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  h.windowHandlers.hashchange();
  h.input.focus = () => { focused++; };
  h.shellHandlers.click({ target: { closest: () => ({ dataset: {}, hasAttribute: name => name === 'data-rail' }) } });
  assert.equal(h.body.dataset.drawer, 'open');
  focused = 0;
  h.context.innerWidth = 820; h.windowHandlers.resize();
  assert.equal(h.body.dataset.drawer, 'closed');
  assert.match(h.shell.innerHTML, /data-workspace-menu="admin"/);
  assert.equal(focused, 1);
});
test('clean intake relationship navigation preserves the document and browser history', () => {
  const h = open(); let prevented = false, entries = 0;
  h.location.pathname = '/web/content-import'; h.location.search = ''; h.location.hash = ''; h.location.origin = 'https://example.invalid';
  h.context.history = { pushState(_state, _title, href) { entries++; const url = new URL(href, h.location.origin); h.location.pathname = url.pathname; h.location.search = url.search; h.location.hash = url.hash; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } }); h.windowHandlers.hashchange();
  const anchor = { href: 'https://example.invalid/web/content-import.html#medical-relationships' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(entries, 1);
  assert.equal(h.location.pathname, '/web/content-import');
  assert.equal(h.location.hash, '#medical-relationships');
  prevented = false;
  h.shellHandlers.click({ ctrlKey: true, target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'Modified clicks retain normal browser behavior');
  assert.equal(entries, 1);
});
