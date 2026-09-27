import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const assist = () => JSON.parse(readFileSync(
  new URL('../data/content-review-assist.json', import.meta.url),
  'utf8'
));
const pilot = () => JSON.parse(readFileSync(
  new URL('../data/content-intake-pilot-rabies-01.json', import.meta.url),
  'utf8'
));

test('review assist covers every rabies pilot question without becoming review authority', () => {
  const packet = assist();
  const candidate = pilot();
  assert.equal(packet.assistType, 'ai_source_preflight');
  assert.equal(packet.authority, 'none');
  assert.equal(packet.policy.mayApproveReviewGate, false);
  assert.equal(packet.policy.mayVerifyContent, false);
  assert.equal(packet.policy.mayPublishContent, false);
  assert.equal(packet.policy.requiresIndependentReviewerDecision, true);

  const covered = new Set(packet.questions.map(item => item.questionVersionId));
  assert.equal(covered.size, candidate.questions.length);
  for (const question of candidate.questions) {
    assert.ok(covered.has(question.questionVersionId));
  }
});

test('review assist keeps source evidence tied to canonical NRCP sources and conservative rights recommendation', () => {
  const packet = assist();
  assert.equal(packet.sourceEvidence.length, 2);
  for (const source of packet.sourceEvidence) {
    assert.match(source.sourceUrl, /^https:\/\/rabiesfreeindia\.mohfw\.gov\.in\//);
    assert.match(source.rightsBasisUrl, /^https:\/\/rabiesfreeindia\.mohfw\.gov\.in\/copyright-policy$/);
    assert.equal(source.rightsRecommendation, 'citation_only');
    assert.match(source.rightsBasisSummary, /source/i);
  }
});

test('each question preflight separates medical, references and rights observations', () => {
  const packet = assist();
  for (const item of packet.questions) {
    assert.ok(item.medical?.result);
    assert.ok(item.medical?.summary);
    assert.ok(item.references?.result);
    assert.ok(item.references?.summary);
    assert.ok(Array.isArray(item.references?.sourceIds));
    assert.ok(item.rights?.result);
    assert.ok(item.rights?.summary);
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
});

test('category III pilot item carries its wording caveat instead of hiding uncertainty', () => {
  const packet = assist();
  const item = packet.questions.find(q =>
    q.questionVersionId === 'infectious:rabies:category-iii-rig-infiltration@1'
  );
  assert.equal(item.medical.result, 'supported_with_wording_note');
  assert.match(item.medical.summary, /wound washing/i);
});
