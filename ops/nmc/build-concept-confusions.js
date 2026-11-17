// Builds data/nmc-concept-confusions.json from authored pairs keyed by registry concept names.
// Usage: node ops/nmc/build-concept-confusions.js <pairs.json> [--write]   pairs: [{a, b, discriminator}]
import {readFileSync,writeFileSync} from 'node:fs';
import {validateConceptConfusions,pairKey} from '../../src/domain/nmc-concept-confusions.js';
const [,,inPath,flag]=process.argv;
const reg=JSON.parse(readFileSync('data/nmc-learning-foundation-drafts.json','utf8'));
const objC=new Map(reg.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
const byLabel=new Map();for(const b of reg.sourceBindings){const id=objC.get(b.objectiveVersionId);if(!byLabel.has(b.namedConcept))byLabel.set(b.namedConcept,id);}
const seen=new Set();
const pairs=JSON.parse(readFileSync(inPath,'utf8')).map(p=>{const a=byLabel.get(p.a),b=byLabel.get(p.b);if(!a||!b)throw new Error('unknown concept: '+(a?p.b:p.a));
 const [x,y]=a<b?[[a,p.a],[b,p.b]]:[[b,p.b],[a,p.a]];return {conceptIdA:x[0],conceptIdB:y[0],labelA:x[1],labelB:y[1],discriminator:p.discriminator};})
 .filter(p=>{const k=pairKey(p.conceptIdA,p.conceptIdB);if(seen.has(k))return false;seen.add(k);return true;})
 .sort((p,q)=>p.labelA.localeCompare(q.labelA)||p.labelB.localeCompare(q.labelB));
const doc={schemaVersion:1,contractId:'nmc-concept-confusions-v1',status:'ai-draft',clinicalApproval:false,learnerActivation:false,pairs};
validateConceptConfusions(doc,[...new Set(objC.values())]);
if(flag==='--write')writeFileSync('data/nmc-concept-confusions.json',JSON.stringify(doc,null,1)+'\n');
console.log(JSON.stringify({pairs:pairs.length,concepts:new Set(pairs.flatMap(p=>[p.conceptIdA,p.conceptIdB])).size}));
