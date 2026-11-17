// Re-pins registry identity digests after the accepted subject-revision batch (registry @24).
// Accepted documents come from committed concept batches + receipt IDs; subjects come from the revision batch.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {canonicalIdentityDigest} from '../../src/domain/nmc-learning-foundation.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
const batch=read('docs/evidence/2026-11-17-nmc-concept-subject-revisions-batch-v1.json');
const files=readdirSync('docs/evidence'),aliases=new Map();
for(const r of readdirSync('ops/nmc/receipts')){
 const ids=readFileSync('ops/nmc/receipts/'+r,'utf8').trim().split(/[,\s]+/),m=r.match(/^(.+)-(v\d+)-concept-ids\.txt$/);
 const fresh=read('docs/evidence/'+files.find(x=>x.endsWith('-nmc-'+m[1]+'-concept-batch-'+m[2]+'.json'))).concepts.filter(c=>!c.existingConceptId);
 ids.forEach((id,i)=>aliases.set('C-'+id,fresh[i].document.aliases));}
const digest=new Map();
for(const r of batch.revisions)digest.set(r.conceptId,await canonicalIdentityDigest({conceptId:r.conceptId,label:r.label,aliases:aliases.get(r.conceptId),subjectTags:[...r.currentSubjects,...r.addSubjects]}));
let changed=0;
for(const o of reg.objectives){const d=digest.get(o.objective.conceptId);if(d&&o.canonicalIdentitySha256!==d){o.canonicalIdentitySha256=d;changed++;}}
reg.draftVersion='mbbs-foundation:original-objectives@24';
writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:/^\{\n "/.test(raw)?1:0)+(raw.endsWith('\n')?'\n':''));
console.log({concepts:digest.size,objectivesChanged:changed});
