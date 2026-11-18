import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../web/appearance-boot.js', import.meta.url), 'utf8');

function boot(stored, { throws = false } = {}) {
  const dataset = {};
  const localStorage = { getItem: key => { if (throws) throw new Error('blocked'); return key === 'mlos-navigation-v1' ? stored : null; } };
  vm.runInNewContext(source, { document: { documentElement: { dataset } }, localStorage, JSON });
  return dataset;
}

test('saved palette, theme and surface style apply before first paint', () => {
  assert.deepEqual(boot(JSON.stringify({ palette: 'lavender_precision', theme: 'dark', surfaceStyle: 'glass' })),
    { appearance: 'dark', palette: 'lavender_precision', surfaceStyle: 'glass' });
});

test('missing, invalid or blocked storage falls back to the default appearance', () => {
  const defaults = { appearance: 'light', palette: 'sage_precision', surfaceStyle: 'standard' };
  assert.deepEqual(boot(null), defaults);
  assert.deepEqual(boot('not json'), defaults);
  assert.deepEqual(boot('null'), defaults);
  assert.deepEqual(boot(JSON.stringify({ palette: 'neon', theme: 'blue', surfaceStyle: 'x' })), defaults);
  assert.deepEqual(boot(null, { throws: true }), defaults);
});

test('every page with shared navigation loads the boot script in <head> before stylesheets', async () => {
  const dir = new URL('../web/', import.meta.url);
  const pages = (await readdir(dir)).filter(name => name.endsWith('.html'));
  let checked = 0;
  for (const name of pages) {
    const html = await readFile(new URL(name, dir), 'utf8');
    if (!html.includes('/web/navigation.js')) continue;
    checked += 1;
    const head = html.slice(0, html.indexOf('</head>'));
    const bootAt = head.indexOf('<script src="/web/appearance-boot.js"></script>');
    assert.ok(bootAt > -1, `${name} must load appearance-boot.js in <head>`);
    const firstStylesheet = head.indexOf('rel="stylesheet"');
    assert.ok(firstStylesheet === -1 || bootAt < firstStylesheet, `${name} must apply appearance before stylesheets`);
  }
  assert.ok(checked >= 20, `expected the navigation pages to be checked, saw ${checked}`);
});
