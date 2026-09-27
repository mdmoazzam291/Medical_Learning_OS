export const NEURAL_NOTE_SCHEMA_VERSION = 1;
export const MAX_PERSONAL_NOTE_BYTES = 20000;

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
