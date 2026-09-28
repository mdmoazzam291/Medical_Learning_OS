import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../web/vault.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../web/vault.js', import.meta.url), 'utf8');

test('NeuralVault page is authenticated and concept-centered', () => {
  assert.match(html, /NeuralVault/);
  assert.match(source, /createSupabaseAuth/);
  assert.match(source, /cloud\.vaultConcepts\(\)/);
  assert.match(source, /cloud\.vaultConcept\(conceptId\)/);
  assert.match(source, /selectedConceptId/);
});

test('canonical content and personal annotations are rendered as separate layers', () => {
  assert.match(source, /CANONICAL NOTE/);
  assert.match(source, /PERSONAL ANNOTATIONS/);
  assert.match(source, /Your layer stays yours/);
  assert.match(source, /canonical-updated|anchorNoteVersionId/);
});

test('NeuralVault UI supports create, revision-safe update and delete', () => {
  assert.match(source, /createVaultAnnotation/);
  assert.match(source, /updateVaultAnnotation/);
  assert.match(source, /data-revision/);
  assert.match(source, /deleteVaultAnnotation/);
  assert.match(source, /neural_annotation_revision_conflict/);
});

test('personal note text is escaped before HTML rendering', () => {
  assert.match(source, /escape\(annotation\.bodyMarkdown\)/);
  assert.match(source, /escape\(note\.bodyMarkdown\)/);
});


test('NeuralVault UI supports authenticated search and update-aware anchor messaging', () => {
  assert.match(source, /vault-search-form/);
  assert.match(source, /cloud\.vaultSearch\(query\)/);
  assert.match(source, /clear-search/);
  assert.match(source, /Canonical note updated since this annotation/);
  assert.match(source, /Anchored canonical version is unavailable/);
});


test('NeuralVault startup honors exact concept deep links', () => {
  assert.match(source, /const initialParams = new URLSearchParams\(location\.search\)/);
  assert.match(source, /const initialConceptId = initialParams\.get\('concept'\)/);
  assert.match(source, /reloadVault\(initialConceptId\)/);
});


test('production static server exposes NeuralVault HTML and module assets', async () => {
  const serverSource = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');
  assert.match(serverSource, /'web\/vault\.html'/);
  assert.match(serverSource, /'web\/vault\.js'/);
});


test('NeuralVault renders only allowlisted Study Now arrival context for the exact concept', () => {
  assert.match(source, /allowedEntryReasons = new Set\(\['mistake-repair', 'due-revision', 'new-learning'\]\)/);
  assert.match(source, /initialParams\.get\('from'\) === 'study-now'/);
  assert.match(source, /entry\.conceptId !== state\.selectedConceptId/);
  assert.match(source, /STUDY NOW HANDOFF/);
  assert.match(source, /This handoff is context only/);
  assert.match(source, /does not change your score, note content, mastery state, or revision schedule/);
});


test('NeuralVault renders learner-private corrections beside canonical content rather than replacing it', () => {
  assert.match(source, /MY CORRECTION · PRIVATE/);
  assert.match(source, /Private overlay\. Canonical stays canonical/);
  assert.match(source, /Canonical content remains visible and unchanged/);
  assert.match(source, /createVaultCorrection/);
  assert.match(source, /Save private correction/);
  assert.match(source, /canonical-updated/);
  assert.match(source, /question-retired/);
  assert.match(source, /target-unavailable/);
});

test('NeuralVault reports possible canonical errors without implicitly sharing private correction text', () => {
  assert.match(source, /Report possible canonical error/);
  assert.match(source, /Include my private correction text in this report/);
  assert.match(source, /shareCorrection/);
  assert.match(source, /correctionAnnotationId: shareCorrection \? correctionAnnotationId : null/);
  assert.match(source, /canonical content, your score, mastery, or another learner/);
});

test('QBank deep-link correction target is allowlisted and concept-bound', () => {
  assert.match(source, /allowedCorrectionTargetTypes = new Set\(\['canonical_note', 'question_version'\]\)/);
  assert.match(source, /deepLink\.conceptId === state\.selectedConceptId/);
  assert.match(source, /correctionTargetType/);
  assert.match(source, /correctionTargetId/);
});
