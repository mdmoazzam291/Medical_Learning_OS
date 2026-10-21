import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// SHA-256 of the exact single statement recorded for each historical version
// in Supabase migration history. Recovered 2026-10-21; no inferred SQL.
const recovered = [
  {
    "file": "20260925112056_study_state_v1.sql",
    "sha256": "b85ddd0626da15054c07686c87400347e151622357574f6fa1e45c42b4c3072f"
  },
  {
    "file": "20260925112441_study_attempt_session_fk_index.sql",
    "sha256": "fb7dc9bd7cf68937916a0edcce736b91dc2474ca0c7dbff0c1c4f821e58eb785"
  },
  {
    "file": "20260925113131_study_atomic_mutations.sql",
    "sha256": "a457d3a71093ac4a3a3cd7667c63d12ffe6c8894d7023c21041d3bb0cc2e733d"
  },
  {
    "file": "20260925114912_shared_study_catalog.sql",
    "sha256": "28457a3c9dc03f76ba28bec43d3be547dd7636f2bdba57a971b5ce3294fb1cc5"
  },
  {
    "file": "20260925115339_answer_catalog_version_gate.sql",
    "sha256": "6d0b7cd94688a8aebf71ff64275aaa36a6f3b026bab196978bb7790f72e21f2b"
  }
];
for (const {file,sha256} of recovered) {
  test('historical migration retains provider-recorded bytes: '+file, async () => {
    const bytes = await readFile(new URL('../supabase/migrations/'+file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);
  });
}
