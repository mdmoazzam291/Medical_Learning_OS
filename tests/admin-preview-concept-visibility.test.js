import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminPreviewOnlyConceptIds } from '../src/domain/content-library.js';

const q = (status, ...conceptIds) => ({ status, conceptLinks: conceptIds.map((conceptId, i) => ({ conceptId, role: i ? 'secondary' : 'primary' })) });

test('concepts reached only through Admin-preview questions are hidden', () => {
  const catalog = { questions: [q('admin_preview', 'C-a', 'C-b'), q('published', 'C-b'), q('in_review', 'C-c'), q('admin_preview', 'C-d')] };
  assert.deepEqual([...adminPreviewOnlyConceptIds(catalog)].sort(), ['C-a', 'C-d']);
});

test('a published canonical note makes a preview-only concept visible', () => {
  const catalog = { questions: [q('admin_preview', 'C-a'), q('admin_preview', 'C-d')] };
  assert.deepEqual([...adminPreviewOnlyConceptIds(catalog, { publishedNoteConceptIds: ['C-d'] })], ['C-a']);
});

test('concepts without any question link (existing catalogue concepts) stay visible', () => {
  assert.equal(adminPreviewOnlyConceptIds({ questions: [] }).size, 0);
  assert.equal(adminPreviewOnlyConceptIds(null).size, 0);
  assert.equal(adminPreviewOnlyConceptIds({ questions: [null, { status: 'admin_preview' }] }).size, 0);
});

test('study-api applies the rule to Vault list, search and detail, checking Admin only when needed', () => {
  const src = readFileSync(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(src, /import \{ adminPreviewOnlyConceptIds \} from "\.\.\/\.\.\/\.\.\/src\/domain\/content-library\.js";/);
  assert.match(src, /return hidden\.size && !\(await isContentAdmin\(\)\) \? hidden : new Set<string>\(\);/);
  assert.equal((src.match(/const hiddenConcepts = await hiddenVaultConcepts\(catalog\.body, \[\.\.\.canonicalByConcept\.keys\(\)\]\);/g) || []).length, 2);
  assert.match(src, /\.filter\(\(concept: any\) => !hiddenConcepts\.has\(String\(concept\.conceptId\)\)\)/);
  assert.match(src, /if \(\(await hiddenVaultConcepts\(catalog\.body, canonical \? \[canonical\.concept_id\] : \[\]\)\)\.has\(conceptId\)\) fail\(404, "vault_concept_not_found"\);/);
});
