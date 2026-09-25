import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CloudStudyService } from '../src/server/cloud-study-service.js';
import { createStudyApi } from '../src/server/http-api.js';
import { publishQuestion, recordReview, submitForReview } from '../src/domain/content.js';

const one = '11111111-1111-4111-8111-111111111111';
const two = '22222222-2222-4222-8222-222222222222';
const version = 'demo:concept-identity@1';
test('cloud mode fails closed when the server-only secret is missing', () => {
  const result = spawnSync(process.execPath, ['scripts/api.js'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8',
    env: { ...process.env, MLOS_AUTH_MODE: 'supabase', MLOS_STUDY_STORE: 'supabase',
      MLOS_SUPABASE_URL: 'https://iyapppmeieqhflnzslao.supabase.co', MLOS_SUPABASE_SECRET_KEY: '',
      MLOS_DB_PATH: ':memory:' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /server-only secret key/);
});
function catalog() {
  let content = JSON.parse(readFileSync(new URL('../data/content-draft.json', import.meta.url), 'utf8'));
  content = submitForReview(content, version);
  for (const kind of ['medical', 'references', 'rights']) content = recordReview(content, version, {
    kind, reviewerId: `test-only-${kind}`, reviewedAt: '2026-09-25T00:00:00.000Z',
    decision: 'approved', notes: 'Synthetic test only',
  });
  return publishQuestion(content, version, '2026-09-25T01:00:00.000Z');
}

// Minimal fake Data API: SQL transition semantics are separately tested on the
// dedicated project inside rolled-back transactions, not trusted to this fake.
function fakeCloud() {
  const tables = { study_sessions: [], study_attempts: [], study_bookmarks: [] };
  const from = table => {
    const state = { filters: [], orders: [], columns: '*' };
    const rows = () => {
      let result = tables[table].filter(row => state.filters.every(([key, value]) => row[key] === value));
      for (const [key] of [...state.orders].reverse()) result = result.toSorted((a, b) => String(a[key]).localeCompare(String(b[key])));
      return result.map(row => state.columns === '*' ? { ...row } : Object.fromEntries(
        state.columns.split(',').map(key => [key, row[key]])));
    };
    const query = {
      select(columns) { state.columns = columns; return this; },
      eq(key, value) { state.filters.push([key, value]); return this; },
      order(key) { state.orders.push([key]); return this; },
      range(a, b) { return Promise.resolve({ data: rows().slice(a, b + 1), error: null }); },
      maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }); },
      upsert(row) { tables[table] = tables[table].filter(old => old.learner_id !== row.learner_id ||
        old.question_version_id !== row.question_version_id); tables[table].push(row); return Promise.resolve({ data: null, error: null }); },
      delete() { return { eq(key, value) { state.filters.push([key, value]); return this; },
        then(resolve) { const selected = rows(); tables[table] = tables[table].filter(row =>
          !selected.some(found => found.learner_id === row.learner_id && found.question_version_id === row.question_version_id));
          resolve({ data: null, error: null }); } }; },
    };
    return query;
  };
  const rpc = async (name, arg) => {
    const learner = arg.p_learner, session = tables.study_sessions.find(row => row.id === arg.p_session && row.learner_id === learner);
    const ok = data => ({ data, error: null });
    if (name === 'study_start_session') {
      let active = tables.study_sessions.find(row => row.learner_id === learner && !row.closed);
      if (!active) {
        active = { id: arg.p_id, learner_id: learner, position: 0, closed: false,
          question_version_ids: arg.p_ids, question_started_at: arg.p_started, created_at: arg.p_started };
        tables.study_sessions.push(active);
      }
      return ok({ id: active.id });
    }
    if (!session) return ok({ error: 'session_not_found' });
    if (name === 'study_record_attempt') {
      const retry = tables.study_attempts.find(row => row.learner_id === learner && row.request_key === arg.p_request_key);
      if (retry) return ok(retry.session_id === arg.p_session && retry.position === arg.p_position && retry.option_id === arg.p_option
        ? { receipt: retry.receipt } : { error: 'conflicting_retry' });
      if (session.closed || session.position !== arg.p_position) return ok({ error: 'stale_session' });
      if (tables.study_attempts.some(row => row.session_id === session.id && row.position === arg.p_position)) return ok({ error: 'answer_already_recorded' });
      tables.study_attempts.push({ id: arg.p_event.eventId, learner_id: learner, request_key: arg.p_request_key,
        session_id: session.id, position: arg.p_position, option_id: arg.p_option,
        event: arg.p_event, receipt: arg.p_receipt, recorded_at: arg.p_event.occurredAt });
      return ok({ receipt: arg.p_receipt });
    }
    if (name === 'study_advance_session') {
      if (session.position === arg.p_position + 1) return ok({ id: session.id });
      if (session.closed || session.position !== arg.p_position) return ok({ error: 'stale_session' });
      if (!tables.study_attempts.some(row => row.session_id === session.id && row.position === arg.p_position)) return ok({ error: 'answer_required' });
      session.position++; session.closed = session.position === session.question_version_ids.length;
      session.question_started_at = arg.p_started;
      return ok({ id: session.id });
    }
    if (name === 'study_cancel_session') { session.closed = true; return ok({ id: session.id }); }
    return { data: null, error: { message: 'unknown RPC' } };
  };
  return { from, rpc, tables };
}

test('cloud account API recovers receipts and progress across service instances and isolates owners', async t => {
  const cloud = fakeCloud(), content = catalog();
  const service = () => new CloudStudyService({ client: cloud, catalog: () => content });
  let server = createStudyApi(service(), { authenticate: async token => token === 'one' ? one : token === 'two' ? two : null });
  const listen = async () => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  let base = await listen();
  t.after(() => server.close());
  const request = async (path, token = 'one', body) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const started = await request('/api/sessions', 'one', {});
  assert.equal(started.status, 200);
  assert.equal(started.body.question.questionVersionId, version);
  assert.equal((await request(`/api/sessions/${started.body.sessionId}`, 'two')).status, 404);
  const path = `/api/sessions/${started.body.sessionId}`;
  const answer = { requestId: 'answer-1', position: 0, optionId: 'copies' };
  const first = await request(path + '/answer', 'one', answer);
  assert.equal(first.status, 200);
  assert.equal(first.body.event.correct, false);
  assert.deepEqual((await request(path + '/answer', 'one', answer)).body, first.body);
  assert.equal((await request(path + '/answer', 'one', { ...answer, optionId: 'same-id' })).status, 409);
  assert.equal((await request('/api/bookmarks', 'one', { questionVersionId: version, bookmarked: true })).status, 200);
  assert.equal((await request('/api/progress', 'two')).body.attempts, 0);

  await new Promise(resolve => server.close(resolve));
  server = createStudyApi(service(), { authenticate: async token => token === 'one' ? one : two });
  base = await listen();
  assert.deepEqual((await request(path)).body.receipt, first.body);
  assert.equal((await request('/api/progress')).body.attempts, 1);
  assert.deepEqual((await request('/api/export')).body.bookmarks, [version]);
  assert.equal((await request('/api/questions', 'two')).body.questions.length, 1);
  assert.equal((await request(path + '/next', 'one', { position: 0 })).body.closed, true);
  assert.equal((await request(path + '/next', 'one', { position: 0 })).body.closed, true);
  assert.equal(cloud.tables.study_attempts.length, 1);
});
