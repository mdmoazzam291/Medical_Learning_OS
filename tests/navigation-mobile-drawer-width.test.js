import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../web/navigation.css', import.meta.url), 'utf8');

test('phone drawer uses the same compact width whether opened by rail or overlay', () => {
  const rule = 'width:min(clamp(240px,66vw,272px),calc(100dvw - 64px))';
  assert.equal(css.split(rule).length - 1, 2, 'both mobile drawer selectors must use the safe-width policy');
  assert.doesNotMatch(css, /width:min\(280px,calc\(100vw - 40px\)\)/, 'old oversized drawer cap must not return');
  assert.match(css, /\.mlos-app\[data-rail="expanded"\] \.mlos-panel\{[^}]*width:min\(clamp\(240px,66vw,272px\),calc\(100dvw - 64px\)\)/);
  assert.match(css, /\.mlos-app\[data-drawer="open"\] \.mlos-panel\{[^}]*width:min\(clamp\(240px,66vw,272px\),calc\(100dvw - 64px\)\)/);
});

test('compact drawer leaves a tappable outside region across common phone widths', () => {
  const drawerWidth = viewport => Math.min(Math.max(240, viewport * .66), 272, viewport - 64);
  for (const [viewport, maxWidth] of [[320, 240], [375, 248], [390, 258], [430, 272]]) {
    const drawer = drawerWidth(viewport);
    assert.ok(drawer <= maxWidth, `drawer exceeds target on ${viewport}px phone`);
    assert.ok(viewport - drawer >= 64, `no safe outside-dismissal region on ${viewport}px phone`);
  }
});

test('narrow drawer maintains readable destinations and accessible pin targets', () => {
  assert.match(css, /\.mlos-panel nav\[aria-label="Main navigation"\]\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(css, /\.mlos-panel \.mlos-nav-row>a\{overflow-wrap:break-word;line-height:1\.4\}/);
  assert.match(css, /\.mlos-panel \.mlos-pin\{min-height:44px;min-width:40px;display:grid;place-items:center/);
});
