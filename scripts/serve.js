import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };
// Explicit public surface: no catalogs, docs, dotfiles, credentials or arbitrary paths.
const allowed = new Set(['web/index.html', 'web/app.js', 'web/styles.css', 'web/favicon.svg',
  'src/domain/demo-study.js', 'src/domain/learning-events.js', 'src/adapters/local-store.js']);
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = pathname === '/' ? 'web/index.html' : pathname.slice(1);
    if (!allowed.has(path)) { res.writeHead(404); return res.end('Not found'); }
    const data = await readFile(fileURLToPath(new URL(path, root)));
    res.writeHead(200, { 'Content-Type': `${types[path.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Unable to serve application'); }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Medical Learning OS: http://127.0.0.1:' + server.address().port));
