import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cloudConfig } from '../web/cloud-config.js';

test('API preconnect targets the configured API origin', () => {
  const script = readFileSync('web/api-preconnect.js', 'utf8');
  assert.match(script, new RegExp(`link\\.href = '${new URL(cloudConfig.projectUrl).origin.replace(/\./g, '\\.')}';`));
});

test('every page that boots appearance loads the API preconnect once, right after it', () => {
  const pages = readdirSync('web').filter(name => name.endsWith('.html'))
    .map(name => [name, readFileSync(`web/${name}`, 'utf8')])
    .filter(([, html]) => html.includes('/web/appearance-boot.js'));
  assert.ok(pages.length > 0);
  const pair = '<script src="/web/appearance-boot.js"></script><script src="/web/api-preconnect.js"></script>';
  for (const [name, html] of pages) {
    assert.equal(html.split(pair).length - 1, 1, name);
    assert.equal(html.split('/web/api-preconnect.js').length - 1, 1, name);
  }
});
