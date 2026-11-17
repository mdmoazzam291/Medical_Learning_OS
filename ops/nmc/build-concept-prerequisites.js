// Builds data/nmc-concept-prerequisites.json from an authored link list keyed by concept labels.
// Usage: node ops/nmc/build-concept-prerequisites.js <links.json> <subject> [--write]
// links.json: [{prerequisite, concept, strength:'essential'|'helpful', reason}] using registry concept names.
// Existing links for other subjects are kept; links are replaced only for the concepts in the input.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {validateConceptPrerequisites,prerequisiteSummary} from '../../src/domain/nmc-concept-prerequisites.js';
const [,,inPath,subject,flag]=process.argv;
const reg=JSON.parse(readFileSync('data/nmc-learning-foundation-drafts.json','utf8'));
const objC=new Map(reg.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
const byLabel=new Map(),label=new Map();
for(const b of reg.sourceBindings){const id=objC.get(b.objectiveVersionId);if(label.has(id))continue;label.set(id,b.namedConcept);
 if(byLabel.has(b.namedConcept)&&byLabel.get(b.namedConcept)!==id)throw new Error('ambiguous label '+b.namedConcept);byLabel.set(b.namedConcept,id);}
const OUT='data/nmc-concept-prerequisites.json';
const doc=existsSync(OUT)?JSON.parse(readFileSync(OUT,'utf8')):{schemaVersion:1,contractId:'nmc-concept-prerequisites-v1',status:'ai-draft',clinicalApproval:false,learnerActivation:false,subjectsAuthored:[],links:[]};
const authored=JSON.parse(readFileSync(inPath,'utf8')).map(l=>{const a=byLabel.get(l.prerequisite),b=byLabel.get(l.concept);
 if(!a||!b)throw new Error('unknown concept: '+(a?l.concept:l.prerequisite));
 return {prerequisiteConceptId:a,conceptId:b,prerequisiteLabel:l.prerequisite,label:l.concept,strength:l.strength,reason:l.reason};});
const targets=new Set(authored.map(l=>l.conceptId));
doc.links=[...doc.links.filter(l=>!targets.has(l.conceptId)),...authored].sort((x,y)=>x.label.localeCompare(y.label)||x.prerequisiteLabel.localeCompare(y.prerequisiteLabel));
if(!doc.subjectsAuthored.includes(subject))doc.subjectsAuthored=[...doc.subjectsAuthored,subject].sort();
validateConceptPrerequisites(doc,[...label.keys()]);
if(flag==='--write')writeFileSync(OUT,JSON.stringify(doc,null,1)+'\n');
const s=prerequisiteSummary(doc);console.log(JSON.stringify({...s,flaggedForReview:s.flaggedForReview.map(id=>label.get(id))}));
