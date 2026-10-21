import { questionHome } from './content-library.js';
const facets = value => Object.fromEntries(['subjects','systems','organs','domains','tasks'].map(k=>[k,[...(value?.[k] || [])]]));
const check = (id,label,status,detail) => ({id,label,status,detail});
// Metadata eligibility is deliberately separate from human approval and server resolution.
export function contentPlacement(manifest) {
  const concepts=new Set(manifest.concepts.map(c=>c.conceptId)), sources=new Set(manifest.sources.map(s=>s.sourceId));
  const items=[...manifest.questions.map(q=>{
    const home=questionHome(q.origins), primary=q.conceptLinks.find(l=>l.role==='primary');
    const note=manifest.noteQuestionLinks.some(l=>l.questionId===q.questionId);
    return {kind:'question',id:q.questionId,title:q.stem,home:home.kind,checks:[
      check('concept','Canonical concept',!primary?'missing':q.conceptLinks.every(l=>concepts.has(l.conceptId))?'eligible':'unresolved',primary?'Declared concept links; external IDs require server resolution.':'One primary concept is required.'),
      check('questions',home.kind==='pyq'?'PYQ collection':'Question collection','eligible',home.kind==='pyq'?'PYQ home excludes platform copies.':'One canonical question home.'),
      check('notes','Linked notes',note?'eligible':'missing',note?'Explicit note/question link declared.':'No note link supplied; no note is generated.'),
      check('graph','Exam graph',primary?'eligible':'missing','Displays declared associations, not medical causation.'),
      check('sources','Source references',!q.sourceIds.length?'missing':q.sourceIds.every(id=>sources.has(id))?'eligible':'unresolved','Exact source records outside this batch require server resolution.'),
      check('review','Medical, reference & rights approval','pending','An administrator must inspect exact content and the server must accept publication.') ]};
  }),...manifest.notes.map(n=>({kind:'note',id:n.noteId,title:n.title,home:'notes',checks:[
    check('concept','Canonical concept',concepts.has(n.conceptId)?'eligible':'unresolved','External concept IDs require server resolution.'),
    check('notes','Concept Notes & dossier','eligible','Uses this supplied note body; no generated replacement.'),
    check('questions','Linked questions',manifest.noteQuestionLinks.some(l=>l.noteId===n.noteId)?'eligible':'missing','Explicit note/question links are required.'),
    check('sources','Source references',!n.sourceIds.length?'missing':n.sourceIds.every(id=>sources.has(id))?'eligible':'unresolved','Source declarations require exact-version and reuse checks.'),
    check('review','Medical, reference & rights approval','pending','Preview is not approval.') ]}))];
  return {items,publicationApproved:false};
}
// Input is an authenticated staged manifest. Construct a fresh prompt-only projection:
// never copy arbitrary nested draft data (keys, clinical review evidence or provenance).
export function draftLibrary(m) {
  return {contractId:'canonical-content-library-v1',draftOnly:true,masteryInference:false,
    concepts:m.concepts.map(c=>({conceptId:c.conceptId,label:c.label,aliases:[...(c.aliases||[])],classification:facets(c.classification)})),
    sources:m.sources.map(s=>({sourceId:s.sourceId,title:s.title,url:s.url,version:s.version})),
    questions:m.questions.map(q=>({questionId:q.questionId,questionVersionId:'draft:'+q.questionId,stem:q.stem,
      options:q.options.map(o=>({optionId:o.optionId,text:o.text})),sourceIds:[...q.sourceIds],conceptLinks:q.conceptLinks.map(l=>({conceptId:l.conceptId,role:l.role})),classification:facets(q.classification),
      origins:q.origins.map(o=>o.kind==='pyq'?{kind:'pyq',examId:o.examId,year:o.year,session:o.session}:{kind:'platform',platformId:o.platformId,edition:o.edition}),home:questionHome(q.origins),
      intelligence:{primaryTask:q.intelligence?.primaryTask||'',presentation:[...(q.intelligence?.presentation||[])],qualifiers:[...(q.intelligence?.qualifiers||[])]},
      observed:{attempts:0,wrong:0,state:'unattempted',repeatedWrong:false}})),
    notes:m.notes.map(n=>({noteVersionId:'draft:'+n.noteId,conceptId:n.conceptId,title:n.title,bodyMarkdown:n.bodyMarkdown,sourceIds:[...n.sourceIds]})),
    links:m.noteQuestionLinks.map(l=>({note_version_id:'draft:'+l.noteId,question_id:l.questionId,relation:l.relation,section:l.section}))};
}
