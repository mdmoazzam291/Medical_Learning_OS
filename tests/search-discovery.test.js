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
    assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), ['https://medretica.com/', ...['services', 'contact', 'terms', 'privacy', 'refunds', 'delivery'].map(name => `https://medretica.com/web/${name}`)]);
    for (const url of [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])) {
      const path = new URL(url).pathname;
      const html = await readFile(join(output, path === '/' ? 'index.html' : path.slice(1) + '.html'), 'utf8');
      assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${url} needs its own canonical`);
    }
    assert.equal(publicFileSet.has('sitemap.xml'), true);
    assert.equal(publicFileSet.has('robots.txt'), true);
    assert.match(await readFile(join(output, 'robots.txt'), 'utf8'), /^Sitemap: https:\/\/medretica.com\/sitemap.xml$/m);
  } finally { await rm(output, { recursive: true, force: true }); }
});


test('homepage serves useful public content before JavaScript and an actionable account link', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  assert.ok(main);
  assert.match(main, /Medical Learning Operating System/);
  assert.match(main, /href="\/web\/account.html"/);
  assert.match(main, /reviewed and published/);
  assert.doesNotMatch(main, /Opening your beta workspace/);
});
