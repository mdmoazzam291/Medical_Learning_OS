import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from '../scripts/build-pages.js';
import { publicFileSet } from '../scripts/public-surface.js';

test('production bundle publishes the canonical homepage sitemap and discovery record', async () => {
  const output = await mkdtemp(join(tmpdir(), 'medretica-search-'));
  try {
    await buildPages({ outputDirectory: output });
    const xml = await readFile(join(output, 'sitemap.xml'), 'utf8');
    assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), ['https://medretica.com/']);
    assert.equal(publicFileSet.has('sitemap.xml'), true);
    assert.equal(publicFileSet.has('robots.txt'), true);
    assert.match(await readFile(join(output, 'robots.txt'), 'utf8'), /^Sitemap: https:\/\/medretica.com\/sitemap.xml$/m);
  } finally { await rm(output, { recursive: true, force: true }); }
});
