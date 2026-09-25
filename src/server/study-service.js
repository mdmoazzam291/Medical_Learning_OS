import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateCatalog, selectPublishedQuestions, toLearnerQuestion } from '../domain/content.js';
import { validateAttempt, summarizeAttempts } from '../domain/learning-events.js';

export class ServiceError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fail = (status, code) => { throw new ServiceError(status, code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const parse = row => row && JSON.parse(row.body);
const emptyCatalog = { schemaVersion: 1, concepts: [], sources: [], questions: [] };
export function fields(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(k => !Object.hasOwn(value, k)) ||
    Object.keys(value).some(k => ![...required, ...optional].includes(k))) fail(400, 'invalid_fields');
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) fail(400, 'invalid_identifier');
  return value;
}

// Trusted, synchronous application boundary. The HTTP adapter resolves the
// learner from a bearer credential, never from a client-controlled learner ID.
export class StudyService {
  constructor(path, { clock = Date.now } = {}) {
    this.clock = clock;
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const version = this.db.prepare('PRAGMA user_version').get().user_version;
    if (![0, 1].includes(version)) { this.db.close(); throw new Error('Unsupported database version'); }
    if (version === 0) {
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE catalog (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL) STRICT;
        CREATE TABLE credentials (token_hash TEXT PRIMARY KEY, learner TEXT NOT NULL, expires INTEGER NOT NULL) STRICT;
        CREATE TABLE sessions (id TEXT PRIMARY KEY, learner TEXT NOT NULL, position INTEGER NOT NULL,
          started INTEGER NOT NULL, closed INTEGER NOT NULL CHECK(closed IN (0,1)), body TEXT NOT NULL) STRICT;
        CREATE UNIQUE INDEX active_learner_session ON sessions(learner) WHERE closed=0;
        CREATE TABLE attempts (id TEXT PRIMARY KEY, learner TEXT NOT NULL, request_key TEXT NOT NULL,
          session_id TEXT NOT NULL REFERENCES sessions(id), position INTEGER NOT NULL,
          option_id TEXT NOT NULL, body TEXT NOT NULL, receipt TEXT NOT NULL,
          UNIQUE(learner,request_key), UNIQUE(session_id,position)) STRICT;
        CREATE INDEX learner_attempts ON attempts(learner);
        CREATE TABLE bookmarks (learner TEXT NOT NULL, question_id TEXT NOT NULL,
          PRIMARY KEY(learner,question_id)) STRICT;
        PRAGMA user_version=1; COMMIT;`);
    }
  }
  close() { this.db.close(); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  catalog() { return validateCatalog(parse(this.db.prepare('SELECT body FROM catalog WHERE id=1').get()) || emptyCatalog); }
  importCatalog(input) {
    const next = validateCatalog(input);
    return this.transaction(() => {
      const previous = this.catalog();
      for (const source of previous.sources) {
        if (!isDeepStrictEqual(next.sources.find(s => s.sourceId === source.sourceId), source)) fail(409, 'source_history_is_immutable');
      }
      for (const old of previous.questions) {
        const q = next.questions.find(q => q.questionVersionId === old.questionVersionId);
        const content = ({ status, reviews, publishedAt, ...rest }) => rest;
        if (!q || !isDeepStrictEqual(content(old), content(q)) ||
          old.reviews.some(r => !q.reviews.some(n => isDeepStrictEqual(n, r))) ||
          (old.publishedAt !== null && old.publishedAt !== q.publishedAt) ||
          ['draft', 'in_review', 'verified', 'published', 'retired'].indexOf(q.status) < ['draft', 'in_review', 'verified', 'published', 'retired'].indexOf(old.status)) fail(409, 'question_history_is_immutable');
      }
      for (const concept of previous.concepts) if (!next.concepts.some(c => c.conceptId === concept.conceptId)) fail(409, 'concept_history_required');
      this.db.prepare('INSERT INTO catalog VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(JSON.stringify(next));
      return { published: selectPublishedQuestions(next).length };
    });
  }
  provision(learner, ttlMs = 7 * 86400000) {
    identifier(learner);
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > 30 * 86400000) fail(400, 'invalid_credential_lifetime');
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO credentials VALUES(?,?,?)').run(hash(token), learner, this.clock() + ttlMs);
    return token;
  }
  authenticate(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) fail(401, 'unauthorized');
    const credential = this.db.prepare('SELECT learner, expires FROM credentials WHERE token_hash=?').get(hash(token));
    if (!credential || credential.expires <= this.clock()) fail(401, 'unauthorized');
    return credential.learner;
  }
  revokeLearner(learner) { this.db.prepare('DELETE FROM credentials WHERE learner=?').run(identifier(learner)); }
  events(learner) { return this.db.prepare('SELECT body FROM attempts WHERE learner=? ORDER BY rowid').all(learner).map(parse); }
  summary(learner) { return summarizeAttempts(this.events(learner), learner); }
  export(learner) {
    return { schemaVersion: 1, scope: 'server-study', learnerId: learner, events: this.events(learner),
      bookmarks: this.db.prepare('SELECT question_id FROM bookmarks WHERE learner=? ORDER BY question_id').all(learner).map(r => r.question_id),
      sessions: this.db.prepare('SELECT id, position, closed, body FROM sessions WHERE learner=? ORDER BY rowid').all(learner).map(r => ({ id: r.id, position: r.position, closed: Boolean(r.closed), questionVersionIds: JSON.parse(r.body) })) };
  }
  questions(learner, filter = 'all') {
    if (!['all', 'incorrect', 'bookmarks'].includes(filter)) fail(400, 'invalid_filter');
    let questions = selectPublishedQuestions(this.catalog());
    if (filter === 'bookmarks') {
      const ids = this.db.prepare('SELECT question_id FROM bookmarks WHERE learner=?').all(learner).map(r => r.question_id);
      questions = questions.filter(q => ids.includes(q.questionVersionId));
    }
    if (filter === 'incorrect') {
      const latest = new Map(this.events(learner).map(e => [e.questionVersionId, e.correct]));
      questions = questions.filter(q => latest.get(q.questionVersionId) === false);
    }
    return questions.map(toLearnerQuestion);
  }
  bookmark(learner, input) {
    fields(input, ['questionVersionId', 'bookmarked']);
    if (typeof input.bookmarked !== 'boolean') fail(400, 'invalid_bookmark');
    identifier(input.questionVersionId);
    if (input.bookmarked && !this.questions(learner).some(q => q.questionVersionId === input.questionVersionId)) fail(404, 'question_not_available');
    if (input.bookmarked) this.db.prepare('INSERT OR IGNORE INTO bookmarks VALUES(?,?)').run(learner, input.questionVersionId);
    else this.db.prepare('DELETE FROM bookmarks WHERE learner=? AND question_id=?').run(learner, input.questionVersionId);
    return { ...input };
  }
  ownedSession(learner, id) {
    identifier(id);
    const session = this.db.prepare('SELECT * FROM sessions WHERE id=? AND learner=?').get(id, learner);
    if (!session) fail(404, 'session_not_found');
    return session;
  }
  session(learner, id) {
    const session = this.ownedSession(learner, id), ids = JSON.parse(session.body);
    const result = { sessionId: id, position: session.position, total: ids.length, closed: Boolean(session.closed), question: null, receipt: null };
    if (session.closed) return result;
    const q = this.questions(learner).find(q => q.questionVersionId === ids[session.position]);
    const receipt = this.db.prepare('SELECT receipt FROM attempts WHERE session_id=? AND position=?').get(id, session.position);
    if (!q) return { ...result, blocked: 'question_no_longer_published', receipt: receipt ? JSON.parse(receipt.receipt) : null };
    return { ...result, question: q, receipt: receipt ? JSON.parse(receipt.receipt) : null };
  }
  start(learner, input) {
    fields(input, [], ['limit', 'filter']);
    const limit = input.limit ?? 15;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'invalid_limit');
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT id FROM sessions WHERE learner=? AND closed=0').get(learner);
      if (existing) return this.session(learner, existing.id);
      const ids = this.questions(learner, input.filter).slice(0, limit).map(q => q.questionVersionId);
      if (!ids.length) fail(409, 'no_published_questions');
      const id = randomUUID();
      this.db.prepare('INSERT INTO sessions VALUES(?,?,0,?,0,?)').run(id, learner, this.clock(), JSON.stringify(ids));
      return this.session(learner, id);
    });
  }
  answer(learner, id, input) {
    fields(input, ['requestId', 'position', 'optionId']);
    identifier(input.requestId); identifier(input.optionId);
    if (!Number.isInteger(input.position) || input.position < 0) fail(400, 'invalid_position');
    return this.transaction(() => {
      const session = this.ownedSession(learner, id);
      const retry = this.db.prepare('SELECT * FROM attempts WHERE learner=? AND request_key=?').get(learner, input.requestId);
      if (retry) {
        if (retry.session_id !== id || retry.position !== input.position || retry.option_id !== input.optionId) fail(409, 'conflicting_retry');
        return JSON.parse(retry.receipt);
      }
      if (session.closed || session.position !== input.position) fail(409, 'stale_session');
      if (this.db.prepare('SELECT id FROM attempts WHERE session_id=? AND position=?').get(id, input.position)) fail(409, 'answer_already_recorded');
      const version = JSON.parse(session.body)[session.position];
      const catalog = this.catalog();
      const q = selectPublishedQuestions(catalog).find(q => q.questionVersionId === version);
      if (!q) fail(409, 'question_no_longer_published');
      if (!q.options.some(o => o.optionId === input.optionId)) fail(400, 'invalid_option');
      const now = this.clock();
      const event = validateAttempt({ schemaVersion: 1, type: 'question.answered', eventId: randomUUID(), learnerId: learner,
        questionVersionId: version, conceptId: q.conceptLinks.find(l => l.role === 'primary').conceptId,
        occurredAt: new Date(now).toISOString(), correct: q.answerOptionId === input.optionId, durationMs: Math.max(0, now - session.started) });
      const receipt = { event, selectedOptionId: input.optionId, answerOptionId: q.answerOptionId, explanation: q.explanation,
        sources: catalog.sources.filter(s => q.sourceIds.includes(s.sourceId)).map(({ sourceId, title, url, version }) => ({ sourceId, title, url, version })) };
      this.db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)').run(event.eventId, learner, input.requestId, id, input.position, input.optionId, JSON.stringify(event), JSON.stringify(receipt));
      return receipt;
    });
  }
  next(learner, id, input) {
    fields(input, ['position']);
    if (!Number.isInteger(input.position) || input.position < 0) fail(400, 'invalid_position');
    return this.transaction(() => {
      const session = this.ownedSession(learner, id);
      // Retrying a successful advancement returns current state without skipping.
      if (session.position === input.position + 1) return this.session(learner, id);
      if (session.closed || session.position !== input.position) fail(409, 'stale_session');
      if (!this.db.prepare('SELECT id FROM attempts WHERE session_id=? AND position=?').get(id, input.position)) fail(409, 'answer_required');
      const position = session.position + 1, closed = Number(position === JSON.parse(session.body).length);
      this.db.prepare('UPDATE sessions SET position=?,closed=?,started=? WHERE id=?').run(position, closed, this.clock(), id);
      return this.session(learner, id);
    });
  }
  cancel(learner, id) {
    this.ownedSession(learner, id);
    this.db.prepare('UPDATE sessions SET closed=1 WHERE id=? AND learner=?').run(id, learner);
    return this.session(learner, id);
  }
}
