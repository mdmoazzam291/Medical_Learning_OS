import { summarizeAttempts, validateAttempt } from './learning-events.js';

// Independent software walkthrough. Never published through the medical catalog.
export const demoQuestions = Object.freeze([
  { id: 'walkthrough:concept@1', conceptId: 'demo:canonical-concept', label: 'Shared concepts',
    stem: 'The same concept appears in Medicine and Pathology. How should the learning system connect it?',
    options: ['Use one shared concept ID', 'Create an unrelated copy for each subject'], answer: 0,
    explanation: 'A canonical concept ID connects evidence across subject views. QBank and future NeuralVault notes can reference the same identity.' },
  { id: 'walkthrough:evidence@1', conceptId: 'demo:evidence', label: 'Learning evidence',
    stem: 'You answer one question correctly. What can the system honestly report?',
    options: ['This concept is permanently mastered', 'One correct answer has been observed'], answer: 1,
    explanation: 'One correct answer is observed evidence. Durable mastery and retention need further evidence over time; accuracy alone does not establish them.' },
  { id: 'walkthrough:review@1', conceptId: 'demo:content-review', label: 'Content quality',
    stem: 'An AI-generated medical question has not been reviewed. Where does it belong?',
    options: ['In the published medical QBank', 'In the draft review workflow'], answer: 1,
    explanation: 'Draft content stays outside learner selection. This project requires recorded medical, reference and rights approvals before publication.' },
]);
const question = id => demoQuestions.find(q => q.id === id);
export function initialState(learnerId) {
  return { schemaVersion: 1, learnerId, settings: { targetDate: '2027-08-29', dailyGoal: 15, theme: 'light' }, events: [], bookmarks: [], session: null };
}
export function validateSettings(s) {
  if (!s || !['light', 'dark'].includes(s.theme) || !Number.isInteger(s.dailyGoal) || s.dailyGoal < 1 || s.dailyGoal > 200 ||
    typeof s.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.targetDate) ||
    !Number.isFinite(Date.parse(s.targetDate)) || new Date(s.targetDate).toISOString().slice(0, 10) !== s.targetDate) throw new Error('Invalid study settings');
  return s;
}
export function validateState(s) {
  if (!s || s.schemaVersion !== 1 || typeof s.learnerId !== 'string' || !s.learnerId || !Array.isArray(s.events) || !Array.isArray(s.bookmarks)) throw new Error('Unsupported saved data');
  validateSettings(s.settings);
  summarizeAttempts(s.events, s.learnerId);
  if (new Set(s.events.map(e => e.eventId)).size !== s.events.length || s.events.some(e => e.learnerId !== s.learnerId || !question(e.questionVersionId) || question(e.questionVersionId).conceptId !== e.conceptId)) throw new Error('Invalid demo ledger');
  if (new Set(s.bookmarks).size !== s.bookmarks.length || s.bookmarks.some(id => !question(id))) throw new Error('Invalid bookmarks');
  const session = s.session;
  if (session !== null) {
    if (!session || typeof session.id !== 'string' || !session.id || !Array.isArray(session.questionIds) || !session.questionIds.length ||
      new Set(session.questionIds).size !== session.questionIds.length || session.questionIds.some(id => !question(id)) ||
      !Number.isInteger(session.index) || session.index < 0 || session.index > session.questionIds.length ||
      !Number.isFinite(session.startedAt) || !Number.isInteger(session.elapsedMs) || session.elapsedMs < 0 ||
      (session.selected !== null && ![0, 1].includes(session.selected))) throw new Error('Invalid saved session');
    for (let i = 0; i < session.index; i++) if (!s.events.some(e => e.eventId === `${session.id}:${i}` && e.questionVersionId === session.questionIds[i])) throw new Error('Missing session evidence');
  }
  return s;
}
export function currentQuestion(s) { return s.session && question(s.session.questionIds[s.session.index]); }
export function currentAttempt(s) { return s.session && s.events.find(e => e.eventId === `${s.session.id}:${s.session.index}`); }
export function queue(s, filter = 'all') {
  if (filter === 'bookmarks') return demoQuestions.filter(q => s.bookmarks.includes(q.id));
  if (filter === 'incorrect') return demoQuestions.filter(q => s.events.findLast(e => e.questionVersionId === q.id)?.correct === false);
  return demoQuestions;
}
export function transition(input, action) {
  const s = structuredClone(validateState(input));
  const session = s.session;
  if (['select', 'answer', 'next', 'pause'].includes(action.type) &&
      (!session || action.sessionId !== session.id || action.index !== session.index)) throw new Error('Session changed in another tab. Reload to continue.');
  switch (action.type) {
    case 'settings': s.settings = { ...validateSettings(action.settings) }; break;
    case 'bookmark':
      if (!question(action.id)) throw new Error('Unknown question');
      s.bookmarks = s.bookmarks.includes(action.id) ? s.bookmarks.filter(id => id !== action.id) : [...s.bookmarks, action.id]; break;
    case 'start': {
      if (currentQuestion(s)) break; // Resume the active session instead of discarding it.
      const ids = queue(s, action.filter).map(q => q.id);
      if (!ids.length) throw new Error('There are no questions in this queue');
      if (typeof action.id !== 'string' || !action.id || s.events.some(e => e.eventId.startsWith(`${action.id}:`))) throw new Error('Use a new session ID');
      s.session = { id: action.id, questionIds: ids, index: 0, selected: null, startedAt: action.now, elapsedMs: 0 }; break;
    }
    case 'select':
      if (!currentQuestion(s) || currentAttempt(s)) throw new Error('This answer is already locked');
      if (![0, 1].includes(action.option)) throw new Error('Select an answer');
      session.selected = action.option; break;
    case 'answer': {
      if (currentAttempt(s)) break; // Idempotent submit, including two tabs.
      const q = currentQuestion(s);
      if (!q || session.selected === null) throw new Error('Select an answer first');
      s.events.push(validateAttempt({ schemaVersion: 1, type: 'question.answered', eventId: `${session.id}:${session.index}`,
        learnerId: s.learnerId, questionVersionId: q.id, conceptId: q.conceptId, occurredAt: new Date(action.now).toISOString(),
        correct: session.selected === q.answer, durationMs: session.elapsedMs + Math.max(0, action.now - session.startedAt) })); break;
    }
    case 'next':
      if (!currentAttempt(s)) throw new Error('Submit an answer first');
      session.index++; session.selected = null; session.startedAt = action.now; session.elapsedMs = 0; break;
    case 'pause':
      if (!currentAttempt(s)) session.elapsedMs += Math.max(0, action.now - session.startedAt);
      session.startedAt = action.now; break;
    case 'resume':
      if (session) session.startedAt = action.now; break;
    default: throw new Error('Unknown study action');
  }
  return validateState(s);
}
