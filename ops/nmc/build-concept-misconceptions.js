// Builds data/nmc-concept-misconceptions.json from authored files keyed by registry concept names.
// Usage: node ops/nmc/build-concept-misconceptions.js [--write]   reads ops/nmc/misconceptions/*.json
// Input entries: {c: concept name, m: wrong belief, fix: correction, k: authoring kind, gs?: guideline-sensitive}
// The ID is a hash of concept and wording, so rewording a misconception gives it a new ID.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateConceptMisconceptions,MISCONCEPTION_KINDS} from '../../src/domain/nmc-concept-misconceptions.js';
const KIND={confusion:'confusion',classification:'confusion',reversed:'reversed',overgeneralisation:'overgeneralisation',mechanism:'mechanism',
 investigation:'test-interpretation',criteria:'test-interpretation',threshold:'test-interpretation',
 management:'management',contraindication:'management',outdated:'management',evidence:'management',prevention:'management',practice:'management','first-aid':'management',safety:'management',
 sequence:'sequence-timing',timing:'sequence-timing','red-flag':'missed-red-flag',recognition:'missed-red-flag',reasoning:'reasoning',
 fact:'factual',cause:'factual',transmission:'factual',definition:'factual',law:'factual',concept:'factual',context:'factual','natural-history':'factual',stigma:'factual'};
for(const k of MISCONCEPTION_KINDS)KIND[k]=k;
const reg=JSON.parse(readFileSync('data/nmc-learning-foundation-drafts.json','utf8'));
const objC=new Map(reg.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
const byLabel=new Map();for(const b of reg.sourceBindings){if(!byLabel.has(b.namedConcept))byLabel.set(b.namedConcept,objC.get(b.objectiveVersionId));}
const dir='ops/nmc/misconceptions/';
const misconceptions=readdirSync(dir).filter(f=>f.endsWith('.json')).sort().flatMap(f=>JSON.parse(readFileSync(dir+f,'utf8')).map(x=>{
 const id=byLabel.get(x.c);if(!id)throw new Error(f+': unknown concept: '+x.c);
 const kind=KIND[x.k];if(!kind)throw new Error(f+': unknown kind: '+x.k);
 return {misconceptionId:'mc:'+createHash('sha256').update(id+'\n'+x.m).digest('hex').slice(0,16),conceptId:id,label:x.c,
  misconception:x.m,correction:x.fix,kind,guidelineSensitive:x.gs===true};
})).sort((a,b)=>a.label.localeCompare(b.label)||a.misconceptionId.localeCompare(b.misconceptionId));
const doc={schemaVersion:1,contractId:'nmc-concept-misconceptions-v1',status:'ai-draft',clinicalApproval:false,learnerActivation:false,misconceptions};
validateConceptMisconceptions(doc,[...new Set(objC.values())]);
if(process.argv[2]==='--write')writeFileSync('data/nmc-concept-misconceptions.json',JSON.stringify(doc,null,1)+'\n');
const k={};for(const m of misconceptions)k[m.kind]=(k[m.kind]||0)+1;
console.log(JSON.stringify({misconceptions:misconceptions.length,concepts:new Set(misconceptions.map(m=>m.conceptId)).size,guidelineSensitive:misconceptions.filter(m=>m.guidelineSensitive).length,kinds:k}));
