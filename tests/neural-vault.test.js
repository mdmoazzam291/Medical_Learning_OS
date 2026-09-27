import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PERSONAL_NOTE_BYTES,
  createPersonalAnnotation,
  resolveAnnotationAgainstCanonical,
  validateConceptId,
  validatePersonalNoteBody
} from '../src/domain/neural-vault.js';

test('personal annotations bind to canonical concept identity rather than a subject copy', () => {
  const note = createPersonalAnnotation({
    annotationId: '11111111-1111-4111-8111-111111111111',
    conceptId: 'emergency:anaphylaxis:first-line-treatment',
    bodyMarkdown: 'Recall IM epinephrine first.'
  });
  assert.equal(note.conceptId, 'emergency:anaphylaxis:first-line-treatment');
  assert.equal(note.anchorNoteVersionId, null);
  assert.ok(Object.isFrozen(note));
});

test('annotation survives canonical note update and exposes stale anchor explicitly', () => {
  const annotation = {
    annotationId: '11111111-1111-4111-8111-111111111111',
    conceptId: 'c:1',
    bodyMarkdown: 'My note',
    anchorNoteVersionId: 'old-version',
    revision: 2
  };
  const resolved = resolveAnnotationAgainstCanonical(annotation, {
    conceptId: 'c:1',
    noteVersionId: 'new-version'
  });
  assert.equal(resolved.anchorState, 'canonical-updated');
  assert.equal(resolved.annotation.bodyMarkdown, 'My note');
});

test('concept IDs remain strict and note size is bounded', () => {
  assert.equal(validateConceptId('medicine:cardiology:acs'), 'medicine:cardiology:acs');
  assert.throws(() => validateConceptId('bad concept'), TypeError);
  assert.doesNotThrow(() => validatePersonalNoteBody('x'.repeat(100)));
  assert.throws(() => validatePersonalNoteBody('x'.repeat(MAX_PERSONAL_NOTE_BYTES + 1)), TypeError);
});
