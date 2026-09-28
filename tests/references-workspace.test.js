import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildReferencesWorkspace } from '../src/domain/references-workspace.js';
import { referencesPanel } from '../web/references-panel.js';

const pilot = JSON.parse(await readFile(new URL('../data/evaluations/source-grounding-cdc-co-v1.json', import.meta.url), 'utf8'));
const queue = value => value.questions.map(q => ({
  question: { questionVersionId: q.questionVersionId, conceptLinks: [{ role: 'primary', conceptId: q.primaryConceptId }] },
  sources: [{ sourceId: value.sourceSnapshot.sourceId, version: value.sourceSnapshot.registeredVersion }]
}));

test('CO pilot shows seven distinct claims, not seven-fold claim reuse', async () => {
  const result = await buildReferencesWorkspace(pilot, queue(pilot));
  assert.equal(result.uniqueClaimCount, 7);
  assert.equal(result.claimQuestionLinks, 7);
  assert.equal(result.questionCount, 7);
  assert.equal(result.publicationAuthority, false);
  assert.equal(result.claims.filter(g => g.questions[0].riskLane === 'expert').length, 2);
});

test('identical claims share an inspection card; changed content produces a different binding', async () => {
  const fixture = structuredClone(pilot);
  fixture.questions = [fixture.questions[0], { ...structuredClone(fixture.questions[0]), questionVersionId: 'synthetic:reuse@1' }];
  let result = await buildReferencesWorkspace(fixture, queue(fixture));
  assert.equal(result.uniqueClaimCount, 1);
  assert.equal(result.claims[0].questions.length, 2);
  const binding = result.claims[0].bindingDigest;
  fixture.questions[1].claims[0].statement += ' Changed scope.';
  result = await buildReferencesWorkspace(fixture, queue(fixture));
  assert.equal(result.uniqueClaimCount, 2);
  assert.equal(result.claims.filter(g => g.bindingDigest === binding).length, 1);
});

test('source drift, missing sources and concept drift withhold stale packets', async () => {
  for (const mutate of [item => item.sources[0].version = 'changed', item => item.sources = [], item => item.question.conceptLinks = []]) {
    const items = queue(pilot);
    mutate(items[0]);
    const result = await buildReferencesWorkspace(pilot, items);
    assert.equal(result.uniqueClaimCount, 6);
    assert.equal(result.unavailable.length, 1);
  }
  assert.equal((await buildReferencesWorkspace(pilot, [])).uniqueClaimCount, 0);
});

test('malformed evidence is rejected rather than rendered as trustworthy', async () => {
  const fixture = structuredClone(pilot);
  fixture.questions[0].claims[0].evidence[0].passageDigest = 'invalid';
  await assert.rejects(buildReferencesWorkspace(fixture, queue(fixture)), /passageDigest/);
});

test('renderer escapes source text and never adds shared approval controls', async () => {
  const result = await buildReferencesWorkspace(pilot, queue(pilot));
  result.claims[0].claim = { ...result.claims[0].claim, statement: '<img src=x onerror=alert(1)>' };
  const html = referencesPanel(result);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<form'));
  assert.match(html, /not human-verified/);
  assert.match(referencesPanel(null, 'failed'), /No prior packet is reused/);
});
