import relationships from '../../../../docs/evidence/2026-11-12-nmc-shared-name-relationships.json' with {type:'json'};
import unified from '../../../../docs/evidence/2026-11-09-nmc-unified-subject-reference-audit.json' with {type:'json'};
import names from '../../../../docs/evidence/2026-11-09-nmc-names-only-source-linked-draft-projection.json' with {type:'json'};
import pack from '../../../../data/nmc-learning-foundation-drafts.json' with {type:'json'};
import catalogue from '../../../../data/nmc-reference-catalogue.json' with {type:'json'};
import {foundationDraftPage,parseFoundationFilters} from '../../../../src/domain/nmc-learning-foundation.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const codeByReference = new Map(catalogue.references.map(row => [row.referenceId, row.searchCode]));
function relationshipEndpoint({name, referenceIds}) {
 const codes = referenceIds.map(id => codeByReference.get(id));
 if (codes.some(code => !code)) throw new Error('Relationship reference missing');
 return {label: name, codes: [...new Set(codes)].sort()};
}
export async function readFoundationDrafts({admin,actor,method,params}){
 if(method!=='GET')fail(405,'method_not_allowed');
 let filters;
 try{
  if([...params.keys()].some(k=>params.getAll(k).length!==1))throw new Error();
  filters=parseFoundationFilters(Object.fromEntries(params));
  if(filters.subject&&!catalogue.references.some(r=>r.subjectId===filters.subject))throw new Error();
 }catch{fail(400,'foundation_filter_invalid');}
 const role=await admin.rpc('content_admin_status_v1',{p_user:actor});
 if(role.error)fail(503,'foundation_drafts_unavailable');
 if(role.data?.isAdmin!==true)fail(403,'content_admin_required');
 const result=await admin.from('study_catalog').select('version,body').eq('id',1).single();
 if(result.error||!result.data)fail(503,'foundation_drafts_unavailable');
 // Only inspect accepted private identities referenced by this pack and absent
 // from the learner catalogue. No draft bodies or reviewer details are needed.
 try{
  if(!Array.isArray(result.data.body?.concepts))throw new Error();
  const concepts=result.data.body.concepts.map(c=>({conceptId:c.conceptId,label:c.label,aliases:c.aliases||[],subjectTags:c.subjectTags}));
  const catalogIds=new Set(concepts.map(c=>c.conceptId));
  const missingIds=[...new Set(pack.objectives.map(row=>row.objective.conceptId))].filter(id=>!catalogIds.has(id));
  if(missingIds.length){
   const privateResult=await admin.from('content_concept_acceptances').select('concept_id,accepted_document').in('concept_id',missingIds);
   if(privateResult.error||!Array.isArray(privateResult.data))throw new Error();
   const requested=new Set(missingIds);
   for(const row of privateResult.data){
    const identity=row.accepted_document;
    if(!requested.has(row.concept_id)||identity?.conceptId!==row.concept_id)throw new Error();
    requested.delete(row.concept_id);
    concepts.push({conceptId:row.concept_id,label:identity.label,aliases:identity.aliases,subjectTags:identity.classification?.subjects,identityKind:'accepted-private'});
   }
  }
  const page=await foundationDraftPage(pack,catalogue,{version:result.data.version,concepts},filters);
  const namesOnlyRelationships = relationships.relationships.map(({narrower, broader}) => ({
   narrower: relationshipEndpoint(narrower),
   broader: relationshipEndpoint(broader),
  }));
  return {...page,namesOnlyRelationships,namesOnlyPreview:{
   concepts:unified.rows.map(row=>({label:row.name,codes:[...new Set(row.references.map(link=>link.code))]})),
   headings:names.navigationHeadings.map(row=>row.name),
   aliases:names.searchAliases.map(row=>row.alias),
   held:names.heldEntries.map(row=>row.alias),
  }};
 }catch{fail(503,'foundation_drafts_unavailable');}
}
