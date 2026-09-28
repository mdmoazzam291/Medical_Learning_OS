import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSourceGroundedVerificationPacket,
  validateAtomicClaimCandidate,
  SOURCE_GROUNDED_VERIFICATION_ENUMS
} from '../src/domain/source-grounded-verification.js';

const digest = char => char.repeat(64);

const evidence = (overrides = {}) => ({
  sourceId: 'source:robbins',
  sourceVersion: '11e',
  authorityClass: 'standard_reference',
  rightsMode: 'licensed',
  locator: { chapter: 'Kidney', page: 923 },
  support: 'supports',
  passageDigest: digest('a'),
  note: null,
  ...overrides
});

const claim = (overrides = {}) => ({
  schemaVersion: 1,
  claimId: 'claim:mcd-lm',
  conceptId: 'concept:minimal-change-disease',
  claimType: 'foundational_fact',
  statement: 'Light microscopy may be essentially normal in minimal change disease.',
  context: {},
  riskClass: 'low',
  evidence: [
    evidence(),
    evidence({
      sourceId: 'source:nelson',
      sourceVersion: '22e',
      locator: { chapter: 'Nephrotic syndrome', page: 2710 },
      passageDigest: digest('b')
    })
  ],
  ...overrides
});

const check = (checkId = 'answer-key-integrity', status = 'pass') => ({
  checkId,
  status,
  detail: status === 'pass' ? 'Passed deterministic validation' : 'Needs review'
});

const input = (claims = [claim()], deterministicChecks = [check()]) => ({
  schemaVersion: 1,
  questionVersionId: 'q:mcd@1',
  primaryConceptId: 'concept:minimal-change-disease',
  claims,
  deterministicChecks
});

test('atomic claim candidates are deeply immutable and evidence-bound', () => {
  const raw = claim();
  const validated = validateAtomicClaimCandidate(raw);
  raw.evidence[0].locator.page = 1;
  assert.equal(validated.evidence[0].locator.page, 923);
  assert.throws(() => { validated.evidence[0].support = 'contradicts'; }, TypeError);
});

test('routine lane requires resolved, strongly supported low-risk evidence', async () => {
  const packet = await buildSourceGroundedVerificationPacket(input());
  assert.equal(packet.riskLane, 'routine');
  assert.deepEqual(packet.blockers, []);
  assert.deepEqual(packet.reviewFocus, []);
  assert.equal(packet.productionHumanReviewRequired, true);
  assert.equal(packet.publicationAuthority, false);
  assert.match(packet.targetDigest.digestHex, /^[0-9a-f]{64}$/);
});

test('citation-only and single-source evidence routes to focused human review', async () => {
  const oneSource = claim({
    evidence: [evidence({ rightsMode: 'citation_only' })]
  });
  const packet = await buildSourceGroundedVerificationPacket(input([oneSource]));
  assert.equal(packet.riskLane, 'focused');
  assert.deepEqual(packet.reviewFocus, ['references', 'rights']);
  assert.deepEqual(packet.blockers, []);
});

test('contradiction, missing support or unresolved rights routes to expert review', async () => {
  for (const source of [
    evidence({ support: 'contradicts' }),
    evidence({ support: 'not_found' }),
    evidence({ rightsMode: 'unknown' })
  ]) {
    const packet = await buildSourceGroundedVerificationPacket(input([
      claim({ evidence: [source] })
    ]));
    assert.equal(packet.riskLane, 'expert');
    assert.ok(packet.blockers.length > 0);
  }
});

test('current management claims require an appropriate current authority', async () => {
  const treatment = claim({
    claimId: 'claim:treatment',
    claimType: 'treatment_recommendation',
    riskClass: 'low'
  });
  let packet = await buildSourceGroundedVerificationPacket(input([treatment]));
  assert.equal(packet.riskLane, 'expert');
  assert.ok(packet.blockers.some(item => item.includes('required authority class missing')));

  treatment.evidence = [
    evidence({
      sourceId: 'source:guideline',
      sourceVersion: '2026',
      authorityClass: 'current_guideline',
      locator: { section: 'Treatment' },
      passageDigest: digest('c')
    }),
    evidence({
      sourceId: 'source:regulator',
      sourceVersion: '2026-01',
      authorityClass: 'regulator',
      locator: { section: 'Label' },
      passageDigest: digest('d')
    })
  ];
  packet = await buildSourceGroundedVerificationPacket(input([treatment]));
  assert.equal(packet.riskLane, 'routine');
});

test('high-risk clinical claims remain expert-routed even when supported', async () => {
  const highRisk = claim({
    riskClass: 'high',
    evidence: [
      evidence(),
      evidence({
        sourceId: 'source:nelson',
        sourceVersion: '22e',
        locator: { page: 2710 },
        passageDigest: digest('b')
      })
    ]
  });
  const packet = await buildSourceGroundedVerificationPacket(input([highRisk]));
  assert.equal(packet.riskLane, 'expert');
  assert.ok(packet.blockers.some(item => item.includes('high-risk medical claim')));
});

test('failed deterministic checks route to expert review without creating authority', async () => {
  const packet = await buildSourceGroundedVerificationPacket(input([claim()], [
    check('answer-key-integrity', 'fail')
  ]));
  assert.equal(packet.riskLane, 'expert');
  assert.equal(packet.publicationAuthority, false);
  assert.ok(packet.blockers.some(item => item.includes('deterministic check failed')));
});

test('packet digest changes when grounded evidence changes', async () => {
  const first = await buildSourceGroundedVerificationPacket(input());
  const changed = claim();
  changed.evidence[0].locator.page = 924;
  const second = await buildSourceGroundedVerificationPacket(input([changed]));
  assert.notEqual(first.targetDigest.digestHex, second.targetDigest.digestHex);
});

test('malformed or duplicate evidence fails closed', async () => {
  assert.throws(() => validateAtomicClaimCandidate(claim({
    evidence: [evidence(), evidence()]
  })), /Duplicate source evidence/);

  assert.throws(() => validateAtomicClaimCandidate(claim({
    evidence: [evidence({ passageDigest: 'bad' })]
  })), /passageDigest/);

  await assert.rejects(() => buildSourceGroundedVerificationPacket(input([
    claim({ conceptId: 'concept:other' })
  ])), /primary concept/);
});

test('historical exam answers and current medical recommendations remain distinct claim types', () => {
  assert.ok(SOURCE_GROUNDED_VERIFICATION_ENUMS.claimTypes.includes('historical_exam_answer'));
  assert.ok(SOURCE_GROUNDED_VERIFICATION_ENUMS.claimTypes.includes('treatment_recommendation'));
  assert.notEqual('historical_exam_answer', 'treatment_recommendation');
});
