import { createServer } from 'node:http';
import { ServiceError, fields } from './study-service.js';

async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new ServiceError(415, 'json_required');
  return new Promise((resolve, reject) => {
    let bytes = 0, chunks = [], exceeded = false;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 8192) {
        exceeded = true; chunks = [];
        reject(new ServiceError(413, 'body_too_large'));
      } else if (!exceeded) chunks.push(chunk);
    });
    req.on('end', () => {
      if (exceeded) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new ServiceError(400, 'invalid_json')); }
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new ServiceError(400, 'request_aborted')));
  });
}
export function createStudyApi(service, { authenticate = token => service.authenticate(token) } = {}) {
  const server = createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" });
      res.end(JSON.stringify(data));
    };
    try {
      const allowedHost = `127.0.0.1:${server.address().port}`;
      if (req.headers.host !== allowedHost || (req.headers.origin && req.headers.origin !== `http://${allowedHost}`)) throw new ServiceError(403, 'origin_not_allowed');
      const url = new URL(req.url, `http://${allowedHost}`);
      if (req.method === 'GET' && url.pathname === '/health' && !url.search) return send(200, { status: 'ok', scope: 'local-server-foundation' });
      const auth = req.headers.authorization || '';
      const learner = await authenticate(auth.startsWith('Bearer ') ? auth.slice(7) : '');
      if (url.search) throw new ServiceError(400, 'query_not_supported');
      const path = url.pathname;
      if (req.method === 'GET') {
        if (path === '/api/questions') return send(200, { questions: await service.questions(learner) });
        if (path === '/api/progress') return send(200, await service.summary(learner));
        if (path === '/api/export') return send(200, await service.export(learner));
        const match = path.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)$/);
        if (match) return send(200, await service.session(learner, match[1]));
      }
      if (req.method === 'POST') {
        if (path === '/api/sessions') return send(200, await service.start(learner, await body(req)));
        if (path === '/api/bookmarks') return send(200, await service.bookmark(learner, await body(req)));
        const match = path.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)\/(answer|next|cancel)$/);
        if (match) {
          const input = await body(req);
          if (match[2] === 'cancel') {
            fields(input, []);
            return send(200, await service.cancel(learner, match[1]));
          }
          return send(200, await service[match[2]](learner, match[1], input));
        }
      }
      throw new ServiceError(404, 'route_not_found');
    } catch (error) { send(error instanceof ServiceError ? error.status : 500, { error: error instanceof ServiceError ? error.code : 'internal_error' }); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}
