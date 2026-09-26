import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260926144550_add_citation_only_source_rights.sql', import.meta.url), 'utf8');

test('citation-only rights is a first-class non-reuse state', () => {
  assert.match(sql, /'citation_only'/);
  assert.match(sql, /rights_status in \('owned', 'licensed', 'public_domain', 'citation_only', 'restricted'\)/);
  assert.match(sql, /not in \('owned', 'licensed', 'public_domain', 'citation_only'\)/);
  assert.match(sql, /publication_rights_unresolved/);
  assert.match(sql, /rights_not_resolved/);
});
