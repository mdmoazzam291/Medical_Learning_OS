import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEARNER_CODE_ALPHABET, LEARNER_CODE_CONTRACT, validAuthUserId,
  generateLearnerCode, normalizeLearnerCode, allocateLearnerCode
} from '../ops/prototypes/learner-identity/learner-code.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const randomFill = value => length => new Uint8Array(length).fill(value);

function testStorage() {
  const byUser = new Map(), byCode = new Map(), writes = [];
  return {
    byUser, byCode, writes,
    async readByAuthUserId(authUserId) {
      const learnerCode = byUser.get(authUserId);
      return learnerCode ? {authUserId, learnerCode} : null;
    },
    async tryInsert({authUserId, learnerCode}) {
      writes.push({authUserId, learnerCode});
      if (byUser.has(authUserId)) return {status:'existing'};
      if (byCode.has(learnerCode)) return {status:'code_collision'};
      byUser.set(authUserId, learnerCode);
      byCode.set(learnerCode, authUserId);
      return {status:'inserted'};
    }
  };
}

test('learner code contract is 80 bits of CSPRNG alphabet, no ambiguous symbols', () => {
  assert.equal(LEARNER_CODE_CONTRACT, 'learner-code-v1');
  assert.equal(LEARNER_CODE_ALPHABET.length, 32);
  assert.equal(new Set(LEARNER_CODE_ALPHABET).size, 32);
  for (const c of ['I','L','O','U']) assert.ok(!LEARNER_CODE_ALPHABET.includes(c));
  const seq = length => Uint8Array.from({length}, (_, i) => i);
  assert.equal(generateLearnerCode(seq), 'ML-0123-4567-89AB-CDEF');
  assert.equal(generateLearnerCode(randomFill(31)), 'ML-ZZZZ-ZZZZ-ZZZZ-ZZZZ');
  assert.equal(generateLearnerCode(randomFill(32)), 'ML-0000-0000-0000-0000');
});

test('normalize code only accepts canonical or exactly compact ASCII, never metadata or tokens', () => {
  assert.equal(normalizeLearnerCode('ml-0123-4567-89ab-cdef'), 'ML-0123-4567-89AB-CDEF');
  assert.equal(normalizeLearnerCode('ml0123456789abcdef'), 'ML-0123-4567-89AB-CDEF');
  for (const bad of ['ML-0123-4567-89AB-CDEO', 'ML-0123-4567-89AB-CDEI', 'ML-0123-4567-89AB-CDEL',
    'ML-0123-4567-89AB-CDEU','ML-01234-567-89AB-CDEF','ML-0123-4567-89AB-CDEF ','ML%2D0123456789ABCDEF',
    'ML-0123-4567-89AB-CDEF/abc','ML-0000-0000-0000-0000?token=x',null,0,{},'']) {
    assert.throws(()=>normalizeLearnerCode(bad),/learner_code_invalid/);
  }
});

test('CSPRNG missing/invalid cannot silently fall back to Math.random or invented codes', () => {
  assert.throws(()=>generateLearnerCode(null),/secure_random_unavailable/);
  assert.throws(()=>generateLearnerCode(()=>[]),/secure_random_invalid/);
  assert.throws(()=>generateLearnerCode(()=>new Uint8Array(15)),/secure_random_invalid/);
  assert.throws(()=>generateLearnerCode(()=>new Uint8Array(17)),/secure_random_invalid/);
});

test('canonical UUID is mandatory; learner code never replaces authentication identity', () => {
  assert.equal(validAuthUserId(ALICE),true);
  assert.equal(validAuthUserId(ALICE.toUpperCase()),true);
  assert.equal(validAuthUserId('00000000-0000-0000-0000-000000000000'),false);
  assert.equal(validAuthUserId('user@example.test'),false);
  assert.equal(validAuthUserId('ML-0000-0000-0000-0000'),false);
  assert.equal(validAuthUserId(null),false);
});

test('first issuance returns only committed readback; same UUID is immutable/idempotent', async()=>{
  const store=testStorage();
  const first=await allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:randomFill(0)});
  assert.deepEqual(first,{authUserId:ALICE,learnerCode:'ML-0000-0000-0000-0000'});
  const second=await allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:()=>{
    throw Error('must not generate after already assigned');
  }});
  assert.deepEqual(second,first);
  assert.equal(store.writes.length,1);
});

test('two simultaneous first requests for same UUID converge on one persisted code', async()=>{
  const store=testStorage();
  const [a,b]=await Promise.all([
    allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:randomFill(2)}),
    allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:randomFill(3)})
  ]);
  assert.deepEqual(a,b);
  assert.equal(store.byUser.size,1);
  assert.equal(store.byCode.size,1);
});

test('code collision on a different UUID retries without returning other learner identity', async()=>{
  const store=testStorage();
  const first=await allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:randomFill(0)});
  let n=0;
  const second=await allocateLearnerCode({authUserId:BOB,storage:store,randomBytes:len=>
    new Uint8Array(len).fill(n++===0?0:1)});
  assert.notEqual(second.learnerCode,first.learnerCode);
  assert.equal(second.authUserId,BOB);
  assert.equal(store.byCode.get(first.learnerCode),ALICE);
  assert.equal(store.writes.length,3);
});

test('exhausted code collisions fail closed with no second identity issued',async()=>{
  const store=testStorage();
  await allocateLearnerCode({authUserId:ALICE,storage:store,randomBytes:randomFill(0)});
  await assert.rejects(()=>allocateLearnerCode({authUserId:BOB,storage:store,randomBytes:randomFill(0)}),/allocation_exhausted/);
  assert.equal(store.byUser.has(BOB),false);
});

test('ambiguous/unconfirmed insert, missing readback and database failures never claim success',async()=>{
  const none=async()=>null;
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,randomBytes:randomFill(0),
    storage:{readByAuthUserId:none,tryInsert:async()=>({status:'inserted'})}}),/readback_missing/);
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,randomBytes:randomFill(0),
    storage:{readByAuthUserId:none,tryInsert:async()=>({status:'unverified'})}}),/write_unconfirmed/);
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,randomBytes:randomFill(0),
    storage:{readByAuthUserId:none,tryInsert:async()=>{throw Error('database permission denied')}}}),/permission denied/);
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,randomBytes:randomFill(0),
    storage:{readByAuthUserId:async()=>({authUserId:BOB,learnerCode:'ML-0000-0000-0000-0000'}),tryInsert:async()=>({status:'inserted'})}}),/readback_invalid/);
});

test('unexpected persisted code or changed code is rejected, not recomputed',async()=>{
  let reads=0;
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,randomBytes:randomFill(0),storage:{
    readByAuthUserId:async()=>{
      reads++;
      return reads===1?null:{authUserId:ALICE,learnerCode:'ML-1111-1111-1111-1111'};
    },
    tryInsert:async()=>({status:'inserted'})
  }}),/write_mismatch/);
  await assert.rejects(()=>allocateLearnerCode({authUserId:ALICE,storage:{
    readByAuthUserId:async()=>({authUserId:ALICE,learnerCode:'ml-1111-1111-1111-1111'}),
    tryInsert:async()=>({status:'existing'})
  }}),/readback_noncanonical/);
});

test('API remains offline: no auth role, public route, serial sequence or production mutation',async()=>{
  const {readFileSync}=await import('node:fs');
  const file=readFileSync(new URL('../ops/prototypes/learner-identity/learner-code.js',import.meta.url),'utf8');
  const publicSurface=readFileSync(new URL('../scripts/public-surface.js',import.meta.url),'utf8');
  assert.doesNotMatch(publicSurface,/ops\/prototypes\/learner-identity\/learner-code/);
  assert.doesNotMatch(file,/service_role|auth\.admin|create\s+table|ALTER\s+TABLE|Math\.random|setTimeout/i);
  assert.ok(!file.includes('getUserById'));
});
