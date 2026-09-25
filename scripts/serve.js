import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };
// Explicit public surface: no catalogs, docs, dotfiles, credentials or arbitrary paths.
const allowed = new Set(['web/index.html', 'web/app.js', 'web/styles.css', 'web/favicon.svg', 'web/account.html', 'web/account.bundle.js',
  'src/domain/demo-study.js', 'src/domain/learning-events.js', 'src/adapters/local-store.js']);
if (process.env.MLOS_AUTH_MODE === 'supabase' && process.env.MLOS_SUPABASE_URL !== 'https://iyapppmeieqhflnzslao.supabase.co')
  throw new Error('Account preview must use the dedicated Medical Learning OS Supabase project');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/auth-config') {
      const url = process.env.MLOS_SUPABASE_URL;
      const key = process.env.MLOS_SUPABASE_PUBLISHABLE_KEY;
      res.writeHead(url && key && process.env.MLOS_AUTH_MODE === 'supabase' ? 200 : 503,
        { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(JSON.stringify(url && key && process.env.MLOS_AUTH_MODE === 'supabase'
        ? { url, publishableKey: key } : { error: 'account_setup_required' }));
    }
    if (pathname.startsWith('/api/')) {
      if (process.env.MLOS_AUTH_MODE !== 'supabase') { res.writeHead(503); return res.end(); }
      const chunks = []; let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 8192) { res.writeHead(413); return res.end(); }
        chunks.push(chunk);
      }
      const port = Number(process.env.MLOS_API_PORT || 3001);
      const origin = `http://127.0.0.1:${port}`;
      const upstream = await fetch(origin + req.url, {
        method: req.method, headers: { Authorization: req.headers.authorization || '',
          'Content-Type': req.headers['content-type'] || '', Origin: origin },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks), signal: AbortSignal.timeout(10000),
      });
      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff' });
      return res.end(await upstream.text());
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    const path = pathname === '/' ? 'web/index.html' : pathname.slice(1);
    if (!allowed.has(path)) { res.writeHead(404); return res.end('Not found'); }
    const data = await readFile(fileURLToPath(new URL(path, root)));
    const connect = process.env.MLOS_AUTH_MODE === 'supabase' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(process.env.MLOS_SUPABASE_URL || '')
      ? ` 'self' ${process.env.MLOS_SUPABASE_URL}` : " 'self'";
    res.writeHead(200, { 'Content-Type': `${types[path.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src${connect}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Unable to serve application'); }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Medical Learning OS: http://127.0.0.1:' + server.address().port));
