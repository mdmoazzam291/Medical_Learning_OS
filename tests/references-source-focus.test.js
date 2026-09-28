import test from 'node:test';
import assert from 'node:assert/strict';
import { referencesSourceFocus, filterReferencesBySource } from '../src/domain/references-source-focus.js';

const item = (id, sources, note = false) => ({
  [note ? 'note' : 'question']: { [note ? 'noteVersionId' : 'questionVersionId']: id },
  sources: sources.map(sourceId => ({ sourceId, version: '2026-09-29' }))
});

test('source inspection groups question and canonical-note targets without decisions', () => {
  const items = [item('q1', ['who']), item('q2', ['who', 'cdc']), item('n1', ['who'], true)];
  const groups = referencesSourceFocus(items);
  assert.deepEqual(groups.map(group => [group.source.sourceId, group.targetIds]), [
    ['who', ['n1', 'q1', 'q2']], ['cdc', ['q2']]
  ]);
  assert.deepEqual(filterReferencesBySource(items, 'who'), items);
  assert.deepEqual(filterReferencesBySource(items, 'cdc'), [items[1]]);
  assert.equal('decision' in groups[0], false);
  assert.equal('publicationAuthority' in groups[0], false);
});

test('invalid and missing source bindings do not become approval evidence', () => {
  assert.deepEqual(referencesSourceFocus([{}, item('q1', []), { question: { questionVersionId: 'q2' }, sources: [{ sourceId: 'who' }] }]), []);
  assert.throws(() => referencesSourceFocus({}), TypeError);
});
