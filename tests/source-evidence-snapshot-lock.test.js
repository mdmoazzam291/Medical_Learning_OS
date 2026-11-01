import test from 'node:test';
import assert from 'node:assert/strict';
import {exportSourceEvidenceSnapshot} from '../scripts/lib/source-evidence-sql-snapshot.js';
import {digestCanonical} from '../src/domain/canonical-integrity.js';

const tables=['authority','source_policy','packages','revisions','cases','requests','events','withdrawals'];
const empty=()=>Object.fromEntries(tables.map(t=>[t,'[]']));

test('export waits for writer lock then captures all tables in one fresh statement',async()=>{
 const calls=[];
 let lockStarted,releaseLock;
 const waiting=new Promise(resolve=>{lockStarted=resolve;});
 const lockHeld=new Promise(resolve=>{releaseLock=resolve;});
 let committed=false;
 const db={
  async exec(sql){
   calls.push(sql);
   if(sql==='select pg_advisory_xact_lock(730031)'){
    lockStarted();await lockHeld;
   }
  },
  async query(sql){
   calls.push(sql);
   assert.equal(committed,true,'export must not read before writer commit');
   assert.equal(sql.startsWith('select '),true);
   assert.equal((sql.match(/from evidence_probe\./g)||[]).length,8,
    'all eight table views must share one statement snapshot');
   for(const name of tables)assert.match(sql,new RegExp('from evidence_probe\\.'+name+' t\\) as '+name));
   return {rows:[{...empty(),withdrawals:'[{"version":1}]'}]};
  }
 };
 const pending=exportSourceEvidenceSnapshot(db);
 await waiting;
 assert.deepEqual(calls,[
  'begin isolation level read committed','select pg_advisory_xact_lock(730031)'
 ]);
 committed=true;releaseLock();
 const snapshot=await pending;
 assert.equal(snapshot.tables.withdrawals,'[{"version":1}]');
 assert.deepEqual(Object.keys(snapshot.tables),tables);
 const {snapshotDigest,...body}=snapshot;
 assert.equal(snapshotDigest,(await digestCanonical(body)).digestHex);
 assert.equal(calls.filter(s=>s.startsWith('select (')).length,1);
 assert.equal(calls.at(-1),'commit');
});

test('snapshot export fails closed and rolls back on missing or malformed table projections',async()=>{
 for(const bad of [null,{}, {authority:[]}, {...empty(),requests:null}]){
  const calls=[];
  const db={
   async exec(sql){calls.push(sql);},
   async query(sql){calls.push(sql);return {rows:bad===null?[]:[bad]};}
  };
  await assert.rejects(exportSourceEvidenceSnapshot(db),/evidence_snapshot_invalid/);
  assert.deepEqual(calls.slice(0,2),[
   'begin isolation level read committed','select pg_advisory_xact_lock(730031)'
  ]);
  assert.equal(calls.at(-1),'rollback');
  assert.equal(calls.includes('commit'),false);
 }
});
