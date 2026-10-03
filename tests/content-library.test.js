import test from 'node:test';
import assert from 'node:assert/strict';
const domain = await import('../src/domain/content-library.js').catch(() => ({}));
const facets = { subjects: ['medicine'], systems: ['respiratory'], organs: ['lung'], domains: [], tasks: ['diagnosis'] };
const q = (id, overrides = {}) => ({ questionId: id, questionVersionId: id + '@1', status: 'published', stem: 'Synthetic choice?', options: [{ optionId: 'a', text: 'Alpha' }, { optionId: 'b', text: 'Beta' }], answerOptionId: 'a', explanation: 'Do not reveal.', conceptLinks: [{ conceptId: 'c1', role: 'primary' }], sourceIds: ['s1'], ...overrides });
const origin = platformId => ({ kind: 'platform', platformId, edition: 'v1', evidence: 'Declared source' });
const pyq = (examId, year) => ({ kind: 'pyq', examId, year, session: 'main', evidence: 'Declared occurrence' });
const manifest = () => ({ schemaVersion: 1, importId: 'synthetic-import', concepts: [{ conceptId: 'c1', label: 'Synthetic concept', aliases: [], subjectTags: ['medicine'], classification: facets }], sources: [{ sourceId: 's1', title: 'Synthetic source', url: null, version: '1', evidence: 'Test only' }], questions: [{ questionId: 'q1', stem: 'Synthetic choice?', options: [{ optionId: 'a', text: 'Alpha' }, { optionId: 'b', text: 'Beta' }], answerOptionId: 'a', explanation: 'Test only', conceptLinks: [{ conceptId: 'c1', role: 'primary' }], sourceIds: ['s1'], origins: [origin('marrow')], classification: facets }], notes: [], noteQuestionLinks: [] });

test('PYQ removes all platform display homes while preserving repeated years and exams', () => {
  assert.equal(typeof domain.questionHome, 'function');
  assert.deepEqual(domain.questionHome([origin('marrow'), pyq('neet-pg', 2024), pyq('neet-pg', 2025), pyq('ini-cet', 2025)]), { kind: 'pyq', platforms: [], exams: ['ini-cet', 'neet-pg'] });
});
test('platform duplicates display only in Marrow then PrepLadder then DAMS regardless of input order', () => {
  assert.equal(typeof domain.questionHome, 'function');
  for (const [items, wanted] of [[['dams','prepladder','marrow'],'marrow'], [['dams','prepladder'],'prepladder'], [['dams'],'dams']]) {
    assert.deepEqual(domain.questionHome(items.map(origin)), { kind: 'platform', platforms: [wanted], exams: [] });
  }
});
test('reordered option IDs match but meaningful medical numbers and negation remain distinct', () => {
  assert.equal(typeof domain.questionSignature, 'function');
  const a=q('a'); const b=q('b', { options: [{ optionId: 'y', text: 'Beta' }, { optionId: 'x', text: 'Alpha' }], answerOptionId:'x' });
  assert.equal(domain.questionSignature(a), domain.questionSignature(b));
  assert.notEqual(domain.questionSignature(q('a',{stem:'Dose 1.5 mg?'})), domain.questionSignature(q('b',{stem:'Dose 15 mg?'})));
  assert.notEqual(domain.questionSignature(q('a',{stem:'Is indicated?'})), domain.questionSignature(q('b',{stem:'Is not indicated?'})));
});
test('strict imports reject injected publication, unknown subjects and missing correct option', () => {
  assert.equal(typeof domain.validateImport, 'function');
  assert.equal(domain.validateImport(manifest()).importId, 'synthetic-import');
  const a=manifest(); a.questions[0].status='published'; assert.throws(()=>domain.validateImport(a));
  const b=manifest(); b.questions[0].classification={...facets,subjects:['invented']}; assert.throws(()=>domain.validateImport(b));
  const c=manifest(); c.questions[0].answerOptionId='missing'; assert.throws(()=>domain.validateImport(c));
});
test('duplicates with different correct answers fail instead of silently accepting two versions', () => {
  assert.equal(typeof domain.validateImport, 'function');
  const a=manifest(); a.questions.push({...a.questions[0],questionId:'q2',answerOptionId:'b'}); assert.throws(()=>domain.validateImport(a), /answer_conflict/);
});
test('repeated identical options and missing provenance fail intake', () => {
  assert.equal(typeof domain.validateImport, 'function');
  const a=manifest(); a.questions[0].options[1].text='Alpha'; assert.throws(()=>domain.validateImport(a));
  const b=manifest(); b.questions[0].origins=[{kind:'pyq',examId:'neet-pg',year:2025,session:'main',evidence:''}]; assert.throws(()=>domain.validateImport(b));
});
test('new notes require explicit linked questions and prohibit fabricated review fields', () => {
  assert.equal(typeof domain.validateImport, 'function');
  const a=manifest(); a.notes=[{noteId:'n1',conceptId:'c1',title:'Synthetic note',bodyMarkdown:'Test body',sourceIds:['s1'],provenance:{kind:'ai_generated_original',evidence:'Synthetic'}}];
  assert.throws(()=>domain.validateImport(a), /note_question_link_required/);
  a.noteQuestionLinks=[{noteId:'n1',questionId:'q1',relation:'explains',section:''}]; assert.equal(domain.validateImport(a).notes.length,1);
  a.notes[0].reviews=[]; assert.throws(()=>domain.validateImport(a));
});
const input=()=>({catalog:{concepts:[{conceptId:'c1',label:'One concept',aliases:[],subjectTags:['medicine']}],questions:[q('q1'),q('q2',{stem:'Different question?',conceptLinks:[{conceptId:'c1',role:'distractor'},{conceptId:'c2',role:'primary'}]}),q('hidden',{status:'in_review'})]}, notes:[{id:'n1',concept_id:'c1',title:'Published note',body_markdown:'Body',status:'published'},{id:'n2',concept_id:'c1',title:'Secret draft',body_markdown:'Secret',status:'draft'}], questionMetadata:[{question_id:'q1',origins:[origin('marrow'),pyq('neet-pg',2025)],classification:facets},{question_id:'q2',origins:[origin('prepladder'),origin('marrow')],classification:facets}], conceptMetadata:[], links:[], stats:[{question_id:'q1',attempts:3,wrong:2,latest_correct:false}]});
test('learner projection removes drafts and answer keys but preserves private observed counts', () => {
  assert.equal(typeof domain.projectLibrary, 'function');
  const result=domain.projectLibrary(input()); assert.equal(result.questions.length,2); assert.equal(result.notes.length,1);
  assert.equal(JSON.stringify(result).includes('Do not reveal.'),false); assert.equal(JSON.stringify(result).includes('answerOptionId'),false); assert.equal(JSON.stringify(result).includes('Secret'),false);
  assert.deepEqual(result.questions[0].observed,{attempts:3,wrong:2,latestCorrect:false,state:'incorrect',repeatedWrong:true});
  assert.equal(result.questions[1].observed.state,'unattempted');
});
test('exclusive source filters suppress lower platforms and count a repeated PYQ once', () => {
  assert.equal(typeof domain.filterLibrary, 'function');
  const result=domain.projectLibrary(input());
  assert.deepEqual(domain.filterLibrary(result,{platform:'marrow'}).questions.map(x=>x.questionId),['q2']);
  assert.equal(domain.filterLibrary(result,{platform:'prepladder'}).questions.length,0);
  assert.deepEqual(domain.filterLibrary(result,{exam:'neet-pg'}).questions.map(x=>x.questionId),['q1']);
});
test('both views can identify exact assessment and confusing questions for one concept', () => {
  assert.equal(typeof domain.filterLibrary, 'function');
  const result=domain.filterLibrary(domain.projectLibrary(input()),{concept:'c1',subject:'medicine'});
  assert.deepEqual(result.questions.map(x=>[x.questionId,x.connection]),[['q1','assesses'],['q2','confusing']]);
  assert.equal(result.notes[0].conceptId,'c1');
});
test('published graph does not reveal orphan unpublished concept metadata', () => {
  assert.equal(typeof domain.projectLibrary, 'function');
  const a=input(); a.catalog.concepts.push({conceptId:'secret',label:'Draft-only diagnosis',subjectTags:[]});
  assert.equal(domain.projectLibrary(a).concepts.some(x=>x.conceptId==='secret'),false);
});
test('projection must not mutate approved classification metadata',()=>{
  const a=input();a.questionMetadata[0].classification={subjects:[],systems:[],organs:[],domains:[],tasks:[]};
  Object.freeze(a.questionMetadata[0].classification);assert.doesNotThrow(()=>domain.projectLibrary(a));
});

test('explicit note links connect questions outside that concept without inventing primary relationships',()=>{const a=input();a.catalog.questions[1].conceptLinks=[{conceptId:'c2',role:'primary'}];a.links=[{note_version_id:'n1',question_id:'q2',relation:'contrasts',section:'Differential'}];const r=domain.filterLibrary(domain.projectLibrary(a),{concept:'c1'});assert.deepEqual(r.questions.map(q=>[q.questionId,q.connection]),[['q1','assesses'],['q2','confusing']]);});

test('approved legacy PYQ provenance overrides later platform metadata without inventing a session',()=>{for(const kind of ['licensed_pyq','recalled_pyq']){const a=input();a.catalog.questions[0].provenance={kind,exam:'NEET PG',year:2023,evidence:'Approved legacy occurrence'};a.questionMetadata[0].origins=[origin('marrow')];const result=domain.projectLibrary(a).questions[0];assert.deepEqual(result.home,{kind:'pyq',platforms:[],exams:['neet-pg']});assert.equal(result.origins.find(o=>o.kind==='pyq').session,'unspecified');}});
test('reviewed duplicate metadata preserves additional confusing concept connections',()=>{const a=input();a.catalog.concepts.push({conceptId:'c2',label:'Other concept',subjectTags:['medicine']});a.questionMetadata[0].concept_links_version_id='q1@1';a.questionMetadata[0].concept_links=[{conceptId:'c1',role:'primary'},{conceptId:'c2',role:'distractor'}];const result=domain.filterLibrary(domain.projectLibrary(a),{concept:'c2'});assert.equal(result.questions.find(q=>q.questionId==='q1').connection,'confusing');});
test('current published version alone owns the primary concept; old metadata cannot revive it',()=>{const a=input();a.catalog.questions[0].conceptLinks=[{conceptId:'c2',role:'primary'}];a.questionMetadata[0].concept_links=[{conceptId:'c1',role:'primary'}];a.questionMetadata[0].concept_links_version_id='q1@1';const q=domain.projectLibrary(a).questions[0];assert.deepEqual(q.conceptLinks,[{conceptId:'c2',role:'primary'}]);});
test('additive medical links from an earlier question version do not attach to its revision',()=>{const a=input();a.catalog.questions[0].questionVersionId='q1@2';a.questionMetadata[0].concept_links=[{conceptId:'c2',role:'distractor'}];a.questionMetadata[0].concept_links_version_id='q1@1';assert.equal(domain.projectLibrary(a).questions[0].conceptLinks.some(l=>l.conceptId==='c2'),false);});
