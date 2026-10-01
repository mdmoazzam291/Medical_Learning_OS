import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildPages } from '../scripts/build-pages.js';
import { publicFiles, publicFileSet } from '../scripts/public-surface.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    else files.push(relative(root, absolute).replaceAll('\\', '/'));
  }
  return files.sort();
}

test('Cloudflare Pages bundle exposes only the explicit learner public surface', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mlos-pages-'));
  try {
    const result = await buildPages({ outputDirectory: output });
    assert.equal(result.fileCount, publicFiles.length + 3);

    const actual = await listFiles(output);
    const expected = [...publicFiles, 'index.html', '_headers', '_redirects'].sort();
    assert.deepEqual(actual, expected);

    const rootIndex = await readFile(join(output, 'index.html'), 'utf8');
    const canonicalIndex = await readFile(join(repoRoot, 'web/index.html'), 'utf8');
    assert.equal(rootIndex, canonicalIndex);

    for (const forbidden of [
      '.env', '.env.example', 'package.json', 'render.yaml', 'docs/ARCHITECTURE.md',
      'scripts/serve.js', 'supabase/functions/study-api/index.ts', 'ops/r2-backups/README.md'
    ]) {
      assert.equal(actual.includes(forbidden), false, `${forbidden} must not be in Pages output`);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('Pages bundle preserves security headers and only the required static rewrite', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mlos-pages-'));
  try {
    await buildPages({ outputDirectory: output });
    const headers = await readFile(join(output, '_headers'), 'utf8');
    const redirects = await readFile(join(output, '_redirects'), 'utf8');

    assert.match(headers, /Cache-Control: no-store/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /https:\/\/iyapppmeieqhflnzslao\.supabase\.co/);
    assert.match(headers, /https:\/\/o4512152153751552\.ingest\.us\.sentry\.io/);
    assert.equal(redirects, '/oauth/consent /web/oauth-consent.html 200\n');
    assert.doesNotMatch(redirects, /mcp|onrender\.com/i);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('absolute module imports used by the public surface are included in the Pages allowlist', async () => {
  for (const path of publicFiles.filter(path => path.endsWith('.js'))) {
    const source = await readFile(join(repoRoot, path), 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"]\/([^'"]+)['"]/g)) {
      const dependency = match[1];
      assert.equal(publicFileSet.has(dependency), true, `${path} imports missing public dependency ${dependency}`);
    }
  }
});

test('Render static server and Pages build share the same public-surface contract', async () => {
  const server = await readFile(join(repoRoot, 'scripts/serve.js'), 'utf8');
  assert.match(server, /import \{ publicFileSet \} from '\.\/public-surface\.js';/);
  assert.match(server, /publicFileSet\.has\(path\)/);
});
