// Equal editorial labels suggest a scope check, never an automatic identity merge.
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),directory=new URL('docs/evidence/',root);
const inventory=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./report-completion-gaps.js',import.meta.url))],{encoding:'utf8',maxBuffer:16*1024*1024}));
const references=new Map(inventory.rows.map(r=>[r.referenceId,r])),groups=new Map();
for(const name of readdirSync(directory).filter(x=>x.endsWith('-draft-tasks.json')).sort()){
 const packet=JSON.parse(readFileSync(new URL(name,directory),'utf8'));
 for(const row of packet.rows){
  if(typeof row.reviewLabel!=='string'||!row.reviewLabel.trim())continue;
  const key=row.reviewLabel.normalize('NFC').trim().toLowerCase();
  if(!groups.has(key))groups.set(key,{candidateGroupId:'nmc-scope-candidate:'+createHash('sha256').update(key).digest('hex'),label:row.reviewLabel.trim(),canonicalConceptId:null,identityEquivalence:'unverified',nextAction:'compare-semantic-scope-and-resolve-existing-canonical-identity',appearances:[]});
  const source=references.get(row.referenceId);
  if(!source)throw Error('unknown_candidate_reference');
  groups.get(key).appearances.push({referenceId:row.referenceId,code:row.code,subjectId:row.subjectId,pdfPage:row.page,draftLearningTask:row.draftLearningTask,mode:row.mode,proposedObjectives:source.proposedObjectives,packet:'docs/evidence/'+name});
 }
}
const candidates=[...groups.values()].filter(g=>new Set(g.appearances.map(r=>r.subjectId)).size>1);
for(const g of candidates){
 g.subjectIds=[...new Set(g.appearances.map(r=>r.subjectId))].sort();
 g.existingProposedConceptIds=[...new Set(g.appearances.flatMap(r=>r.proposedObjectives.map(o=>o.conceptId)))].sort();
 g.multipleProposedIdentities=g.existingProposedConceptIds.length>1;
 g.appearances.sort((a,b)=>a.subjectId.localeCompare(b.subjectId)||a.code.localeCompare(b.code,undefined,{numeric:true}));
}
candidates.sort((a,b)=>b.subjectIds.length-a.subjectIds.length||b.appearances.length-a.appearances.length||a.label.localeCompare(b.label));
console.log(JSON.stringify({schemaVersion:1,status:'editorial-scope-candidates',sourceEdition:inventory.sourceEdition,sourceSha256:inventory.sourceSha256,automaticMerging:false,productionRegistryChecked:false,coverageFraction:null,totals:{groups:candidates.length,sourceAppearances:candidates.reduce((n,g)=>n+g.appearances.length,0)},candidates},null,2));
