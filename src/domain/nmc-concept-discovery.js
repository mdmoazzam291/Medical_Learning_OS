// Name-based navigation into the published library. Never a clinical mapping,
// content import, identity merge, mastery update or approval operation.
// Keep meaningful letters, numbers and symbols. Broad punctuation stripping
// would wrongly equate α/β names, A+/A- or decimal/fraction identifiers.
const normalise=s=>s.normalize('NFKC')
 .replace(/(\p{Ll})(\p{Lu})/gu,'$1 $2').toLowerCase()
 .replaceAll('anaemia','anemia').replaceAll('&',' and ')
 .replace(/(?<=\p{L})-(?=\p{L})/gu,' ').replace(/\s+/g,' ').trim();
const generic=s=>/^(general|introduction|basics|miscellaneous|overview|principles)(?:[\s:.-]|$)/.test(s);
const validId=s=>typeof s==='string'&&s.trim().length>0&&s.length<=240;
export const conceptLibraryUrl=(conceptId,view='overview')=>
 '/web/library.html?view='+encodeURIComponent(view)+'&concept='+encodeURIComponent(conceptId);

export function selectIntegratedConcepts(concepts,{system='',organ='',search=''}={}){
 const query=normalise(search);
 const facets=(rows,key)=>[...new Set(rows.flatMap(c=>c.classification?.[key]||[]))].sort();
 const seen=new Set();
 const unique=concepts.filter(c=>{
  if(seen.has(c.conceptId))return false;
  seen.add(c.conceptId);
  return true;
 });
 const systems=facets(unique,'systems');
 const inSystem=system?unique.filter(c=>c.classification?.systems?.includes(system)):unique;
 const organs=facets(inSystem,'organs');
 const matches=inSystem.filter(c=>(!organ||c.classification?.organs?.includes(organ))&&
  (!query||[c.label,...c.aliases].some(label=>normalise(label).includes(query))));
 matches.sort((a,b)=>a.label.localeCompare(b.label)||a.conceptId.localeCompare(b.conceptId));
 return {systems,organs,matches:matches.map(({conceptId,label,classification})=>({
  conceptId,label,subjects:classification?.subjects||[],url:conceptLibraryUrl(conceptId)
 }))};
}

const fail=()=>{throw new TypeError('nmc_concept_discovery_invalid');};
export function discoverTopicConcepts(group,library){
 if(!group||!Array.isArray(group.labels)||!group.labels.every(s=>typeof s==='string')||!Array.isArray(group.allSubjects)||
 !library||!['concepts','questions','notes'].every(k=>Array.isArray(library[k])))fail();
 const labels=new Set(group.labels.map(normalise).filter(Boolean));
 const seen=new Set(),result=[];
 for(const c of library.concepts){
  if(!validId(c.conceptId)||seen.has(c.conceptId)||typeof c.label!=='string'||!Array.isArray(c.aliases)||!c.aliases.every(a=>typeof a==='string'))fail();
  seen.add(c.conceptId);
  const matches=s=>labels.has(normalise(s))&&(!generic(normalise(s))||c.classification?.subjects?.some(s=>group.allSubjects.includes(s)));
  const match=matches(c.label)?'title':c.aliases.some(matches)?'alias':null;
  if(!match)continue;
  const questions=library.questions.filter(q=>Array.isArray(q.conceptLinks)&&q.conceptLinks.some(l=>l.conceptId===c.conceptId));
  const notes=library.notes.filter(n=>n.conceptId===c.conceptId);
  if(questions.some(q=>!validId(q.questionId))||notes.some(n=>!validId(n.noteVersionId)))fail();
  const url=view=>conceptLibraryUrl(c.conceptId,view);
  result.push({conceptId:c.conceptId,label:c.label,match,
   questionCount:new Set(questions.map(q=>q.questionId)).size,noteCount:new Set(notes.map(n=>n.noteVersionId)).size,
   urls:{concept:url('overview'),notes:url('notes'),questions:url('questions'),graph:url('graph')}});
 }
 return result.sort((a,b)=>a.label.localeCompare(b.label)||a.conceptId.localeCompare(b.conceptId));
}
export async function loadPublishedConceptLibrary({request,identity}){
 const before=await identity();
 if(!before)throw Object.assign(new Error('Sign in to find learning material.'),{code:'authentication_required'});
 const library=await request('/library');
 if(await identity()!==before)throw Object.assign(new Error('Account changed. Try again.'),{code:'identity_changed'});
 return library;
}
export async function loadTopicConcepts(group,access){
 const library=await loadPublishedConceptLibrary(access);
 const matches=discoverTopicConcepts(group,library);
 const subjects=[...new Set(group.allSubjects)].map(subjectId=>({subjectId,conceptCount:library.concepts.filter(c=>c.classification?.subjects?.includes(subjectId)).length,url:'/web/library.html?view=overview&subject='+encodeURIComponent(subjectId)}));
 return {matches,subjects,conceptCount:library.concepts.length};
}
