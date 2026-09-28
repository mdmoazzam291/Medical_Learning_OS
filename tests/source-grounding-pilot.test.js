import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSourceGroundedVerificationPacket } from '../src/domain/source-grounded-verification.js';

const fixture = () => JSON.parse(readFileSync(
  new URL('../data/evaluations/source-grounding-cdc-co-v1.json', import.meta.url),
  'utf8'
));

test('real CDC CO grounding pilot binds seven questions to one exact source version', async () => {
  const pilot = fixture();

  assert.equal(pilot.schemaVersion, 1);
  assert.equal(pilot.sourceSnapshot.registeredVersion, pilot.sourceSnapshot.observedPageVersion);
  assert.ok(pilot.sourceSnapshot.sourceId.endsWith(pilot.sourceSnapshot.registeredVersion));
  assert.equal(pilot.questions.length, 7);

  const evidence = pilot.questions.flatMap(question =>
    question.claims.flatMap(claim => claim.evidence)
  );
  assert.equal(new Set(evidence.map(item => item.sourceId)).size, 1);
  assert.equal(new Set(evidence.map(item => item.sourceVersion)).size, 1);
  assert.equal(evidence[0].sourceId, pilot.sourceSnapshot.sourceId);
  assert.equal(evidence[0].sourceVersion, pilot.sourceSnapshot.registeredVersion);
  assert.equal(new Set(evidence.map(item => item.passageDigest)).size, 7);
});

test('real CDC CO grounding pilot routes supported claims without creating publication authority', async () => {
  const pilot = fixture();
  const packets = [];

  for (const question of pilot.questions) {
    const packet = await buildSourceGroundedVerificationPacket({
      schemaVersion: 1,
      questionVersionId: question.questionVersionId,
      primaryConceptId: question.primaryConceptId,
      claims: question.claims,
      deterministicChecks: pilot.deterministicChecks
    });

    assert.equal(packet.riskLane, question.expectedRiskLane);
    assert.equal(packet.productionHumanReviewRequired, true);
    assert.equal(packet.publicationAuthority, false);
    assert.match(packet.targetDigest.digestHex, /^[0-9a-f]{64}$/);
    packets.push(packet);
  }

  const counts = packets.reduce((result, packet) => {
    result[packet.riskLane] = (result[packet.riskLane] ?? 0) + 1;
    return result;
  }, {});

  assert.equal(counts.routine ?? 0, pilot.expectedMetrics.expectedRoutinePackets);
  assert.equal(counts.focused ?? 0, pilot.expectedMetrics.expectedFocusedPackets);
  assert.equal(counts.expert ?? 0, pilot.expectedMetrics.expectedExpertPackets);
  assert.equal(new Set(packets.map(packet => packet.targetDigest.digestHex)).size, packets.length);
});

test('the pilot demonstrates evidence reuse but does not claim measured reviewer-time savings', () => {
  const pilot = fixture();
  const sourceIds = pilot.questions.flatMap(question =>
    question.claims.flatMap(claim => claim.evidence.map(item => item.sourceId))
  );

  assert.equal(pilot.expectedMetrics.questionCount, 7);
  assert.equal(pilot.expectedMetrics.uniqueSourceCount, 1);
  assert.equal(pilot.expectedMetrics.exactClaimEvidenceBindings, 7);
  assert.equal(pilot.expectedMetrics.sourceReuseFactor, sourceIds.length / new Set(sourceIds).size);
  assert.equal(pilot.expectedMetrics.directSupportCoverage, 1);
  assert.equal(pilot.expectedMetrics.measuredReviewerTimeReduction, null);
  assert.equal(
    pilot.expectedMetrics.persistenceDecision,
    'defer_until_reviewer_time_and_correction_rate_are_measured'
  );
});
