// Name-based navigation into the published library. Never a clinical mapping,
// content import, identity merge, mastery update or approval operation.
const normalise=s=>s.normalize('NFKC').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replaceAll('anaemia','anemia').replaceAll('&',' and ').replace(/[^a-z0-9]+/g,' ').trim();
const generic=s=>/^(general|introduction|basics|miscellaneous|overview|principles)( |$)/.test(s);
const validId=s=>typeof s==='string'&&s.trim().length>0&&s.length<=240;
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
  const url=view=>'/web/library.html?view='+view+'&concept='+encodeURIComponent(c.conceptId);
  result.push({conceptId:c.conceptId,label:c.label,match,
   questionCount:new Set(questions.map(q=>q.questionId)).size,noteCount:new Set(notes.map(n=>n.noteVersionId)).size,
   urls:{concept:url('overview'),notes:url('notes'),questions:url('questions'),graph:url('graph')}});
 }
 return result.sort((a,b)=>a.label.localeCompare(b.label)||a.conceptId.localeCompare(b.conceptId));
}
export async function loadTopicConcepts(group,{request,identity}){
 const before=await identity();
 if(!before)throw Object.assign(new Error('Sign in to find learning material.'),{code:'authentication_required'});
 const library=await request('/library');
 if(await identity()!==before)throw Object.assign(new Error('Account changed. Try again.'),{code:'identity_changed'});
 const matches=discoverTopicConcepts(group,library);
 const subjects=[...new Set(group.allSubjects)].map(subjectId=>({subjectId,conceptCount:library.concepts.filter(c=>c.classification?.subjects?.includes(subjectId)).length,url:'/web/library.html?view=overview&subject='+encodeURIComponent(subjectId)}));
 return {matches,subjects,conceptCount:library.concepts.length};
}
