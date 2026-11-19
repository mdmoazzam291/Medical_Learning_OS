// Builds data/nmc-clinical-presentations.json from authored presentations keyed by registry concept names.
// Usage: node ops/nmc/build-clinical-presentations.js ops/nmc/presentations/presentations.json [--write]
// Input: [{id, label, causes:[concept name], approach:[concept name]}]
import {readFileSync,writeFileSync} from 'node:fs';
import {validateClinicalPresentations} from '../../src/domain/nmc-clinical-presentations.js';
const [,,inPath,flag]=process.argv;
const reg=JSON.parse(readFileSync('data/nmc-learning-foundation-drafts.json','utf8'));
const objC=new Map(reg.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
const byLabel=new Map();for(const b of reg.sourceBindings){if(!byLabel.has(b.namedConcept))byLabel.set(b.namedConcept,objC.get(b.objectiveVersionId));}
const link=(label,role)=>{const id=byLabel.get(label);if(!id)throw new Error('unknown concept: '+label);return {conceptId:id,label,role};};
const presentations=JSON.parse(readFileSync(inPath,'utf8')).map(p=>{
 const links=[...p.causes.map(l=>link(l,'cause')),...p.approach.map(l=>link(l,'approach'))];
 const ids=links.map(l=>l.conceptId);if(new Set(ids).size!==ids.length)throw new Error('duplicate concept in '+p.id);
 return {presentationId:p.id,label:p.label,links};});
const doc={schemaVersion:1,contractId:'nmc-clinical-presentations-v1',status:'ai-draft',clinicalApproval:false,learnerActivation:false,presentations};
validateClinicalPresentations(doc,[...new Set(objC.values())]);
if(flag==='--write')writeFileSync('data/nmc-clinical-presentations.json',JSON.stringify(doc,null,1)+'\n');
console.log(JSON.stringify({presentations:presentations.length,links:presentations.reduce((n,p)=>n+p.links.length,0),concepts:new Set(presentations.flatMap(p=>p.links.map(l=>l.conceptId))).size}));
