import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { navigationMarkup } from '../web/navigation-view.js';

test('signed-in phone navigation adds a four-area bottom tab bar with the current area marked', () => {
  const html = navigationMarkup({ signedIn: true, phone: true, master: 'library', section: 'notes', currentHref: '/web/library.html?view=notes' });
  const bar = html.match(/<nav class="mlos-tabbar" aria-label="Main areas">([\s\S]*?)<\/nav>/);
  assert.ok(bar, 'tab bar present');
  assert.deepEqual([...bar[1].matchAll(/data-tab="([a-z]+)"/g)].map(m => m[1]), ['home', 'study', 'library', 'exams']);
  assert.match(bar[1], /data-tab="library" aria-current="page"/);
  assert.equal((bar[1].match(/aria-current/g) || []).length, 1);
});

test('tab bar is phone-only, absent for guests and for the admin workspace', () => {
  assert.doesNotMatch(navigationMarkup({ signedIn: true, phone: false, master: 'home', currentHref: '/' }), /mlos-tabbar/);
  assert.doesNotMatch(navigationMarkup({ signedIn: false, phone: true, master: 'account', currentHref: '/web/account.html' }), /mlos-tabbar/);
  assert.doesNotMatch(navigationMarkup({ signedIn: true, phone: true, isAdmin: true, master: 'admin', section: 'overview', currentHref: '/web/admin.html' }), /mlos-tabbar/);
});

test('tab bar hides during a locked exam section and while the menu drawer or filter sheet is open', async () => {
  const css = await readFile(new URL('../web/navigation.css', import.meta.url), 'utf8');
  assert.match(css, /body:has\(main\.exam-active\) \.mlos-tabbar\{display:none\}/);
  assert.match(css, /body:has\(\.mlos-mobile-menu\[aria-expanded=true\]\) \.mlos-tabbar\{display:none\}/);
  const ui = await readFile(new URL('../web/ui-foundation.css', import.meta.url), 'utf8');
  assert.match(ui, /body:has\(details\.cw-filter-disclosure\[open\]\) \.mlos-tabbar\{display:none\}/);
});
