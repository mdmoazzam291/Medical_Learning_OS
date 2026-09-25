import { randomUUID } from 'node:crypto';
import { selectPublishedQuestions, toLearnerQuestion, validateCatalog } from '../domain/content.js';
import { summarizeAttempts, validateAttempt } from '../domain/learning-events.js';
import { ServiceError, fields } from './study-service.js';

const fail = (status, code) => { throw new ServiceError(status, code); };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier = value => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) fail(400, 'invalid_identifier');
  return value;
};
const check = ({ data, error }) => {
  if (error) fail(503, 'cloud_storage_unavailable');
  return data;
};
const rpcErrors = {
  session_not_found: 404, conflicting_retry: 409, stale_session: 409,
  answer_already_recorded: 409, answer_required: 409, catalog_changed: 409,
};

// Trusted server adapter. The client must use a server-only service-role key;
// public browser credentials cannot mutate these tables or call the RPCs.
export class CloudStudyService {
  constructor({ client, catalog, clock = Date.now }) {
    if (!client || typeof catalog !== 'function') throw new Error('Cloud client and catalog are required');
    this.client = client;
    this.readCatalog = catalog;
    this.clock = clock;
  }
  async snapshot() {
    const snapshot = await this.readCatalog();
    if (!Number.isSafeInteger(snapshot?.version)) fail(503, 'cloud_catalog_unavailable');
    return { version: snapshot.version, body: validateCatalog(snapshot.body) };
  }
  async rows(table, columns, learner, order) {
    const result = [];
    for (let offset = 0;; offset += 500) {
      const page = check(await this.client.from(table).select(columns)
        .eq('learner_id', learner).order(order).order('id', { ascending: true })
        .range(offset, offset + 499));
      result.push(...page);
      if (page.length < 500) return result;
    }
  }
  async rpc(name, arguments_) {
    const result = check(await this.client.rpc(name, arguments_));
    if (result?.error) fail(rpcErrors[result.error] || 500, rpcErrors[result.error] ? result.error : 'internal_error');
    if (!result || typeof result !== 'object') fail(503, 'cloud_storage_unavailable');
    return result;
  }
  async events(learner) {
    return (await this.rows('study_attempts', 'id,event', learner, 'recorded_at')).map(row => row.event);
  }
  async summary(learner) { return summarizeAttempts(await this.events(learner), learner); }
  async export(learner) {
    const [events, bookmarks, sessions] = await Promise.all([
      this.events(learner), this.bookmarks(learner),
      this.rows('study_sessions', 'id,position,closed,question_version_ids', learner, 'created_at'),
    ]);
    return { schemaVersion: 1, scope: 'server-study', learnerId: learner, events,
      bookmarks, sessions: sessions.map(row => ({ id: row.id, position: row.position,
        closed: row.closed, questionVersionIds: row.question_version_ids })) };
  }
  async bookmarks(learner) {
    const result = [];
    for (let offset = 0;; offset += 500) {
      const page = check(await this.client.from('study_bookmarks').select('question_version_id')
        .eq('learner_id', learner).order('question_version_id').range(offset, offset + 499));
      result.push(...page.map(row => row.question_version_id));
      if (page.length < 500) return result;
    }
  }
  async questions(learner, filter = 'all') {
    if (!['all', 'incorrect', 'bookmarks'].includes(filter)) fail(400, 'invalid_filter');
    let questions = selectPublishedQuestions((await this.snapshot()).body);
    if (filter === 'bookmarks') {
      const ids = new Set(await this.bookmarks(learner));
      questions = questions.filter(q => ids.has(q.questionVersionId));
    }
    if (filter === 'incorrect') {
      const latest = new Map((await this.events(learner)).map(e => [e.questionVersionId, e.correct]));
      questions = questions.filter(q => latest.get(q.questionVersionId) === false);
    }
    return questions.map(toLearnerQuestion);
  }
  async bookmark(learner, input) {
    fields(input, ['questionVersionId', 'bookmarked']);
    if (typeof input.bookmarked !== 'boolean') fail(400, 'invalid_bookmark');
    identifier(input.questionVersionId);
    if (input.bookmarked && !(await this.questions(learner)).some(q => q.questionVersionId === input.questionVersionId))
      fail(404, 'question_not_available');
    if (input.bookmarked) check(await this.client.from('study_bookmarks').upsert({
      learner_id: learner, question_version_id: input.questionVersionId,
    }, { onConflict: 'learner_id,question_version_id' }));
    else check(await this.client.from('study_bookmarks').delete().eq('learner_id', learner)
      .eq('question_version_id', input.questionVersionId));
    return { ...input };
  }
  async ownedSession(learner, id) {
    if (!uuid.test(id || '')) fail(404, 'session_not_found');
    const row = check(await this.client.from('study_sessions')
      .select('id,position,closed,question_version_ids,question_started_at')
      .eq('id', id).eq('learner_id', learner).maybeSingle());
    if (!row) fail(404, 'session_not_found');
    return row;
  }
  async session(learner, id) {
    const row = await this.ownedSession(learner, id), ids = row.question_version_ids;
    const result = { sessionId: id, position: row.position, total: ids.length,
      closed: row.closed, question: null, receipt: null };
    if (row.closed) return result;
    const q = (await this.questions(learner)).find(q => q.questionVersionId === ids[row.position]);
    const attempt = check(await this.client.from('study_attempts').select('receipt')
      .eq('session_id', id).eq('learner_id', learner).eq('position', row.position).maybeSingle());
    if (!q) return { ...result, blocked: 'question_no_longer_published', receipt: attempt?.receipt || null };
    return { ...result, question: q, receipt: attempt?.receipt || null };
  }
  async start(learner, input) {
    fields(input, [], ['limit', 'filter']);
    const limit = input.limit ?? 15;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'invalid_limit');
    const existing = check(await this.client.from('study_sessions').select('id')
      .eq('learner_id', learner).eq('closed', false).maybeSingle());
    if (existing) return this.session(learner, existing.id);
    const ids = (await this.questions(learner, input.filter)).slice(0, limit).map(q => q.questionVersionId);
    if (!ids.length) fail(409, 'no_published_questions');
    const result = await this.rpc('study_start_session', { p_learner: learner, p_id: randomUUID(),
      p_ids: ids, p_started: new Date(this.clock()).toISOString() });
    return this.session(learner, result.id);
  }
  async answer(learner, id, input) {
    fields(input, ['requestId', 'position', 'optionId']);
    identifier(input.requestId); identifier(input.optionId);
    if (!Number.isInteger(input.position) || input.position < 0) fail(400, 'invalid_position');
    const row = await this.ownedSession(learner, id);
    const retry = check(await this.client.from('study_attempts')
      .select('session_id,position,option_id,receipt').eq('learner_id', learner)
      .eq('request_key', input.requestId).maybeSingle());
    if (retry) {
      if (retry.session_id !== id || retry.position !== input.position || retry.option_id !== input.optionId)
        fail(409, 'conflicting_retry');
      return retry.receipt;
    }
    if (row.closed || row.position !== input.position) fail(409, 'stale_session');
    const version = row.question_version_ids[row.position], snapshot = await this.snapshot(), catalog = snapshot.body;
    const q = selectPublishedQuestions(catalog).find(q => q.questionVersionId === version);
    if (!q) fail(409, 'question_no_longer_published');
    if (!q.options.some(option => option.optionId === input.optionId)) fail(400, 'invalid_option');
    const now = this.clock();
    const event = validateAttempt({ schemaVersion: 1, type: 'question.answered', eventId: randomUUID(),
      learnerId: learner, questionVersionId: version, conceptId: q.conceptLinks.find(l => l.role === 'primary').conceptId,
      occurredAt: new Date(now).toISOString(), correct: q.answerOptionId === input.optionId,
      durationMs: Math.max(0, now - new Date(row.question_started_at).getTime()) });
    const receipt = { event, catalogVersion: snapshot.version, selectedOptionId: input.optionId, answerOptionId: q.answerOptionId,
      explanation: q.explanation, sources: catalog.sources.filter(s => q.sourceIds.includes(s.sourceId))
        .map(({ sourceId, title, url, version: sourceVersion }) => ({ sourceId, title, url, version: sourceVersion })) };
    const saved = await this.rpc('study_record_attempt', { p_learner: learner, p_session: id,
      p_request_key: input.requestId, p_position: input.position, p_option: input.optionId,
      p_event: event, p_receipt: receipt });
    return saved.receipt;
  }
  async next(learner, id, input) {
    fields(input, ['position']);
    if (!Number.isInteger(input.position) || input.position < 0) fail(400, 'invalid_position');
    if (!uuid.test(id || '')) fail(404, 'session_not_found');
    await this.rpc('study_advance_session', { p_learner: learner, p_session: id,
      p_position: input.position, p_started: new Date(this.clock()).toISOString() });
    return this.session(learner, id);
  }
  async cancel(learner, id) {
    if (!uuid.test(id || '')) fail(404, 'session_not_found');
    await this.rpc('study_cancel_session', { p_learner: learner, p_session: id });
    return this.session(learner, id);
  }
}
