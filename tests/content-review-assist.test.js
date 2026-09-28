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
  for (const question of candidate.questions) {
    assert.ok(covered.has(question.questionVersionId));
  }
});

test('review assist keeps source evidence tied to canonical NRCP sources and conservative rights recommendation', () => {
  const packet = assist();
  const nrcpSources = packet.sourceEvidence.filter(source =>
    source.sourceId.startsWith('nrcp:rabies')
  );
  assert.equal(nrcpSources.length, 2);
  for (const source of nrcpSources) {
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


test('review assist covers all 25 questions in infectious prevention pilot 02', () => {
  const packet = assist();
  const pilot02 = JSON.parse(readFileSync(
    new URL('../data/content-intake-pilot-infectious-prevention-02.json', import.meta.url),
    'utf8'
  ));
  const covered = new Map(packet.questions.map(item => [item.questionVersionId, item]));
  assert.equal(pilot02.questions.length, 25);
  for (const question of pilot02.questions) {
    const item = covered.get(question.questionVersionId);
    assert.ok(item, `missing assist for ${question.questionVersionId}`);
    for (const kind of ['medical', 'references', 'rights']) {
      assert.ok(item[kind]?.result);
      assert.ok(item[kind]?.summary);
      assert.ok(item[kind]?.draftNote);
    }
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
});

test('pilot 02 source assist covers five CDC sources with conservative editable rights drafts', () => {
  const packet = assist();
  const pilot02 = JSON.parse(readFileSync(new URL('../data/content-intake-pilot-infectious-prevention-02.json', import.meta.url), 'utf8'));
  const sourceIds = new Set(pilot02.sources.map(source => source.sourceId));
  const cdcSources = packet.sourceEvidence.filter(source => sourceIds.has(source.sourceId));
  assert.equal(cdcSources.length, 5);
  for (const source of cdcSources) {
    assert.match(source.sourceUrl, /^https:\/\/www\.cdc\.gov\//);
    assert.equal(source.rightsRecommendation, 'citation_only');
    assert.equal(source.rightsBasisUrl, 'https://www.cdc.gov/other/agencymaterials.html');
    assert.match(source.rightsBasisSummary, /public domain/i);
    assert.match(source.rightsBasisSummary, /third-party/i);
    assert.match(source.draftRightsEvidence, /factual grounding/i);
  }
});

test('multi-batch assist remains explicitly non-authoritative', () => {
  const packet = assist();
  assert.deepEqual(packet.scope.batchKeys, [
    'pilot:rabies:20260927:01',
    'pilot:infectious-prevention:20260927:02',
    'pilot:acute-medicine:20260928:03',
    'pilot:india-national-programs:20260928:05',
    'pilot:multimodal-breadth:20260928:06',
    'pilot:final-breadth:20260928:07',
    'connected-learning-08'
  ]);
  assert.equal(packet.scope.questionCount, 155);
  assert.equal(packet.authority, 'none');
  assert.equal(packet.policy.mayApproveReviewGate, false);
  assert.equal(packet.policy.mayVerifyContent, false);
  assert.equal(packet.policy.mayPublishContent, false);
  assert.equal(packet.policy.requiresIndependentReviewerDecision, true);
});


test('review assist covers all 25 India national-program pilot 05 questions', () => {
  const packet = assist();
  const pilot05 = JSON.parse(readFileSync(
    new URL('../data/content-intake-pilot-india-programs-05.json', import.meta.url), 'utf8'
  ));
  const covered = new Map(packet.questions.map(item => [item.questionVersionId, item]));
  for (const question of pilot05.questions) {
    const item = covered.get(question.questionVersionId);
    assert.ok(item, `missing assist for ${question.questionVersionId}`);
    assert.equal(item.medical?.result, 'supported');
    assert.equal(item.medical?.uncertainty, 'low');
    assert.equal(item.references?.result, 'direct_support');
    assert.equal(item.rights?.result, 'citation_only_recommended');
    assert.ok(item.medical?.draftNote && item.references?.draftNote && item.rights?.draftNote);
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
});


test('review assist covers all 25 multimodal breadth pilot 06 questions', () => {
  const packet = assist();
  const pilot06 = JSON.parse(readFileSync(
    new URL('../data/content-intake-pilot-multimodal-breadth-06.json', import.meta.url), 'utf8'
  ));
  const covered = new Map(packet.questions.map(item => [item.questionVersionId, item]));
  assert.equal(pilot06.questions.length, 25);
  for (const question of pilot06.questions) {
    const item = covered.get(question.questionVersionId);
    assert.ok(item, `missing assist for ${question.questionVersionId}`);
    assert.equal(item.medical?.result, 'supported');
    assert.equal(item.medical?.uncertainty, 'low');
    assert.equal(item.references?.result, 'direct_support');
    assert.match(item.rights?.result || '', /^(citation_only|public_domain)_recommended$/);
    assert.ok(item.medical?.draftNote && item.references?.draftNote && item.rights?.draftNote);
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
});


test('review assist covers all 49 final breadth pilot 07 questions', () => {
  const packet = assist();
  const pilot07 = JSON.parse(readFileSync(
    new URL('../data/content-intake-pilot-final-breadth-07.json', import.meta.url), 'utf8'
  ));
  const covered = new Map(packet.questions.map(item => [item.questionVersionId, item]));
  assert.equal(pilot07.questions.length, 49);
  for (const question of pilot07.questions) {
    const item = covered.get(question.questionVersionId);
    assert.ok(item, `missing assist for ${question.questionVersionId}`);
    assert.equal(item.medical?.result, 'supported');
    assert.equal(item.medical?.uncertainty, 'low');
    assert.equal(item.references?.result, 'direct_support');
    assert.match(item.rights?.result || '', /^(citation_only|public_domain)_recommended$/);
    assert.ok(item.medical?.draftNote && item.references?.draftNote && item.rights?.draftNote);
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
});

