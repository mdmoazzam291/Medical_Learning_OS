import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRecoveryEvidence } from '../src/domain/operational-recovery.js';

test('owner recovery projection retains only observed workflow receipts', () => {
  const info = summarizeRecoveryEvidence({ r2: {
    backup: { status: 'healthy', updatedAt: '2026-10-12T05:00:00Z', runStatus: 'completed', conclusion: 'success', htmlUrl:'https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/123' },
    storageAudit: { status: 'degraded', updatedAt: '2026-10-12T06:00:00Z', runStatus: 'completed', conclusion: 'failure' },
    restoreDrill: { status: 'unavailable' }
  } });
  assert.equal(info.rows.length, 3);
  assert.equal(info.observedCount, 2);
  assert.equal(info.completeness, 'partial_or_unknown');
  assert.equal(info.recoveryVerified, false);
  assert.equal(info.rows[0].url,'https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/123');
  assert.equal(info.rows[2].time,null);
});

test('successful workflows are never labeled proof of restorable backups', () => {
  const x={status:'healthy',updatedAt:'2026-10-12T05:00:00Z',conclusion:'success',runStatus:'completed'};
  const r=summarizeRecoveryEvidence({r2:{backup:x,storageAudit:x,restoreDrill:x}});
  assert.equal(r.completeness, 'timestamps_observed');
  assert.equal(r.recoveryVerified,false);
  assert.equal(r.rows.every(y=>y.status==='healthy'),true);
});

test('no injected URL can become an owner link', () => {
  for (const bad of ['javascript:alert(1)','https://github.com/other/repo/actions/runs/123','https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/123?redirect=elsewhere']) {
    const a=summarizeRecoveryEvidence({r2:{backup:{status:'healthy',htmlUrl:bad}}});
    assert.equal(a.rows[0].url,null);
  }
});
