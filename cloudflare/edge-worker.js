const DEFAULT_ORIGIN = 'https://medical-learning-os-preview.onrender.com';

function originUrlFor(request, env = {}) {
  const incoming = new URL(request.url);
  const origin = new URL(env.ORIGIN_BASE_URL || DEFAULT_ORIGIN);

  if (origin.protocol !== 'https:') {
    throw new Error('origin_must_use_https');
  }

  if (origin.host === incoming.host) {
    throw new Error('origin_must_not_point_to_edge');
  }

  origin.pathname = incoming.pathname;
  origin.search = incoming.search;
  origin.hash = '';
  return origin;
}

function edgeHealth(env = {}) {
  const origin = new URL(env.ORIGIN_BASE_URL || DEFAULT_ORIGIN);
  return Response.json({
    ok: true,
    service: 'medical-learning-os-edge',
    origin: origin.host
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-MLOS-Edge': 'cloudflare'
    }
  });
}

function unavailableResponse() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Medical Learning OS · Temporarily unavailable</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f7faf8;color:#13251d}
    main{max-width:34rem;padding:2rem}
    h1{font-size:1.8rem;margin:0 0 .75rem}
    p{line-height:1.6;color:#526158}
  </style>
</head>
<body><main><h1>Medical Learning OS is temporarily unavailable.</h1><p>The edge gateway is online, but the application origin could not be reached. Please retry shortly.</p></main></body>
</html>`, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-MLOS-Edge': 'cloudflare'
    }
  });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);

    if (request.method === 'GET' && incoming.pathname === '/__edge-health') {
      return edgeHealth(env);
    }

    let upstreamUrl;
    try {
      upstreamUrl = originUrlFor(request, env);
    } catch {
      return unavailableResponse();
    }

    try {
      const upstreamRequest = new Request(upstreamUrl, request);
      const response = await fetch(upstreamRequest);
      const headers = new Headers(response.headers);
      headers.set('X-MLOS-Edge', 'cloudflare');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return unavailableResponse();
    }
  }
};
