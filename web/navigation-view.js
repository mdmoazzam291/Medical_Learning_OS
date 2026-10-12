import { PRODUCT_BRAND, BRAND_GLYPH } from './brand.js';
import { MASTERS, navigationFor, pinnedSections, validatePreferences, navigationHrefMatches } from '../src/domain/app-navigation.js';
export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-8h6v8"/>',
  book: '<path d="M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
  reference: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  exam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  subjects: '<path d="m2 8 10-5 10 5-10 5ZM6 10v7c4 3 8 3 12 0v-7M22 8v9"/>',
  graph: '<circle cx="5" cy="6" r="3"/><circle cx="19" cy="6" r="3"/><circle cx="12" cy="19" r="3"/><path d="M8 6h8M6 9l4 7M18 9l-4 7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  atlas: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  compare: '<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>',
  path: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v9a3 3 0 0 0 3 3h9M10 5h7a2 2 0 0 1 2 2v5"/>',
  edit: '<path d="m15 3 6 6-12 12H3v-6ZM12 6l6 6"/>',
  pin: '<path d="m8 3 8 0-1 6 4 5H5l4-5ZM12 14v8"/>',
  play: '<path d="m7 3 14 9-14 9Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  repair: '<path d="m14 4 6 6M3 21l8-8M14 3a6 6 0 0 0-3 10l3 3a6 6 0 0 0 7-7l-4 4-6-6Z"/>',
  cases: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M12 10v7M8.5 13.5h7"/>',
  skills: '<path d="M6 3v6a6 6 0 0 0 12 0V3M4 3h4M16 3h4M12 15v3a3 3 0 0 0 6 0"/><circle cx="18" cy="15" r="2"/>',
  questions: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 5 3l-2 2v1M12 17v.1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M5 7h1M5 11h1"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>'
};
export const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="mlos-icon" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.book) + '</svg>';
const pin = (key, label, prefs) => '<button type="button" class="mlos-pin" data-pin="' + escapeText(key) + '" aria-label="' + (prefs.pins.includes(key) ? 'Unpin ' : 'Pin ') + escapeText(label) + '" aria-pressed="' + prefs.pins.includes(key) + '">' + icon('pin') + '</button>';
// A group and its first child can intentionally have the same destination.
// Render that URL once, and attach the group's pin to the child row instead.
export function childrenMarkup(rows, prefix, prefs, currentHref = '', pinOnChild = null) {
  const current = row => navigationHrefMatches(row.href, currentHref) ? ' aria-current="page"' : '';
  return rows.map(row => {
    if (row.children.length) {
      return '<details data-group="' + escapeText(prefix + ':' + row.id) + '"' +
        (prefs.groups.includes(prefix + ':' + row.id) ? ' open' : '') +
        '><summary>' + escapeText(row.label) + '</summary><div class="mlos-children"><a href="' +
        escapeText(row.href) + '"' + current(row) + '>Overview</a>' +
        childrenMarkup(row.children, prefix + ':' + row.id, prefs, currentHref) +
        '</div></details>';
    }
    const link = '<a href="' + escapeText(row.href) + '"' + current(row) + '>' + escapeText(row.label) + '</a>';
    return pinOnChild?.id === row.id
      ? '<div class="mlos-nav-row mlos-child-pin-row">' + link +
        pin(pinOnChild.key, pinOnChild.label, prefs) + '</div>'
      : link;
  }).join('');
}
function sectionMarkup(row, master, section, prefs, currentHref) {
  const key = master + ':' + row.id;
  // A group landing link is current only for its exact URL. Standalone
  // section links may use a fragment inside their landing page (e.g. Study
  // Practice) and must retain the active state of their owning section.
  const active = row.id === section;
  const current = navigationHrefMatches(row.href, currentHref) ||
    (!row.children.length && active) ? ' aria-current="page"' : '';
  if (!prefs.expanded) return row.children.length
    ? '<button class="mlos-rail-item" data-flyout="' + key + '" data-active="' + active + '" aria-label="' + escapeText(row.label) + '" aria-expanded="false" aria-controls="mlos-flyout" title="' + escapeText(row.label) + '">' + icon(row.icon) + '</button>'
    : '<a class="mlos-rail-item" href="' + escapeText(row.href) + '" aria-label="' + escapeText(row.label) + '" title="' + escapeText(row.label) + '"' + current + '>' + icon(row.icon) + '</a>';
  const label = icon(row.icon) + '<span>' + escapeText(row.label) + '</span>';
  const redundantChild = master === 'admin' ? row.children.find(child => child.href === row.href && !child.children.length) : null;
  const openRow = redundantChild ? '' : '<div class="mlos-nav-row"><a href="' + escapeText(row.href) + '"' + current + '>Open ' + escapeText(row.label) + '</a>' + pin(key, row.label, prefs) + '</div>';
  return row.children.length
    ? '<details data-group="' + key + '"' + (prefs.groups.includes(key) ? ' open' : '') +
      ' data-active="' + active + '"><summary>' + label + '</summary><div class="mlos-children">' +
      openRow + childrenMarkup(row.children, key, prefs, currentHref,
        redundantChild ? { id: redundantChild.id, key, label: row.label } : null) + '</div></details>'
    : '<div class="mlos-nav-row"><a href="' + escapeText(row.href) + '"' + current + '>' + label + '</a>' + pin(key, row.label, prefs) + '</div>';
}
export function flyoutMarkup(row, master, prefs, currentHref = '') {
  const redundantChild = master === 'admin' && row.children.some(child => child.href === row.href);
  const heading = redundantChild
    ? '<strong class="mlos-flyout-title">' + escapeText(row.label) + '</strong>'
    : '<a href="' + escapeText(row.href) + '">' + escapeText(row.label) + '</a>';
  return '<div class="mlos-flyout-heading">' + heading +
    pin(master + ':' + row.id, row.label, prefs) +
    '<button data-close-flyout aria-label="Close submenu">' + icon('close') +
    '</button></div><div class="mlos-children">' +
    childrenMarkup(row.children, master + ':' + row.id, prefs, currentHref) + '</div>';
}
export function navigationMarkup({ master = 'home', section = 'today', prefs: input, isAdmin = false, currentHref = '' } = {}) {
  const prefs = validatePreferences({ ...input, version: 1 }), rows = navigationFor(master, { isAdmin });
  const pinned = pinnedSections(prefs, isAdmin).filter(row => !(master === 'admin' && row.master === 'admin'));
  return '<header class="mlos-header"><a class="mlos-brand" href="/" aria-label="PARSE Home"><span class="mlos-brand-mark" aria-hidden="true">' + BRAND_GLYPH + '</span><span class="mlos-brand-lockup"><strong class="mlos-brand-full">' + PRODUCT_BRAND.name + '</strong><span class="mlos-brand-subtitle">' + PRODUCT_BRAND.descriptor + '</span></span></a><nav aria-label="Main navigation">' + MASTERS.filter(m => !m.adminOnly || isAdmin).map(m => '<a href="' + escapeText(m.href) + '" data-master="' + m.id + '" aria-label="' + m.label + '"' + (master === m.id ? ' aria-current="page"' : '') + '>' + icon(m.icon) + '<span>' + m.label + '</span></a>').join('') + '</nav><form class="mlos-search" action="/web/library.html" role="search"><input type="hidden" name="view" value="questions"><label class="mlos-sr-only" for="mlos-global-search">Search all published content</label><input id="mlos-global-search" type="search" name="search" placeholder="Search concepts, questions…" maxlength="300"><button type="submit" aria-label="Search all published content">' + icon('search') + '</button></form><button type="button" class="mlos-theme" data-theme aria-label="Switch to ' + (prefs.theme === 'light' ? 'dark' : 'light') + ' appearance" aria-pressed="' + (prefs.theme === 'dark') + '">' + icon(prefs.theme === 'light' ? 'moon' : 'sun') + '</button></header><aside class="mlos-panel" id="mlos-panel"><div class="mlos-panel-toolbar"><button data-rail aria-label="' + (prefs.expanded ? 'Collapse' : 'Expand') + ' navigation" aria-expanded="' + prefs.expanded + '" aria-controls="mlos-local-nav">' + icon('panel') + '</button><span>' + escapeText(MASTERS.find(m => m.id === master)?.label || 'Home') + '</span></div>' + (pinned.length ? '<nav aria-label="Pinned shortcuts"><span class="mlos-caption">Pinned</span>' + pinned.map(row => sectionMarkup(row, row.master, row.master === master ? section : '', prefs, currentHref)).join('') + '</nav>' : '') + '<nav id="mlos-local-nav" aria-label="Section navigation">' + rows.map(row => sectionMarkup(row, master, section, prefs, currentHref)).join('') + '</nav></aside><div id="mlos-flyout" class="mlos-flyout" role="dialog" aria-label="Navigation submenu" hidden></div>';
}
