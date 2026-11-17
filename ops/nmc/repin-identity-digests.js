// Re-pins registry canonicalIdentitySha256 values to the *current* accepted identities, e.g. after owner
// label/alias edits or subject revisions. Input: a JSON export of content_concept_current_identities:
//   select coalesce(json_agg(json_build_object('concept_id',concept_id,'accepted_document',accepted_document)
//     order by concept_id),'[]') from public.content_concept_current_identities;
// Usage: node ops/nmc/repin-identity-digests.js <export.json> [--write <registry-version-number>]
// Only digests change; wording, IDs and links do not. Concepts absent from the export are left as they are.
import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalIdentityDigest} from '../../src/domain/nmc-learning-foundation.js';
const [,,exportPath,flag,version]=process.argv;
if(!exportPath)throw new Error('usage: repin-identity-digests.js <export.json> [--write <n>]');
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
const rows=JSON.parse(readFileSync(exportPath,'utf8'));
const digest=new Map();
for(const r of rows){const d=r.accepted_document;
 if(d?.conceptId!==r.concept_id)throw new Error('export_row_invalid '+r.concept_id);
 digest.set(r.concept_id,await canonicalIdentityDigest({conceptId:r.concept_id,label:d.label,aliases:d.aliases||[],subjectTags:d.classification?.subjects||[]}));}
const changed=[];
for(const o of reg.objectives){const d=digest.get(o.objective.conceptId);
 if(d&&o.canonicalIdentitySha256!==d){changed.push({objectiveVersionId:o.objective.objectiveVersionId,conceptId:o.objective.conceptId,before:o.canonicalIdentitySha256,after:d});o.canonicalIdentitySha256=d;}}
if(flag==='--write'&&changed.length){
 if(!/^\d+$/.test(version||''))throw new Error('registry version number required');
 reg.draftVersion='mbbs-foundation:original-objectives@'+version;
 writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:1)+'\n');
}
console.log(JSON.stringify({identities:digest.size,objectivesChanged:changed.length,concepts:[...new Set(changed.map(c=>c.conceptId))]}));
