import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { handleAdminMcpHttp, protectedResourceMetadata } from '../src/server/admin-mcp.js';
import { publicFileSet } from './public-surface.js';

const root = new URL('../', import.meta.url);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', json: 'application/json' };

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    if (pathname === '/.well-known/oauth-protected-resource') {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        return res.end();
      }
      const payload = JSON.stringify(protectedResourceMetadata());
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      return res.end(req.method === 'HEAD' ? undefined : payload);
    }

    if (pathname === '/mcp' || pathname === '/mcp-readonly') {
      return handleAdminMcpHttp(req, res, {
        readOnlyMode: pathname === '/mcp-readonly'
      });
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const path = pathname === '/'
      ? 'web/index.html'
      : pathname === '/oauth/consent'
        ? 'web/oauth-consent.html'
        : pathname.slice(1);
    if (!publicFileSet.has(path)) {
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
