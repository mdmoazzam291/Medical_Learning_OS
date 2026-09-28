export const NEURAL_NOTE_SCHEMA_VERSION = 1;
export const MAX_PERSONAL_NOTE_BYTES = 20000;
export const PERSONAL_CORRECTION_TARGET_TYPES = Object.freeze(['canonical_note', 'question_version']);

const encoder = new TextEncoder();

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required`);
  return value;
}

export function validateConceptId(value) {
  requiredText(value, 'conceptId');
  if (!/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value)) {
    throw new TypeError('Invalid conceptId');
  }
  return value;
}

export function validatePersonalNoteBody(value) {
  requiredText(value, 'bodyMarkdown');
  if (encoder.encode(value).byteLength > MAX_PERSONAL_NOTE_BYTES) {
    throw new TypeError('Personal note is too large');
  }
  return value;
}

export function createPersonalAnnotation({
  annotationId,
  conceptId,
  bodyMarkdown,
  anchorNoteVersionId = null,
  revision = 1
}) {
  requiredText(annotationId, 'annotationId');
  validateConceptId(conceptId);
  validatePersonalNoteBody(bodyMarkdown);
  if (anchorNoteVersionId !== null) requiredText(anchorNoteVersionId, 'anchorNoteVersionId');
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError('Invalid revision');

  return Object.freeze({
    schemaVersion: NEURAL_NOTE_SCHEMA_VERSION,
    annotationId,
    conceptId,
    bodyMarkdown,
    anchorNoteVersionId,
    revision
  });
}

export function createPersonalCorrection({
  annotationId,
  conceptId,
  bodyMarkdown,
  targetType,
  targetId,
  targetSha256,
  revision = 1
}) {
  requiredText(annotationId, 'annotationId');
  validateConceptId(conceptId);
  validatePersonalNoteBody(bodyMarkdown);
  if (!PERSONAL_CORRECTION_TARGET_TYPES.includes(targetType)) {
    throw new TypeError('Invalid correction targetType');
  }
  requiredText(targetId, 'targetId');
  if (!/^[a-zA-Z0-9:_@.\-]{1,180}$/.test(targetId)) {
    throw new TypeError('Invalid correction targetId');
  }
  if (typeof targetSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(targetSha256)) {
    throw new TypeError('Invalid correction targetSha256');
  }
  if (!Number.isSafeInteger(revision) || revision < 1) throw new TypeError('Invalid revision');

  return Object.freeze({
    schemaVersion: NEURAL_NOTE_SCHEMA_VERSION,
    annotationKind: 'correction',
    annotationId,
    conceptId,
    bodyMarkdown,
    targetType,
    targetId,
    targetSha256,
    revision,
    canonicalAuthority: false
  });
}

export function resolveAnnotationAgainstCanonical(annotation, canonicalNote) {
  const note = createPersonalAnnotation(annotation);
  if (!canonicalNote) {
    return Object.freeze({
      annotation: note,
      canonicalNote: null,
      anchorState: note.anchorNoteVersionId ? 'anchor-unavailable' : 'unanchored'
    });
  }
  validateConceptId(canonicalNote.conceptId);
  if (canonicalNote.conceptId !== note.conceptId) {
    throw new TypeError('Canonical note concept mismatch');
  }
  return Object.freeze({
    annotation: note,
    canonicalNote,
    anchorState: note.anchorNoteVersionId === canonicalNote.noteVersionId
      ? 'current'
      : note.anchorNoteVersionId
        ? 'canonical-updated'
        : 'unanchored'
  });
}
