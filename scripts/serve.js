import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };

// Explicit public surface: no catalogs, docs, dotfiles, credentials or arbitrary paths.
const allowed = new Set([
  'web/index.html',
  'web/app.js',
  'web/styles.css',
  'web/favicon.svg',
  'web/account.html',
  'web/account.js',
  'web/medical.html',
  'web/medical.js',
  'web/review.html',
  'web/review.js',
  'web/cloud-config.js',
  'web/monitoring.js',
  'web/sentry-bootstrap.js',
  'src/domain/demo-study.js',
  'src/domain/learning-events.js',
  'src/adapters/local-store.js',
  'src/adapters/supabase-auth.js',
  'src/adapters/cloud-study.js',
  'src/adapters/cloud-review.js',
  'src/adapters/error-monitoring.js'
]);

const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = pathname === '/' ? 'web/index.html' : pathname.slice(1);
    if (!allowed.has(path)) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const data = await readFile(fileURLToPath(new URL(path, root)));
    res.writeHead(200, {
      'Content-Type': `${types[path.split('.').pop()]}; charset=utf-8`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://js.sentry-cdn.com https://browser.sentry-cdn.com; style-src 'self'; img-src 'self'; connect-src 'self' https://iyapppmeieqhflnzslao.supabase.co https://o4512152153751552.ingest.us.sentry.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500);
    res.end('Unable to serve application');
  }
});

const host = process.env.MLOS_HOST || '127.0.0.1';
server.listen(Number(process.env.PORT || 3000), host, () => {
  console.log(`Medical Learning OS: http://${host}:${server.address().port}`);
});
