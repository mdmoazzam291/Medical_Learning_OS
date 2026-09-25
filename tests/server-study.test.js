import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudyService } from '../src/server/study-service.js';
import { createStudyApi } from '../src/server/http-api.js';
import { submitForReview, recordReview, publishQuestion, retireQuestion } from '../src/domain/content.js';

const version = 'demo:concept-identity@1';
const draft = () => JSON.parse(readFileSync(new URL('../data/content-draft.json', import.meta.url), 'utf8'));
// Synthetic nonclinical approvals exist only inside this test process. They do
// not publish the repository fixture or assert an actual medical review.
function published() {
  let catalog = submitForReview(draft(), version);
  for (const kind of ['medical', 'references', 'rights']) catalog = recordReview(catalog, version, {
    kind, reviewerId: `test-only-${kind}`, reviewedAt: '2026-09-25T00:00:00.000Z', decision: 'approved', notes: 'Synthetic test only',
  });
  return publishQuestion(catalog, version, '2026-09-25T01:00:00.000Z');
}
function setup(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'mlos-server-test-'));
  const path = join(directory, 'study.sqlite');
  const service = new StudyService(path, options);
  t.after(() => { service.close(); rmSync(directory, { recursive: true, force: true }); });
  return { service, path };
}
const answer = (service, learner, session, extra = {}) => service.answer(learner, session.sessionId,
  { requestId: 'answer-1', position: 0, optionId: 'same-id', ...extra });

test('empty and draft-only catalogs cannot start a learner session', t => {
  const { service } = setup(t);
  assert.throws(() => service.start('one', {}), /no_published_questions/);
  service.importCatalog(draft());
  assert.deepEqual(service.questions('one'), []);
  assert.throws(() => service.start('one', {}), /no_published_questions/);
  assert.equal(draft().questions[0].status, 'draft');
});
test('credentials are hashed, learner-bound, expiring and revocable', t => {
  let now = 1000;
  const { service } = setup(t, { clock: () => now });
  const token = service.provision('one', 1000);
  assert.equal(service.authenticate(token), 'one');
  assert.ok(!JSON.stringify(service.db.prepare('SELECT * FROM credentials').all()).includes(token));
  assert.throws(() => service.authenticate('one'), /unauthorized/);
  now = 2000;
  assert.throws(() => service.authenticate(token), /unauthorized/);
  const newToken = service.provision('one'); service.revokeLearner('one');
  assert.throws(() => service.authenticate(newToken), /unauthorized/);
});
test('server derives correctness, sources and primary concept; pre-answer payload has no key', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {});
  assert.deepEqual(Object.keys(session.question).sort(), ['options', 'questionVersionId', 'stem']);
  assert.equal(session.receipt, null);
  assert.throws(() => answer(service, 'one', session, { correct: true }), /invalid_fields/);
  assert.throws(() => answer(service, 'one', session, { learnerId: 'two' }), /invalid_fields/);
  assert.throws(() => answer(service, 'one', session, { optionId: 'invalid' }), /invalid_option/);
  const receipt = answer(service, 'one', session, { optionId: 'copies' });
  assert.equal(receipt.event.correct, false);
  assert.equal(receipt.event.conceptId, 'demo:canonical-concept');
  assert.equal(receipt.sources.length, 1);
  assert.equal(service.session('one', session.sessionId).receipt.explanation, receipt.explanation);
});
test('retries are stable, conflicting retries and second answers are rejected', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {}), first = answer(service, 'one', session);
  assert.deepEqual(answer(service, 'one', session), first);
  assert.equal(service.summary('one').attempts, 1);
  assert.throws(() => answer(service, 'one', session, { optionId: 'copies' }), /conflicting_retry/);
  assert.throws(() => answer(service, 'one', session, { requestId: 'different' }), /answer_already_recorded/);
  service.next('one', session.sessionId, { position: 0 });
  assert.deepEqual(answer(service, 'one', session), first);
});
test('session ownership isolates resume, answers, advancement and cancellation', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {});
  for (const operation of [() => service.session('two', session.sessionId), () => answer(service, 'two', session),
    () => service.next('two', session.sessionId, { position: 0 }), () => service.cancel('two', session.sessionId)]) {
    assert.throws(operation, /session_not_found/);
  }
  answer(service, 'one', session);
  assert.equal(service.summary('two').attempts, 0);
  assert.deepEqual(service.export('two').events, []);
});
test('start resumes, advancement requires an answer, and next retries do not skip', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {});
  assert.equal(service.start('one', {}).sessionId, session.sessionId);
  assert.throws(() => service.next('one', session.sessionId, { position: 0 }), /answer_required/);
  answer(service, 'one', session);
  const end = service.next('one', session.sessionId, { position: 0 });
  assert.equal(end.closed, true);
  assert.deepEqual(service.next('one', session.sessionId, { position: 0 }), end);
  assert.notEqual(service.start('one', {}).sessionId, session.sessionId);
});
test('retirement blocks scoring mid-session without deleting historical receipts', t => {
  const { service } = setup(t); const catalog = published(); service.importCatalog(catalog);
  const one = service.start('one', {}), two = service.start('two', {});
  const receipt = answer(service, 'one', one);
  service.importCatalog(retireQuestion(catalog, version));
  assert.equal(service.session('two', two.sessionId).blocked, 'question_no_longer_published');
  assert.throws(() => answer(service, 'two', two), /question_no_longer_published/);
  assert.deepEqual(answer(service, 'one', one), receipt);
  assert.equal(service.summary('one').attempts, 1);
  service.cancel('two', two.sessionId);
  assert.throws(() => service.start('two', {}), /no_published_questions/);
});
test('catalog import preserves source versions, question content, reviews and history', t => {
  const { service } = setup(t); const catalog = published(); service.importCatalog(catalog);
  for (const change of [c => { c.sources[0].title = 'changed'; }, c => { c.questions[0].stem = 'changed'; },
    c => { c.questions = []; }, c => { c.questions[0].reviews[0].notes = 'changed'; }]) {
    const modified = structuredClone(catalog); change(modified);
    assert.throws(() => service.importCatalog(modified), /immutable/);
    assert.deepEqual(service.catalog(), catalog);
  }
});
test('bookmarks and incorrect-latest queues are learner-scoped and recover after correct retry', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {});
  answer(service, 'one', session, { optionId: 'copies' });
  service.bookmark('one', { questionVersionId: version, bookmarked: true });
  assert.equal(service.questions('one', 'incorrect').length, 1);
  assert.equal(service.questions('two', 'bookmarks').length, 0);
  service.next('one', session.sessionId, { position: 0 });
  const repeat = service.start('one', { filter: 'incorrect' });
  answer(service, 'one', repeat, { requestId: 'retry-learning' });
  assert.equal(service.questions('one', 'incorrect').length, 0);
  assert.equal(service.questions('one', 'bookmarks').length, 1);
});
test('two database connections agree on active sessions, retries and committed evidence', t => {
  const { service, path } = setup(t); service.importCatalog(published());
  const second = new StudyService(path);
  try {
    const session = service.start('one', {});
    assert.equal(second.start('one', {}).sessionId, session.sessionId);
    const receipt = answer(service, 'one', session);
    assert.deepEqual(answer(second, 'one', session), receipt);
    assert.equal(second.summary('one').attempts, 1);
  } finally { second.close(); }
});
test('restart recovers credentials, session, bookmarks, receipt and event projection', t => {
  const directory = mkdtempSync(join(tmpdir(), 'mlos-restart-test-')), path = join(directory, 'study.sqlite');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  let service = new StudyService(path); service.importCatalog(published());
  const token = service.provision('one'), session = service.start('one', {});
  const receipt = answer(service, 'one', session);
  service.bookmark('one', { questionVersionId: version, bookmarked: true });
  service.close(); service = new StudyService(path);
  try {
    assert.equal(service.authenticate(token), 'one');
    assert.equal(service.start('one', {}).sessionId, session.sessionId);
    assert.deepEqual(service.session('one', session.sessionId).receipt, receipt);
    assert.equal(service.export('one').bookmarks.length, 1);
    assert.equal(service.summary('one').accuracy, 1);
  } finally { service.close(); }
});
test('failed database writes roll back; identical request can safely retry', t => {
  const { service } = setup(t); service.importCatalog(published());
  const session = service.start('one', {});
  service.db.exec("CREATE TRIGGER fail_attempt BEFORE INSERT ON attempts BEGIN SELECT RAISE(ABORT, 'test_write_failure'); END");
  assert.throws(() => answer(service, 'one', session), /test_write_failure/);
  assert.equal(service.summary('one').attempts, 0);
  assert.equal(service.session('one', session.sessionId).receipt, null);
  service.db.exec('DROP TRIGGER fail_attempt');
  assert.equal(answer(service, 'one', session).event.correct, true);
});
test('unknown database versions are rejected rather than reset', t => {
  const { path } = setup(t);
  const db = new DatabaseSync(path); db.exec('PRAGMA user_version=99'); db.close();
  assert.throws(() => new StudyService(path), /Unsupported database/);
  const check = new DatabaseSync(path);
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 99); check.close();
});
test('HTTP enforces authorization, origin, body contracts, learner isolation and safe retries', async t => {
  const { service } = setup(t); service.importCatalog(published());
  const one = service.provision('one'), two = service.provision('two');
  const server = createStudyApi(service);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, { token = one, body, headers = {}, method } = {}) => {
      const response = await fetch(base + path, { method: method || (body === undefined ? 'GET' : 'POST'), headers: {
        Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers,
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json(), headers: response.headers };
    };
    assert.equal((await request('/api/progress', { token: '' })).status, 401);
    assert.equal((await request('/api/progress', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await request('/api/progress?learnerId=two')).status, 400);
    assert.equal((await request('/api/sessions', { body: { learnerId: 'two' } })).status, 400);
    assert.equal((await request('/api/sessions', { body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 415);
    const session = (await request('/api/sessions', { body: {} })).body;
    assert.equal(session.question.answerOptionId, undefined);
    assert.equal((await request(`/api/sessions/${session.sessionId}`, { token: two })).status, 404);
    const submit = () => request(`/api/sessions/${session.sessionId}/answer`, { body: { requestId: 'http-1', position: 0, optionId: 'same-id' } });
    const [a, b] = await Promise.all([submit(), submit()]);
    assert.equal(a.status, 200); assert.deepEqual(a.body, b.body);
    assert.equal((await request('/api/progress')).body.attempts, 1);
    assert.equal((await request('/api/progress', { token: two })).body.attempts, 0);
    assert.equal((await request('/api/export')).headers.get('cache-control'), 'no-store');
    assert.equal((await request('/api/credentials', { body: {} })).status, 404);
    assert.equal((await request(`/api/sessions/${session.sessionId}/cancel`, { body: 1 })).status, 400);
    assert.equal((await request('/api/sessions', { body: { padding: 'x'.repeat(9000) } })).status, 413);
    const malformed = await fetch(base + '/api/sessions', { method: 'POST', headers: { Authorization: `Bearer ${one}`, 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(malformed.status, 400);
    service.db.exec("CREATE TRIGGER fail_bookmark BEFORE INSERT ON bookmarks BEGIN SELECT RAISE(ABORT, 'private_database_detail'); END");
    const failed = await request('/api/bookmarks', { body: { questionVersionId: version, bookmarked: true } });
    assert.equal(failed.status, 500); assert.deepEqual(failed.body, { error: 'internal_error' });
    assert.deepEqual(service.export('one').bookmarks, []);
    service.revokeLearner('one');
    assert.equal((await request('/api/export')).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
