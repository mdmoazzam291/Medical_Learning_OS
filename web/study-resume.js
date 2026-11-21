// Device-local memory of the learner's unfinished study session, for the phone resume bar
// (ADR-155). Stores only ids and position; no question content or answers.
import { nextResumeRecord } from '/src/domain/phone-navigation.js';
const KEY = 'mlos-study-resume-v1';
export function readStudyResume() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function syncStudyResume({ userId, session, summaryShown = false }) {
  try {
    const previous = readStudyResume();
    const next = nextResumeRecord(previous, { userId, session, summaryShown });
    if (next === previous) return;
    if (next) localStorage.setItem(KEY, JSON.stringify(next)); else localStorage.removeItem(KEY);
  } catch { /* Optional device memory. */ }
}
export function clearStudyResume() { try { localStorage.removeItem(KEY); } catch { /* Optional device memory. */ } }
