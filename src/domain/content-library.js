export const SUBJECTS = Object.freeze(['anatomy','physiology','biochemistry','pathology','pharmacology','microbiology','forensic-medicine','community-medicine','medicine','surgery','obstetrics-gynaecology','pediatrics','ent','ophthalmology','orthopaedics','dermatology','psychiatry','anaesthesia','radiology']);
const facets = ['subjects','systems','organs','domains','tasks'];
const normalize = value => String(value).trim().toLowerCase().replace(/\s+/g,' ');
const fail = code => { throw new TypeError(code); };
const object = value => { if (!value || typeof value!=='object' || Array.isArray(value)) fail('object_required'); };
const shape = (value, keys) => { object(value); if (Object.keys(value).sort().join('|')!==[...keys].sort().join('|')) fail('invalid_fields'); };
const text = (value, max=100000) => { if(typeof value!=='string'||!value.trim()||value.length>max) fail('text_required'); };
const id = value => { text(value,160); if(!/^[a-zA-Z0-9:_@.\-]+$/.test(value)) fail('identifier_invalid'); };
const unique = values => [...new Set(values)];
function strings(value, maximum=200) {
  if(!Array.isArray(value)||value.length>maximum) fail('array_invalid');
  value.forEach(x=>text(x,240)); if(unique(value).length!==value.length) fail('duplicate_value');
}
function classification(value) {
  shape(value,facets); facets.forEach(f=>{ strings(value[f]); value[f].forEach(x=>{ if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x)) fail('category_invalid'); }); });
  if(value.subjects.some(x=>!SUBJECTS.includes(x))) fail('subject_invalid');
}
export function questionSignature(q) {
  return JSON.stringify([normalize(q.stem),q.options.map(x=>normalize(x.text)).sort()]);
}
export function questionAnswer(q) { return normalize(q.options.find(x=>x.optionId===q.answerOptionId)?.text ?? ''); }
export function questionHome(origins=[]) {
  const exams=unique(origins.filter(x=>x.kind==='pyq').map(x=>x.examId)).sort();
  if(exams.length) return {kind:'pyq',platforms:[],exams};
  const priority=['marrow','prepladder','dams'];
  const platforms=unique(origins.filter(x=>x.kind==='platform').map(x=>x.platformId)).sort((a,b)=>{
    const rank=x=>priority.includes(x)?priority.indexOf(x):priority.length;
    return rank(a)-rank(b)||a.localeCompare(b);
  });
  return {kind:platforms.length?'platform':'original',platforms:platforms.slice(0,1),exams:[]};
}
export function validateImport(m) {
  shape(m,['schemaVersion','importId','concepts','sources','questions','notes','noteQuestionLinks']);
  if(m.schemaVersion!==1) fail('schema_version_invalid'); id(m.importId);
  for(const [key,maximum] of [['concepts',200],['sources',200],['questions',100],['notes',100],['noteQuestionLinks',500]]) {
    if(!Array.isArray(m[key])||m[key].length>maximum) fail('batch_size_invalid');
  }
  if(!m.questions.length&&!m.notes.length) fail('empty_import');
  const distinct=(rows,key)=>{ if(unique(rows.map(x=>x[key])).length!==rows.length) fail('duplicate_identifier'); };
  for(const c of m.concepts) { shape(c,['conceptId','label','aliases','subjectTags','classification']); id(c.conceptId); text(c.label,240); strings(c.aliases); strings(c.subjectTags); classification(c.classification); }
  for(const s of m.sources) { shape(s,['sourceId','title','url','version','evidence']); id(s.sourceId); text(s.title,500); text(s.version,300); text(s.evidence,4000); if(s.url!==null){text(s.url,2000);if(new URL(s.url).protocol!=='https:') fail('source_url_invalid');} }
  const signatures=new Map();
  for(const q of m.questions) {
    shape(q,['questionId','stem','options','answerOptionId','explanation','conceptLinks','sourceIds','origins','classification']);
    id(q.questionId); text(q.stem); text(q.explanation); id(q.answerOptionId); classification(q.classification);
    if(!Array.isArray(q.options)||q.options.length<2||q.options.length>10) fail('options_invalid');
    q.options.forEach(o=>{shape(o,['optionId','text']);id(o.optionId);text(o.text,20000);}); distinct(q.options,'optionId');
    if(unique(q.options.map(x=>normalize(x.text))).length!==q.options.length||!q.options.some(x=>x.optionId===q.answerOptionId)) fail('answer_invalid');
    if(!Array.isArray(q.conceptLinks)||!q.conceptLinks.length||q.conceptLinks.length>50) fail('concept_links_invalid');
    q.conceptLinks.forEach(l=>{shape(l,['conceptId','role']);id(l.conceptId);if(!['primary','secondary','prerequisite','distractor'].includes(l.role)) fail('concept_role_invalid');});
    if(q.conceptLinks.filter(l=>l.role==='primary').length!==1) fail('primary_concept_required');
    if(unique(q.conceptLinks.map(l=>l.conceptId+'|'+l.role)).length!==q.conceptLinks.length) fail('duplicate_concept_link');
    strings(q.sourceIds); if(!q.sourceIds.length) fail('source_required'); q.sourceIds.forEach(id);
    if(!Array.isArray(q.origins)||q.origins.length>100) fail('origins_invalid');
    for(const o of q.origins) {
      if(o.kind==='pyq'){ shape(o,['kind','examId','year','session','evidence']);id(o.examId);if(!Number.isInteger(o.year)||o.year<1900||o.year>2100) fail('year_invalid');text(o.session,200); }
      else if(o.kind==='platform'){shape(o,['kind','platformId','edition','evidence']);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.platformId)) fail('platform_invalid');text(o.edition,200);}
      else fail('origin_invalid'); text(o.evidence,4000);
    }
    const signature=questionSignature(q),answer=questionAnswer(q);
    if(signatures.has(signature)&&signatures.get(signature)!==answer) fail('answer_conflict'); signatures.set(signature,answer);
  }
  for(const n of m.notes){
    shape(n,['noteId','conceptId','title','bodyMarkdown','sourceIds','provenance']);id(n.noteId);id(n.conceptId);text(n.title,300);text(n.bodyMarkdown);strings(n.sourceIds);if(!n.sourceIds.length) fail('source_required');n.sourceIds.forEach(id);
    shape(n.provenance,['kind','evidence']);if(!['ai_generated_original','licensed_adaptation'].includes(n.provenance.kind)) fail('note_provenance_invalid');text(n.provenance.evidence,2000);
    if(!m.noteQuestionLinks.some(l=>l.noteId===n.noteId)) fail('note_question_link_required');
  }
  for(const l of m.noteQuestionLinks){shape(l,['noteId','questionId','relation','section']);id(l.noteId);id(l.questionId);if(!m.notes.some(n=>n.noteId===l.noteId)||!['explains','contrasts','prerequisite'].includes(l.relation)||typeof l.section!=='string'||l.section.length>300) fail('note_link_invalid');}
  distinct(m.concepts,'conceptId');distinct(m.sources,'sourceId');distinct(m.questions,'questionId');distinct(m.notes,'noteId');
  return m;
}
const emptyFacets=()=>Object.fromEntries(facets.map(f=>[f,[]]));
export function projectLibrary({catalog={concepts:[],questions:[]},notes=[],questionMetadata=[],conceptMetadata=[],links=[],stats=[]}) {
  const qm=new Map(questionMetadata.map(x=>[x.question_id,x])); const cm=new Map(conceptMetadata.map(x=>[x.concept_id,x])); const observations=new Map(stats.map(x=>[x.question_id,x]));
  const seen=new Set();
  const questions=catalog.questions.filter(q=>q.status==='published').filter(q=>{if(seen.has(q.questionId))return false;seen.add(q.questionId);return true;}).map(q=>{
    const meta=qm.get(q.questionId)||{};const observed=observations.get(q.questionId);const origins=[...(meta.origins||[])];
    const legacy=q.provenance;
    if(['licensed_pyq','recalled_pyq'].includes(legacy?.kind)){const examId=legacy.exam.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!origins.some(o=>o.kind==='pyq'&&o.examId===examId&&o.year===legacy.year))origins.push({kind:'pyq',examId,year:legacy.year,session:'unspecified',evidence:legacy.evidence});}
    const conceptLinks=[...new Map([...q.conceptLinks,...(meta.concept_links_version_id===q.questionVersionId?(meta.concept_links||[]).filter(l=>l.role!=='primary'):[])].map(l=>[l.conceptId+'|'+l.role,l])).values()];
    const classification=structuredClone(meta.classification||emptyFacets());
    if(!classification.subjects.length) classification.subjects=unique(conceptLinks.flatMap(l=>catalog.concepts.find(c=>c.conceptId===l.conceptId)?.subjectTags||[]));
    return {questionId:q.questionId,questionVersionId:q.questionVersionId,stem:q.stem,options:q.options.map(o=>({optionId:o.optionId,text:o.text})),conceptLinks,classification,origins,home:questionHome(origins),observed:{attempts:Number(observed?.attempts||0),wrong:Number(observed?.wrong||0),latestCorrect:observed?.latest_correct??null,state:!observed?'unattempted':observed.latest_correct===true?'correct':'incorrect',repeatedWrong:Number(observed?.wrong||0)>=2}};
  });
  const publishedNotes=notes.filter(n=>n.status==='published').map(n=>({noteVersionId:n.id,conceptId:n.concept_id,title:n.title,bodyMarkdown:n.body_markdown}));
  const visibleIds=new Set([...questions.flatMap(q=>q.conceptLinks.map(l=>l.conceptId)),...publishedNotes.map(n=>n.conceptId)]);
  const concepts=catalog.concepts.filter(c=>visibleIds.has(c.conceptId)).map(c=>({conceptId:c.conceptId,label:c.label,aliases:c.aliases||[],classification:cm.get(c.conceptId)?.classification||{...emptyFacets(),subjects:c.subjectTags||[]}}));
  const noteIds=new Set(publishedNotes.map(n=>n.noteVersionId));const questionIds=new Set(questions.map(q=>q.questionId));
  return {contractId:'canonical-content-library-v1',concepts,questions,notes:publishedNotes,links:links.filter(l=>noteIds.has(l.note_version_id)&&questionIds.has(l.question_id)),masteryInference:false};
}
export function filterLibrary(library, filters={}) {
  const selectedNoteIds=new Set(library.notes.filter(n=>n.conceptId===filters.concept).map(n=>n.noteVersionId));
  const noteConnections=new Map((library.links||[]).filter(l=>selectedNoteIds.has(l.note_version_id)).map(l=>[l.question_id,l.relation]));
  const categories={subject:'subjects',system:'systems',organ:'organs',domain:'domains',task:'tasks'};
  const matches=c=>Object.entries(categories).every(([key,facet])=>!filters[key]||c[facet]?.includes(filters[key]));
  const questions=library.questions.filter(q=>matches(q.classification)&&(!filters.exam||q.home.exams.includes(filters.exam))&&(!filters.platform||q.home.platforms.includes(filters.platform))&&(!filters.home||q.home.kind===filters.home)&&(!filters.concept||q.conceptLinks.some(l=>l.conceptId===filters.concept)||noteConnections.has(q.questionId))).map(q=>{
    const roles=q.conceptLinks.filter(l=>l.conceptId===filters.concept).map(l=>l.role);
    return {...q,connection:roles.includes('primary')?'assesses':roles.includes('distractor')||noteConnections.get(q.questionId)==='contrasts'?'confusing':roles.includes('prerequisite')||noteConnections.get(q.questionId)==='prerequisite'?'prerequisite':'related'};
  });
  const ids=new Set(questions.flatMap(q=>q.conceptLinks.map(l=>l.conceptId)));
  const concepts=library.concepts.filter(c=>(!filters.concept||c.conceptId===filters.concept)&&matches(c.classification)&&(!filters.exam&&!filters.platform&&!filters.home||ids.has(c.conceptId)));
  const conceptIds=new Set(concepts.map(c=>c.conceptId));
  return {...library,questions,concepts,notes:library.notes.filter(n=>conceptIds.has(n.conceptId))};
}
