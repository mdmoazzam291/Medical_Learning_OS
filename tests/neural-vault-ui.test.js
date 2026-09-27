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
