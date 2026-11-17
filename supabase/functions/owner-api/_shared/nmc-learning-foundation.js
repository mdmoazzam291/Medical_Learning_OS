import {loadFoundationData} from './foundation-data.js';
import {foundationDraftPage,parseFoundationFilters} from '../../../../src/domain/nmc-learning-foundation.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
function relationshipEndpoint(codeByReference, {name, referenceIds}) {
 const codes = referenceIds.map(id => codeByReference.get(id));
 if (codes.some(code => !code)) throw new Error('Relationship reference missing');
 return {label: name, codes: [...new Set(codes)].sort()};
}
export async function readFoundationDrafts({admin,actor,method,params}){
 if(method!=='GET')fail(405,'method_not_allowed');
 let data,stage='load';
 const failStage=()=>{console.error(JSON.stringify({event:'foundation_drafts_failed',stage}));fail(503,'foundation_drafts_unavailable');};
 try{data=await loadFoundationData();}catch{failStage();}
 const {supplement,relationships,unified,names,pack,catalogue}=data;
 const codeByReference=new Map(catalogue.references.map(row=>[row.referenceId,row.searchCode]));
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
 stage='catalog';
 if(result.error||!result.data)failStage();
 // Only inspect accepted private identities referenced by this pack and absent
 // from the learner catalogue. No draft bodies or reviewer details are needed.
 try{
  if(!Array.isArray(result.data.body?.concepts))throw new Error();
  const concepts=result.data.body.concepts.map(c=>({conceptId:c.conceptId,label:c.label,aliases:c.aliases||[],subjectTags:c.subjectTags}));
  const catalogIds=new Set(concepts.map(c=>c.conceptId));
  const missingIds=[...new Set(pack.objectives.map(row=>row.objective.conceptId))].filter(id=>!catalogIds.has(id));
  if(missingIds.length){
   stage='private-identities';
   // Chunked: ~1,500 IDs in one GET produced an oversized PostgREST URL.
   const rows=[];
   for(let i=0;i<missingIds.length;i+=150){
    // Current identity: latest subject revision, else the original acceptance.
    const privateResult=await admin.from('content_concept_current_identities').select('concept_id,accepted_document').in('concept_id',missingIds.slice(i,i+150));
    if(privateResult.error||!Array.isArray(privateResult.data))throw new Error();
    rows.push(...privateResult.data);
   }
   const requested=new Set(missingIds);
   for(const row of rows){
    const identity=row.accepted_document;
    if(!requested.has(row.concept_id)||identity?.conceptId!==row.concept_id)throw new Error();
    requested.delete(row.concept_id);
    concepts.push({conceptId:row.concept_id,label:identity.label,aliases:identity.aliases,subjectTags:identity.classification?.subjects,identityKind:'accepted-private'});
   }
  }
  stage='page';
  const page=await foundationDraftPage(pack,catalogue,{version:result.data.version,concepts},filters);
  const namesOnlyRelationships = relationships.relationships.map(({narrower, broader}) => ({
   narrower: relationshipEndpoint(codeByReference, narrower),
   broader: relationshipEndpoint(codeByReference, broader),
  }));
  return {...page,namesOnlyRelationships,namesOnlyPreview:{
   concepts:[
    ...unified.rows.map(row=>relationshipEndpoint(codeByReference, {name:row.name,referenceIds:row.references.map(link=>link.referenceId)})),
    ...supplement.conceptProposals.map(row=>relationshipEndpoint(codeByReference, {
     name:row.name,referenceIds:row.sourceLinks.map(link=>link.referenceId),
    })),
   ],
   headings:names.navigationHeadings.map(row=>row.name),
   aliases:names.searchAliases.map(row=>row.alias),
   held:names.heldEntries.map(row=>row.alias),
  }};
 }catch{failStage();}
}
