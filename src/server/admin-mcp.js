const DEFAULT_PROJECT_URL = 'https://iyapppmeieqhflnzslao.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_Iohyc6yoLk2vWb07YZfEjw_XmJJ3koE';
const DEFAULT_PUBLIC_URL = 'https://medical-learning-os-preview.onrender.com';

export const ADMIN_MCP_UI_URI = 'ui://medical-learning-os/admin-control-v1.html';

const READ_ONLY_TOOL_NAMES = new Set([
  'mlos_admin_home',
  'mlos_admin_search',
  'mlos_question_review_queue',
  'mlos_note_review_queue',
  'mlos_learner_issue_queue'
]);

const projectUrl = () => String(process.env.MLOS_SUPABASE_URL || DEFAULT_PROJECT_URL).replace(/\/$/, '');
const publishableKey = () => String(process.env.MLOS_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY);
const publicUrl = () => String(process.env.MLOS_PUBLIC_URL || DEFAULT_PUBLIC_URL).replace(/\/$/, '');
const reviewApiUrl = path => projectUrl() + '/functions/v1/review-api' + path;

const readOnly = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
});
const draftWrite = Object.freeze({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false
});
const authoritativeWrite = Object.freeze({
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false
});

const REVIEW_KIND_SCHEMA = { type: 'string', enum: ['medical', 'references', 'rights'] };

const ADMIN_MCP_TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'mlos_admin_home',
    title: 'MLOS Admin Home',
    description: 'Read the authenticated Medical Learning OS admin identity and content-pipeline status. This tool never changes learner or content state.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: readOnly,
    _meta: {
      ui: { resourceUri: ADMIN_MCP_UI_URI },
      'openai/outputTemplate': ADMIN_MCP_UI_URI
    }
  },
  {
    name: 'mlos_admin_search',
    title: 'Search MLOS Canonical Content',
    description: 'Search canonical concepts, sources, or questions before linking or creating content. Use this before inventing a new concept or source.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', minLength: 2, maxLength: 120 },
        type: { type: 'string', enum: ['all', 'concept', 'source', 'question'], default: 'all' }
      },
      required: ['q'],
      additionalProperties: false
    },
    annotations: readOnly
  },
  {
    name: 'mlos_question_review_queue',
    title: 'Question Review Queue',
    description: 'Read source-bound questions awaiting one human review gate. Returns only the selected gate queue.',
    inputSchema: {
      type: 'object',
      properties: { reviewKind: REVIEW_KIND_SCHEMA },
      required: ['reviewKind'],
      additionalProperties: false
    },
    annotations: readOnly
  },
  {
    name: 'mlos_note_review_queue',
    title: 'NeuralVault Note Review Queue',
    description: 'Read canonical NeuralVault note versions awaiting one human review gate.',
    inputSchema: {
      type: 'object',
      properties: { reviewKind: REVIEW_KIND_SCHEMA },
      required: ['reviewKind'],
      additionalProperties: false
    },
    annotations: readOnly
  },
  {
    name: 'mlos_learner_issue_queue',
    title: 'Learner Content Issue Queue',
    description: 'Read privacy-minimized learner content issue reports. Learner identity is intentionally not exposed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: readOnly
  },
  {
    name: 'mlos_create_note_draft',
    title: 'Create Canonical Note Draft',
    description: 'Create a source-bound NeuralVault canonical note DRAFT. The draft is not learner-visible, cannot publish itself, and still requires independent human review.',
    inputSchema: {
      type: 'object',
      properties: {
        conceptId: { type: 'string', minLength: 1, maxLength: 160 },
        title: { type: 'string', minLength: 1, maxLength: 300 },
        bodyMarkdown: { type: 'string', minLength: 1, maxLength: 100000 },
        sourceIds: {
          type: 'array',
          minItems: 1,
          maxItems: 100,
          uniqueItems: true,
          items: { type: 'string', minLength: 1, maxLength: 160 }
        },
        provenance: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['ai_generated_original', 'human_authored_original', 'licensed_adaptation'] },
            evidence: { type: 'string', minLength: 1, maxLength: 2000 }
          },
          required: ['kind', 'evidence'],
          additionalProperties: false
        }
      },
      required: ['conceptId', 'title', 'bodyMarkdown', 'sourceIds', 'provenance'],
      additionalProperties: false
    },
    annotations: draftWrite
  },
  {
    name: 'mlos_record_question_review',
    title: 'Record Question Review',
    description: 'Record one immutable human review decision for a question version. This is authoritative review evidence but has no publication authority.',
    inputSchema: {
      type: 'object',
      properties: {
        questionVersionId: { type: 'string', minLength: 1, maxLength: 160 },
        reviewKind: REVIEW_KIND_SCHEMA,
        decision: { type: 'string', enum: ['approved', 'rejected'] },
        notes: { type: 'string', minLength: 1, maxLength: 4000 }
      },
      required: ['questionVersionId', 'reviewKind', 'decision', 'notes'],
      additionalProperties: false
    },
    annotations: authoritativeWrite
  },
  {
    name: 'mlos_record_note_review',
    title: 'Record Note Review',
    description: 'Record one immutable human review decision for a NeuralVault note version. The note author cannot self-review.',
    inputSchema: {
      type: 'object',
      properties: {
        noteVersionId: { type: 'string', minLength: 36, maxLength: 36 },
        reviewKind: REVIEW_KIND_SCHEMA,
        decision: { type: 'string', enum: ['approved', 'rejected'] },
        notes: { type: 'string', minLength: 1, maxLength: 4000 }
      },
      required: ['noteVersionId', 'reviewKind', 'decision', 'notes'],
      additionalProperties: false
    },
    annotations: authoritativeWrite
  },
  {
    name: 'mlos_resolve_source_rights',
    title: 'Resolve Source Rights',
    description: 'Record immutable Rights/provenance evidence for one source. Use only after inspecting the exact source and evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', minLength: 1, maxLength: 160 },
        rightsStatus: { type: 'string', enum: ['owned', 'licensed', 'public_domain', 'citation_only', 'restricted'] },
        evidence: { type: 'string', minLength: 1, maxLength: 4000 }
      },
      required: ['sourceId', 'rightsStatus', 'evidence'],
      additionalProperties: false
    },
    annotations: authoritativeWrite
  },
  {
    name: 'mlos_full_question_review',
    title: 'Full Question Human Review',
    description: 'Record Medical, References, and Rights approvals for one exact unreviewed question version after explicit human attestation. It never publishes the question.',
    inputSchema: {
      type: 'object',
      properties: {
        questionVersionId: { type: 'string', minLength: 1, maxLength: 160 },
        medicalNotes: { type: 'string', minLength: 1, maxLength: 4000 },
        referencesNotes: { type: 'string', minLength: 1, maxLength: 4000 },
        rightsNotes: { type: 'string', minLength: 1, maxLength: 4000 },
        attested: { type: 'boolean', const: true }
      },
      required: ['questionVersionId', 'medicalNotes', 'referencesNotes', 'rightsNotes', 'attested'],
      additionalProperties: false
    },
    annotations: authoritativeWrite
  },
  {
    name: 'mlos_structured_review_batch',
    title: 'Structured Human Review Batch',
    description: 'Record a bounded immutable human review decision across exact question/note targets. Requires explicit human attestation and never publishes content.',
    inputSchema: {
      type: 'object',
      properties: {
        targetType: { type: 'string', enum: ['question_version', 'neural_note_version'] },
        targetIds: {
          type: 'array',
          minItems: 1,
          maxItems: 500,
          uniqueItems: true,
          items: { type: 'string', minLength: 1, maxLength: 180 }
        },
        reviewKind: REVIEW_KIND_SCHEMA,
        decision: { type: 'string', enum: ['approved', 'rejected'] },
        reasonCode: {
          type: 'string',
          enum: [
            'human_reviewed_no_issue',
            'needs_medical_correction',
            'reference_support_insufficient',
            'rights_or_provenance_problem',
            'duplicate_or_scope_problem',
            'other_review_problem'
          ]
        },
        attested: { type: 'boolean', const: true }
      },
      required: ['targetType', 'targetIds', 'reviewKind', 'decision', 'reasonCode', 'attested'],
      additionalProperties: false
    },
    annotations: authoritativeWrite
  }
]);

const OAUTH_SECURITY_SCHEMES = Object.freeze([
  Object.freeze({ type: 'oauth2', scopes: ['openid', 'email', 'profile'] })
]);

export const ADMIN_MCP_TOOLS = Object.freeze(
  ADMIN_MCP_TOOL_DEFINITIONS.map(tool => Object.freeze({
    ...tool,
    securitySchemes: OAUTH_SECURITY_SCHEMES,
    _meta: Object.freeze({
      ...(tool._meta || {}),
      securitySchemes: OAUTH_SECURITY_SCHEMES
    })
  }))
);

function textResult(payload, extra = {}) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    ...extra
  };
}

function toolByName(name, { readOnlyMode = false } = {}) {
  const tool = ADMIN_MCP_TOOLS.find(item => item.name === name) || null;
  if (!tool) return null;
  if (readOnlyMode && !READ_ONLY_TOOL_NAMES.has(name)) return null;
  return tool;
}

function advertisedTools(readOnlyMode) {
  return readOnlyMode
    ? ADMIN_MCP_TOOLS.filter(tool => READ_ONLY_TOOL_NAMES.has(tool.name))
    : ADMIN_MCP_TOOLS;
}

function cleanArgs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

async function apiRequest(token, path, { method = 'GET', body, fetchFn = fetch } = {}) {
  const response = await fetchFn(reviewApiUrl(path), {
    method,
    headers: {
      apikey: publishableKey(),
      Authorization: 'Bearer ' + token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(String(payload?.error || 'review_request_failed'));
    error.status = response.status;
    error.code = String(payload?.error || 'review_request_failed');
    throw error;
  }
  return payload;
}

async function requireAdmin(token, fetchFn) {
  const me = await apiRequest(token, '/me', { fetchFn });
  if (me?.isAdmin !== true) {
    const error = new Error('content_admin_required');
    error.status = 403;
    error.code = 'content_admin_required';
    throw error;
  }
  return me;
}

async function callTool(name, args, token, fetchFn) {
  const input = cleanArgs(args);
  switch (name) {
    case 'mlos_admin_home': {
      const [me, pipeline] = await Promise.all([
        requireAdmin(token, fetchFn),
        apiRequest(token, '/pipeline-status', { fetchFn })
      ]);
      return textResult({
        contractId: 'mlos-admin-home-v1',
        isAdmin: true,
        reviewKinds: Array.isArray(me.reviewKinds) ? me.reviewKinds : [],
        pipeline
      }, {
        _meta: {
          ui: { resourceUri: ADMIN_MCP_UI_URI },
          'openai/outputTemplate': ADMIN_MCP_UI_URI
        }
      });
    }
    case 'mlos_admin_search': {
      await requireAdmin(token, fetchFn);
      const q = encodeURIComponent(String(input.q || ''));
      const type = encodeURIComponent(String(input.type || 'all'));
      return textResult(await apiRequest(token, '/admin-search?q=' + q + '&type=' + type, { fetchFn }));
    }
    case 'mlos_question_review_queue':
      return textResult(await apiRequest(token, '/queue?kind=' + encodeURIComponent(String(input.reviewKind || '')), { fetchFn }));
    case 'mlos_note_review_queue':
      return textResult(await apiRequest(token, '/note-queue?kind=' + encodeURIComponent(String(input.reviewKind || '')), { fetchFn }));
    case 'mlos_learner_issue_queue':
      return textResult(await apiRequest(token, '/learner-reports', { fetchFn }));
    case 'mlos_create_note_draft':
      return textResult(await apiRequest(token, '/note-drafts', { method: 'POST', body: input, fetchFn }));
    case 'mlos_record_question_review':
      return textResult(await apiRequest(token, '/reviews', { method: 'POST', body: input, fetchFn }));
    case 'mlos_record_note_review':
      return textResult(await apiRequest(token, '/note-reviews', { method: 'POST', body: input, fetchFn }));
    case 'mlos_resolve_source_rights':
      return textResult(await apiRequest(token, '/source-rights', { method: 'POST', body: input, fetchFn }));
    case 'mlos_full_question_review':
      return textResult(await apiRequest(token, '/full-question-review', {
        method: 'POST',
        body: {
          questionVersionId: input.questionVersionId,
          medicalNotes: input.medicalNotes,
          referencesNotes: input.referencesNotes,
          rightsNotes: input.rightsNotes,
          attestationVersion: 'full-question-review-attestation-v1',
          attested: input.attested === true
        },
        fetchFn
      }));
    case 'mlos_structured_review_batch':
      return textResult(await apiRequest(token, '/structured-review-batch', {
        method: 'POST',
        body: {
          ...input,
          attestationVersion: 'structured-human-review-v1',
          attested: input.attested === true
        },
        fetchFn
      }));
    default: {
      const error = new Error('tool_not_found');
      error.status = 404;
      error.code = 'tool_not_found';
      throw error;
    }
  }
}

function adminWidgetHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color-scheme:light dark}
body{margin:0;padding:16px;background:transparent}
.shell{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:16px;padding:16px}
.kicker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.65}
h2{margin:6px 0 12px;font-size:20px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.card{padding:10px;border-radius:12px;background:color-mix(in srgb,currentColor 6%,transparent)}
.value{font-size:18px;font-weight:700}
.label{font-size:12px;opacity:.7}
.note{margin-top:12px;font-size:12px;opacity:.75}
@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="shell">
  <div class="kicker">Medical Learning OS</div>
  <h2>Admin Control</h2>
  <div class="grid">
    <div class="card"><div class="value" id="admin">Authenticated</div><div class="label">Authority</div></div>
    <div class="card"><div class="value" id="gates">—</div><div class="label">Review gates</div></div>
    <div class="card"><div class="value" id="pipeline">Ready</div><div class="label">Pipeline</div></div>
  </div>
  <div class="note">Authoritative writes still pass through MLOS server-side review policy. Draft creation never makes content learner-visible.</div>
</div>
<script>
function draw(data){
  if(!data||typeof data!=='object') return;
  document.querySelector('#admin').textContent=data.isAdmin?'Admin':'No admin access';
  document.querySelector('#gates').textContent=Array.isArray(data.reviewKinds)?data.reviewKinds.length:'—';
  document.querySelector('#pipeline').textContent=data.pipeline?'Connected':'Unavailable';
}
draw(window.openai?.toolOutput);
window.addEventListener('openai:set_globals',e=>draw(e.detail?.globals?.toolOutput));
</script>
</body>
</html>`;
}

export function protectedResourceMetadata() {
  return {
    resource: publicUrl(),
    authorization_servers: [projectUrl() + '/auth/v1'],
    scopes_supported: ['openid', 'email', 'profile'],
    resource_documentation: publicUrl() + '/web/admin.html'
  };
}

export async function dispatchAdminMcpRpc(rpc, token, { fetchFn = fetch, readOnlyMode = false } = {}) {
  if (!rpc || rpc.jsonrpc !== '2.0' || (!('id' in rpc) && !String(rpc.method || '').startsWith('notifications/'))) {
    return { status: 400, body: { jsonrpc: '2.0', id: rpc?.id ?? null, error: { code: -32600, message: 'Invalid Request' } } };
  }

  await requireAdmin(token, fetchFn);

  if (rpc.method === 'notifications/initialized') return { status: 202, body: null };
  if (rpc.method === 'ping') return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, result: {} } };
  if (rpc.method === 'initialize') {
    const requested = typeof rpc.params?.protocolVersion === 'string' ? rpc.params.protocolVersion : '2025-11-25';
    return {
      status: 200,
      body: {
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          protocolVersion: requested,
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'medical-learning-os-admin', version: '0.1.0' }
        }
      }
    };
  }
  if (rpc.method === 'tools/list') {
    return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, result: { tools: advertisedTools(readOnlyMode) } } };
  }
  if (rpc.method === 'tools/call') {
    const name = String(rpc.params?.name || '');
    if (!toolByName(name, { readOnlyMode })) {
      return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, error: { code: -32602, message: 'Unknown tool' } } };
    }
    try {
      const result = await callTool(name, rpc.params?.arguments, token, fetchFn);
      return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, result } };
    } catch (error) {
      return {
        status: 200,
        body: {
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: error?.code || 'tool_call_failed' }) }],
            isError: true
          }
        }
      };
    }
  }
  if (rpc.method === 'resources/list') {
    return {
      status: 200,
      body: {
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          resources: [{
            uri: ADMIN_MCP_UI_URI,
            name: 'MLOS Admin Control',
            description: 'Compact Medical Learning OS admin status surface.',
            mimeType: 'text/html;profile=mcp-app'
          }]
        }
      }
    };
  }
  if (rpc.method === 'resources/read') {
    if (rpc.params?.uri !== ADMIN_MCP_UI_URI) {
      return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, error: { code: -32602, message: 'Unknown resource' } } };
    }
    return {
      status: 200,
      body: {
        jsonrpc: '2.0',
        id: rpc.id,
        result: {
          contents: [{
            uri: ADMIN_MCP_UI_URI,
            mimeType: 'text/html;profile=mcp-app',
            text: adminWidgetHtml(),
            _meta: {
              ui: {
                prefersBorder: true,
                csp: {
                  connectDomains: [],
                  resourceDomains: []
                }
              }
            }
          }]
        }
      }
    };
  }
  return { status: 200, body: { jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } } };
}

function readBody(req, maxBytes = 262144) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('body_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('invalid_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function bearerToken(req) {
  const authorization = String(req.headers.authorization || '');
  return authorization.startsWith('Bearer ') && authorization.length > 7 ? authorization.slice(7) : null;
}

function challengeHeader() {
  return 'Bearer resource_metadata="' + publicUrl() + '/.well-known/oauth-protected-resource", scope="openid email profile"';
}

export async function handleAdminMcpHttp(req, res, options = {}) {
  const readOnlyMode = options.readOnlyMode === true;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' });
    return res.end();
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST, OPTIONS', 'Cache-Control': 'no-store' });
    return res.end();
  }

  const token = bearerToken(req);
  if (!token) {
    res.writeHead(401, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'WWW-Authenticate': challengeHeader()
    });
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  try {
    const rpc = await readBody(req);
    const result = await dispatchAdminMcpRpc(rpc, token, { ...options, readOnlyMode });
    if (result.body === null) {
      res.writeHead(result.status, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    res.writeHead(result.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(JSON.stringify(result.body));
  } catch (error) {
    const status = Number(error?.status || 500);
    if (status === 401 || status === 403) {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'WWW-Authenticate': challengeHeader()
      });
      return res.end(JSON.stringify({ error: error?.code || 'unauthorized' }));
    }
    res.writeHead(status >= 400 && status <= 599 ? status : 500, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    return res.end(JSON.stringify({ error: error?.code || error?.message || 'internal_error' }));
  }
}
