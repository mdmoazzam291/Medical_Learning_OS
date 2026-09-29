import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_MCP_TOOLS,
  ADMIN_MCP_UI_URI,
  dispatchAdminMcpRpc,
  protectedResourceMetadata
} from '../src/server/admin-mcp.js';

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('admin MCP publishes OAuth protected-resource metadata without secrets', () => {
  const metadata = protectedResourceMetadata();
  assert.equal(metadata.resource, 'https://medical-learning-os-preview.onrender.com');
  assert.deepEqual(metadata.authorization_servers, ['https://iyapppmeieqhflnzslao.supabase.co/auth/v1']);
  assert.deepEqual(metadata.scopes_supported, ['openid', 'email', 'profile']);
  assert.doesNotMatch(JSON.stringify(metadata), /service_role|secret/i);
});

test('V0.1 tool surface is bounded and has no publication or learner-account authority', () => {
  const names = ADMIN_MCP_TOOLS.map(tool => tool.name);
  assert.ok(names.includes('mlos_create_note_draft'));
  assert.ok(names.includes('mlos_record_question_review'));
  assert.ok(names.includes('mlos_resolve_source_rights'));
  assert.ok(names.includes('mlos_admin_search'));
  assert.ok(names.includes('mlos_admin_home'));
  assert.equal(ADMIN_MCP_UI_URI, 'ui://medical-learning-os/admin-control-v1.html');
  assert.equal(names.some(name => /publish|delete|suspend|learner_access|grant_beta/i.test(name)), false);
});

test('authoritative review tools are declared as consequential writes', () => {
  for (const name of [
    'mlos_record_question_review',
    'mlos_record_note_review',
    'mlos_resolve_source_rights',
    'mlos_full_question_review',
    'mlos_structured_review_batch'
  ]) {
    const tool = ADMIN_MCP_TOOLS.find(item => item.name === name);
    assert.equal(tool.annotations.readOnlyHint, false);
    assert.equal(tool.annotations.destructiveHint, true);
  }
  const draft = ADMIN_MCP_TOOLS.find(item => item.name === 'mlos_create_note_draft');
  assert.equal(draft.annotations.destructiveHint, false);
});

test('initialize authenticates through existing MLOS admin policy', async () => {
  const requests = [];
  const fetchFn = async (url, options) => {
    requests.push({ url, options });
    return jsonResponse({ reviewerId: 'admin-id', isAdmin: true, reviewKinds: ['medical', 'references', 'rights'] });
  };
  const result = await dispatchAdminMcpRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25' }
  }, 'user-jwt', { fetchFn });

  assert.equal(result.status, 200);
  assert.equal(result.body.result.serverInfo.name, 'medical-learning-os-admin');
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/functions\/v1\/review-api\/me$/);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer user-jwt');
  assert.match(requests[0].options.headers.apikey, /^sb_publishable_/);
});

test('non-admin identities cannot initialize the admin MCP surface', async () => {
  const fetchFn = async () => jsonResponse({ reviewerId: 'learner-id', isAdmin: false, reviewKinds: [] });
  await assert.rejects(
    dispatchAdminMcpRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25' }
    }, 'learner-jwt', { fetchFn }),
    /content_admin_required/
  );
});

test('note draft tool delegates to review-api and cannot claim publication authority', async () => {
  const requests = [];
  const fetchFn = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/me')) {
      return jsonResponse({ reviewerId: 'admin-id', isAdmin: true, reviewKinds: ['medical', 'references', 'rights'] });
    }
    if (url.endsWith('/note-drafts')) {
      return jsonResponse({
        contractId: 'content-admin-note-draft-receipt-v1',
        noteVersionId: '00000000-0000-4000-8000-000000000001',
        status: 'draft',
        learnerVisible: false,
        publicationAuthority: false,
        reviewAuthority: false,
        independentReviewRequired: true
      });
    }
    return jsonResponse({ error: 'not_found' }, 404);
  };

  const result = await dispatchAdminMcpRpc({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'mlos_create_note_draft',
      arguments: {
        conceptId: 'renal:nephrotic-syndrome',
        title: 'Nephrotic syndrome',
        bodyMarkdown: 'Draft content',
        sourceIds: ['source:one'],
        provenance: { kind: 'human_authored_original', evidence: 'Created for controlled review.' }
      }
    }
  }, 'user-jwt', { fetchFn });

  assert.equal(result.body.result.structuredContent.status, 'draft');
  assert.equal(result.body.result.structuredContent.publicationAuthority, false);
  const write = requests.find(item => item.url.endsWith('/note-drafts'));
  assert.equal(write.options.method, 'POST');
  assert.doesNotMatch(write.options.body, /authorId|reviewerId/);
});

test('admin home tool is linked to the plugin UI resource', async () => {
  const fetchFn = async url => {
    if (url.endsWith('/me')) return jsonResponse({ reviewerId: 'admin-id', isAdmin: true, reviewKinds: ['medical'] });
    if (url.endsWith('/pipeline-status')) return jsonResponse({ contractId: 'content-intake-pipeline-status-v1' });
    return jsonResponse({ error: 'not_found' }, 404);
  };
  const result = await dispatchAdminMcpRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'mlos_admin_home', arguments: {} }
  }, 'user-jwt', { fetchFn });

  assert.equal(result.body.result._meta.ui.resourceUri, ADMIN_MCP_UI_URI);
  assert.equal(result.body.result.structuredContent.isAdmin, true);
});


test('read-only MCP mode advertises no write tools', async () => {
  const fetchFn = async () => jsonResponse({
    reviewerId: 'admin-id',
    isAdmin: true,
    reviewKinds: ['medical', 'references', 'rights']
  });
  const result = await dispatchAdminMcpRpc({
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/list'
  }, 'user-jwt', { fetchFn, readOnlyMode: true });
  const names = result.body.result.tools.map(tool => tool.name);
  assert.deepEqual(names.sort(), [
    'mlos_admin_home',
    'mlos_admin_search',
    'mlos_learner_issue_queue',
    'mlos_note_review_queue',
    'mlos_question_review_queue'
  ].sort());
  assert.equal(result.body.result.tools.every(tool => tool.annotations.readOnlyHint === true), true);
});

test('read-only MCP mode rejects authoritative tool calls even for admin', async () => {
  const fetchFn = async () => jsonResponse({
    reviewerId: 'admin-id',
    isAdmin: true,
    reviewKinds: ['medical', 'references', 'rights']
  });
  const result = await dispatchAdminMcpRpc({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'mlos_resolve_source_rights',
      arguments: { sourceId: 'source:one', rightsStatus: 'citation_only', evidence: 'x' }
    }
  }, 'user-jwt', { fetchFn, readOnlyMode: true });
  assert.equal(result.body.error.code, -32602);
});
