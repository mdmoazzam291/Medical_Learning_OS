import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

function run(mutate) {
 const root=mkdtempSync(join(tmpdir(),'nmc-parent-scope-'));
 try {
  mkdirSync(join(root,'ops/nmc'),{recursive:true});mkdirSync(join(root,'docs/evidence'),{recursive:true});
  writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
  const script=join(root,'ops/nmc/report-parent-scope-assessments.js');copyFileSync(new URL('../ops/nmc/report-parent-scope-assessments.js',import.meta.url),script);
  const write=(name,data)=>writeFileSync(join(root,'docs/evidence',name),JSON.stringify(data));
  const flags={clinicalApproval:false,learnerActivation:false,automaticMerging:false,productionRegistryChecked:false,canonicalIdentityAllocation:false,officialSourceRechecked:false};
  const names=['synthetic observation','synthetic mixed scope'].map((nameKey,i)=>({nameKey,name:nameKey,appearances:[{referenceId:String(i),subjectId:'synthetic',code:'S'+i,pdfPage:1,packet:'docs/evidence/synthetic-tasks.json'}]}));
  const indexText=JSON.stringify({names});writeFileSync(join(root,'docs/evidence/2026-11-08-nmc-foundation-names-only-index.json'),indexText);
  const hash=createHash('sha256').update(indexText).digest('hex');
  write('2026-11-08-nmc-unassessed-parent-reuse-triage.json',{matches:[]});
  for(let i=1;i<=12;i++)write(`2026-11-08-nmc-compound-name-components-batch-${String(i).padStart(2,'0')}.json`,{rows:[]});
  write('synthetic-tasks.json',{rows:names.map((n,i)=>({referenceId:String(i),subjectId:'synthetic',code:'S'+i,page:1,rowBBox:[0,0,1,1],sourceBodySha256:'a'.repeat(64),draftLearningTask:'synthetic source task '+i,mode:i===0?'performance-and-knowledge':'knowledge'}))});
  write('2026-11-08-nmc-parent-scope-decisions-batch-01.json',{schemaVersion:1,status:'names-only-parent-scope-decisions',...flags,sourceIndexSha256:hash,selectionLimit:2,rows:[{parentNameKey:names[0].nameKey,scopeDisposition:'scoped-task-facet'},{parentNameKey:names[1].nameKey,scopeDisposition:'mixed-scope-pending'}]});
  const result=spawnSync(process.execPath,[script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const packet=JSON.parse(result.stdout);
  if(!mutate)return packet;mutate(packet);write('2026-11-08-nmc-parent-scope-assessments-batch-01.json',packet);
  return spawnSync(process.execPath,[script,'--verify'],{encoding:'utf8'});
 } finally {rmSync(root,{recursive:true,force:true});}
}

test('parent scope triage preserves source modes and leaves mixed scope unresolved',()=>{
 const p=run();assert.equal(p.rows.length,2);assert.equal(p.rows[0].sourceTasks[0].mode,'performance-and-knowledge');
 assert.equal(p.rows[1].scopeDisposition,'mixed-scope-pending');assert.equal(p.rows[1].scopeComplete,false);
 assert.equal(p.totals.untouchedParentNames,0);assert.equal(p.rows[0].canonicalConceptId,null);
});
for(const [name,mutate] of [
 ['changed source evidence',p=>{p.rows[0].sourceTasks[0].sourceBodySha256='b'.repeat(64);}],
 ['forged scope completion',p=>{p.rows[1].scopeComplete=true;}],
 ['omitted rows with adjusted totals',p=>{p.rows=[];p.totals=Object.fromEntries(Object.keys(p.totals).map(k=>[k,0]));}]
])test(`parent scope verification rejects ${name}`,()=>{const r=run(mutate);assert.notEqual(r.status,0);assert.match(r.stderr,/parent scope projection differs from evidence/);});
