// Lexical matcher: imported question → most specific NMC concept in the question's subject (ADR-150).
// Pure functions; no I/O. A question gets a concept only when one candidate clearly wins; otherwise it is
// "needs-review" with its top candidates. Never guesses.
export const MATCHER_VERSION = 'lexical-nmc-v1';

// External subject label → controlled NMC subject ID. Unmapped labels (Dental, Unknown) are excluded.
export const SUBJECT_MAP = Object.freeze({
  'Anaesthesia': 'anaesthesia', 'Anatomy': 'anatomy', 'Biochemistry': 'biochemistry', 'ENT': 'ent',
  'Forensic Medicine': 'forensic-medicine', 'Gynaecology & Obstetrics': 'obstetrics-gynaecology', 'Medicine': 'medicine',
  'Microbiology': 'microbiology', 'Ophthalmology': 'ophthalmology', 'Orthopaedics': 'orthopaedics', 'Pathology': 'pathology',
  'Pediatrics': 'pediatrics', 'Pharmacology': 'pharmacology', 'Physiology': 'physiology', 'Psychiatry': 'psychiatry',
  'Radiology': 'radiology', 'Skin': 'dermatology', 'Social & Preventive Medicine': 'community-medicine', 'Surgery': 'surgery'
});

// Field weights: what the question asks (stem) counts most; the keyed answer next; topic tag and explanation least.
const WEIGHTS = Object.freeze({ stem: 3, answer: 2, topic: 2, explanation: 1 });
const MIN_SCORE = 3;     // at least one stem-level hit
const MIN_MARGIN = 1.5;  // winner must clearly beat the runner-up

// Names too generic to identify a concept on their own.
const GENERIC = new Set(['anatomy', 'physiology', 'biochemistry', 'pathology', 'pharmacology', 'microbiology', 'medicine', 'surgery',
  'pediatrics', 'paediatrics', 'psychiatry', 'radiology', 'dermatology', 'ophthalmology', 'orthopaedics', 'ent', 'introduction',
  'general', 'basics', 'overview', 'principles', 'disease', 'diseases', 'drugs', 'disorders', 'syndrome', 'infection', 'infections',
  'treatment', 'management', 'diagnosis', 'investigations', 'history', 'examination', 'cells', 'tissue', 'blood', 'body']);

export const normalize = text => ` ${String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`]s\b/g, 's').replace(/[^a-z0-9]+/g, ' ').trim()} `;

export function buildConceptIndex(concepts) {
  const entries = [];
  for (const c of concepts) {
    if (typeof c?.conceptId !== 'string' || !Array.isArray(c.subjects)) continue;
    const names = [...new Set([c.label, ...(c.aliases || [])].filter(n => typeof n === 'string').map(normalize))];
    for (const name of names) {
      const tokens = name.trim().split(' ').filter(Boolean);
      if (!tokens.length || (tokens.length === 1 && (tokens[0].length < 4 || GENERIC.has(tokens[0])))) continue;
      entries.push({ conceptId: c.conceptId, label: c.label, subjects: new Set(c.subjects), name, tokens: tokens.length });
    }
  }
  return entries;
}

export function matchQuestion({ subjectLabel, stem, answer, explanation, topic }, index) {
  const subjectId = SUBJECT_MAP[subjectLabel];
  if (!subjectId) return { status: 'excluded', subjectId: null, conceptId: null, confidence: null, candidates: [], reason: 'subject-not-mapped' };
  const fields = { stem: normalize(stem), answer: normalize(answer), topic: normalize(topic), explanation: normalize(explanation) };
  const scores = new Map();
  for (const e of index) {
    if (!e.subjects.has(subjectId)) continue;
    let best = 0, fieldsHit = 0;
    for (const [field, text] of Object.entries(fields)) {
      if (!text.includes(e.name)) continue;
      fieldsHit++;
      best = Math.max(best, WEIGHTS[field] * (1 + 0.5 * (e.tokens - 1)));
    }
    if (!best) continue;
    const score = best + 0.5 * (fieldsHit - 1);
    const prev = scores.get(e.conceptId);
    if (!prev || score > prev.score) scores.set(e.conceptId, { conceptId: e.conceptId, label: e.label, score, matchedName: e.name.trim() });
  }
  const sorted = [...scores.values()].sort((a, b) => b.score - a.score || a.conceptId.localeCompare(b.conceptId));
  // A name contained in a stronger candidate's matched name ("brachial plexus" inside "brachial plexus injuries")
  // is the same text, not a competitor: the more specific concept wins.
  const ranked = sorted.filter((c, i) => !sorted.slice(0, i).some(s => s.matchedName !== c.matchedName && ` ${s.matchedName} `.includes(` ${c.matchedName} `)));
  const candidates = ranked.slice(0, 3).map(c => ({ conceptId: c.conceptId, label: c.label, score: +c.score.toFixed(2), matchedName: c.matchedName }));
  const [top, second] = ranked;
  if (!top || top.score < MIN_SCORE || (second && top.score - second.score < MIN_MARGIN)) {
    return { status: 'needs-review', subjectId, conceptId: null, confidence: null, candidates, reason: !top ? 'no-candidate' : top.score < MIN_SCORE ? 'weak-match' : 'close-runner-up' };
  }
  return { status: 'matched', subjectId, conceptId: top.conceptId, confidence: +(top.score / (top.score + (second?.score || 0))).toFixed(3), candidates, reason: null };
}
