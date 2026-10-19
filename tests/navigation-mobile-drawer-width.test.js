import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../web/navigation.css', import.meta.url), 'utf8');

test('phone drawer uses the same compact width whether opened by rail or overlay', () => {
  const rule = 'width:min(clamp(216px,58vw,244px),calc(100dvw - 96px))';
  assert.equal(css.split(rule).length - 1, 2, 'both mobile drawer selectors must use the safe-width policy');
  assert.doesNotMatch(css, /width:min\(280px,calc\(100vw - 40px\)\)/, 'old oversized drawer cap must not return');
  assert.match(css, /\.mlos-app\[data-rail="expanded"\] \.mlos-panel\{[^}]*width:min\(clamp\(216px,58vw,244px\),calc\(100dvw - 96px\)\)/);
  assert.match(css, /\.mlos-app\[data-drawer="open"\] \.mlos-panel\{[^}]*width:min\(clamp\(216px,58vw,244px\),calc\(100dvw - 96px\)\)/);
});

test('compact drawer leaves a tappable outside region across common phone widths', () => {
  const drawerWidth = viewport => Math.min(Math.max(216, viewport * .58), 244, viewport - 96);
  for (const [viewport, maxWidth] of [[320, 216], [375, 218], [390, 227], [430, 244]]) {
    const drawer = drawerWidth(viewport);
    assert.ok(drawer <= maxWidth, `drawer exceeds target on ${viewport}px phone`);
    assert.ok(viewport - drawer >= 96, `no safe outside-dismissal region on ${viewport}px phone`);
    assert.ok(drawer <= viewport * .68, `drawer dominates ${viewport}px phone`);
  }
});

test('narrower drawer is materially different from the old production drawer', () => {
  const oldWidth = 280;
  const newWidth = Math.min(Math.max(216, 390 * .58), 244, 390 - 96);
  assert.ok(newWidth < oldWidth * .82, 'drawer should be at least 18% narrower than initial version');
  assert.doesNotMatch(css, /clamp\(240px,66vw,272px\)/);
});

test('narrow drawer preserves two-column navigation while hiding phone shortcut pin buttons', async () => {
  assert.match(css, /\.mlos-panel nav\[aria-label="Main navigation"\]\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(css, /\.mlos-panel \.mlos-nav-row>a\{overflow-wrap:break-word;line-height:1\.4\}/);
  assert.match(css, /\.mlos-panel \.mlos-pin\{display:none\}/);

  // Pin controls and saved preferences remain to preserve tablet/desktop pinning
  // and allow this temporary phone-only visual change to be reversed later.
  const { navigationMarkup } = await import('../web/navigation-view.js');
  const mobile = navigationMarkup({ phone: true, master: 'account', signedIn: true, prefs: { expanded: true, pins: ['study:practice'] } });
  const desktop = navigationMarkup({ phone: false, master: 'account', signedIn: true, prefs: { expanded: true, pins: ['study:practice'] } });
  assert.match(mobile, /data-pin="account:overview"/);
  assert.match(mobile, /aria-label="Pinned shortcuts"/);
  assert.match(desktop, /data-pin="account:overview"/);
  assert.match(desktop, /data-workspace-menu="account"/);
});
