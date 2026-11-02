import { copyFile, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicFiles } from './public-surface.js';
import { buildPublicInstallPreview } from './public-install-preview.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = join(repoRoot, 'dist-pages');

const securityHeaders = `/*
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'self'; script-src 'self' https://js.sentry-cdn.com https://browser.sentry-cdn.com; style-src 'self'; img-src 'self' https://iyapppmeieqhflnzslao.supabase.co; connect-src 'self' https://iyapppmeieqhflnzslao.supabase.co https://o4512152153751552.ingest.us.sentry.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
/web/manifest.webmanifest
  Content-Type: application/manifest+json; charset=utf-8
`;

const redirects = `/oauth/consent /web/oauth-consent.html 200\n`;

async function copyPublicFile(relativePath, outputDirectory) {
  const source = resolve(repoRoot, relativePath);
  const destination = resolve(outputDirectory, relativePath);
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile()) throw new Error(`Public surface entry is not a file: ${relativePath}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

export function publicPreviewForBuild(env = {}) {
  const mode = env.MLOS_PAGES_PUBLIC_PREVIEW;
  if (mode !== undefined && mode !== '' && mode !== '0' && mode !== '1') throw Error('invalid_public_preview_mode');
  if (env.WORKERS_CI_BRANCH === 'main' && mode === '1') throw Error('public_preview_forbidden_on_production_branch');
  return env.WORKERS_CI_BRANCH === 'feat/pwa-install-foundation-20261102' || mode === '1';
}

export async function buildPages({ outputDirectory = process.env.MLOS_PAGES_OUTPUT || defaultOutput, publicPreview = false } = {}) {
  const output = resolve(outputDirectory);
  if (output === repoRoot || repoRoot.startsWith(`${output}/`)) {
    throw new Error('Refusing unsafe Pages output path');
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  if (publicPreview) return buildPublicInstallPreview({ repoRoot, output, publicFiles });

  for (const relativePath of publicFiles) {
    await copyPublicFile(relativePath, output);
  }

  // Preserve the existing root learner route without widening the public surface.
  await copyFile(resolve(repoRoot, 'web/index.html'), resolve(output, 'index.html'));
  await writeFile(resolve(output, '_headers'), securityHeaders, 'utf8');
  await writeFile(resolve(output, '_redirects'), redirects, 'utf8');

  return { outputDirectory: output, fileCount: publicFiles.length + 3 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildPages({ publicPreview: publicPreviewForBuild(process.env) });
  console.log(`Cloudflare Pages bundle ready: ${result.outputDirectory} (${result.fileCount} files)`);
}
