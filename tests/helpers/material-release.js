import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const facets = () => ({subjects:['physiology'],systems:[],organs:[],domains:[],tasks:[]});
export const gates = () => ['extraction','medical','key','provenance','options','image','rights','identity','learning-utility'].map(gate=>({gate,status:gate==='image'?'not_applicable':'passed',evidenceRefs:gate==='image'?[]:[{sourceId:'test-source',locator:'synthetic-test-only'}]}));
export function makeQuestion(id='test-q',overrides={}) {
  return {recordId:id,recordVersion:1,contentFile:`questions/${id}-v1.md`,app:{questionId:id,stem:`Artificial token ${id}: select the first symbol.`,options:[{optionId:'first',text:'Circle'},{optionId:'second',text:'Square'}],answerOptionId:'first',explanation:'Synthetic nonclinical fixture: the first symbol is requested.',conceptLinks:[{conceptId:'test-concept',role:'primary'}],sourceIds:['test-source'],origins:[],classification:facets(),...overrides},archive:{fixture:true,gates:gates(),notApplicableReasons:{image:'No image in this artificial text fixture.'}}};
}
export function makeNote(id='test-note',questionIds=['test-q'],overrides={}) {
  return {recordId:id,recordVersion:1,contentFile:`notes/${id}-v1.md`,app:{noteId:id,conceptId:'test-concept',title:'Artificial shapes',bodyMarkdown:'# Artificial shapes\n\nA test-only note.\n',sourceIds:['test-source'],provenance:{kind:'ai_generated_original',evidence:'Artificial test fixture; not clinical teaching material.'},...overrides},archive:{fixture:true,gates:gates(),linkedQuestionIds:questionIds}};
}
// Literal independent Markdown expectation, deliberately not rendered using production functions.
export function fixtureQuestionMarkdown(r,occurrences=[]) {
  return `# Question ${r.recordId}\n\nVersion: ${r.recordVersion}\n\n${r.app.stem}\n\n${r.app.options.map(o=>`${o.optionId}. ${o.text}`).join('\n')}\n\nAnswer: ${r.app.answerOptionId}\n\n${r.app.explanation}\n\nMetadata:\n\n${JSON.stringify({conceptLinks:r.app.conceptLinks,sourceIds:r.app.sourceIds,classification:r.app.classification,origins:r.app.origins,intelligence:r.app.intelligence??null,occurrences,archive:r.archive},null,2)}\n`;
}
export function makeRelease(overrides={}) {
  const c={recordId:'test-concept',recordVersion:1,contentFile:'content/test-concept-v1.md',app:{conceptId:'test-concept',label:'Artificial symbols',aliases:[],subjectTags:['physiology'],classification:facets()},archive:{fixture:true}};
  const s={recordId:'test-source',recordVersion:1,contentFile:null,app:{sourceId:'test-source',title:'Synthetic nonclinical source',url:null,version:'test-v1',evidence:'Test-only original fixture.'},archive:{fixture:true,rightsStatus:'owned'}};
  const q=makeQuestion();
  const records={concepts:[c],sources:[s],questions:[q],notes:[],occurrences:[],relations:[]};
  const release={manifest:{releaseId:'test-release',releaseSchemaVersion:1,createdAt:'2026-10-08T00:00:00.000Z',priorReleaseId:null,ruleVersion:4,files:[],counts:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v.length])),eligibility:{intendedUse:'app_publication',includedIds:['test-q'],excluded:[]}},records,markdown:{'content/test-concept-v1.md':`# Concept test-concept\n\nVersion: 1\n\nArtificial symbols\n\n${JSON.stringify({aliases:[],subjectTags:['physiology'],classification:facets(),archive:{fixture:true}},null,2)}\n`,'questions/test-q-v1.md':fixtureQuestionMarkdown(q)},assetsManifest:null,...overrides};
  return release;
}
export function makeTarget(overrides={}) {return {contractId:'content-library-inbox-v1',capturedAt:'2026-10-08T00:00:00.000Z',environment:'isolated-test',catalog:{schemaVersion:1,concepts:[],sources:[],questions:[]},questionMetadata:[],conceptMetadata:[],...overrides};}
export function refreshRelease(r){
  r.manifest.counts=Object.fromEntries(Object.entries(r.records).map(([k,v])=>[k,v.length]));
  for(const q of r.records.questions)r.markdown[q.contentFile]=fixtureQuestionMarkdown(q,r.records.occurrences.filter(o=>o.questionId===q.recordId).sort((a,b)=>a.occurrenceId.localeCompare(b.occurrenceId)));
  for(const c of r.records.concepts)r.markdown[c.contentFile]=`# Concept ${c.recordId}\n\nVersion: ${c.recordVersion}\n\n${c.app.label}\n\n${JSON.stringify({aliases:c.app.aliases,subjectTags:c.app.subjectTags,classification:c.app.classification,archive:c.archive},null,2)}\n`;
  for(const n of r.records.notes)r.markdown[n.contentFile]=n.app.bodyMarkdown;
  return r;
}
export function targetFor(r){
  const c=r.records.concepts.map(c=>{const {classification,...rest}=c.app;return rest;});
  const s=r.records.sources.map(s=>({sourceId:s.recordId,title:s.app.title,url:s.app.url,version:s.app.version,rights:{status:'owned',evidence:s.app.evidence}}));
  const qs=r.records.questions.map(q=>{const {origins,classification,intelligence,...content}=q.app;return {...content,questionVersionId:q.recordId+'@'+q.recordVersion,version:q.recordVersion,supersedes:q.recordVersion>1?q.recordId+'@'+(q.recordVersion-1):null,authorId:'test-author',changeReason:'Artificial fixture only.',provenance:{kind:'original',exam:null,year:null,evidence:'Synthetic fixture'},status:'draft',reviews:[],publishedAt:null};});
  return structuredClone(makeTarget({catalog:{schemaVersion:1,concepts:c,sources:s,questions:qs},questionMetadata:r.records.questions.map(q=>({question_id:q.recordId,origins:q.app.origins,classification:q.app.classification,intelligence:q.app.intelligence??null})),notes:r.records.notes.map(n=>n.app)}));
}
export async function writeFixtureRelease(directory,release) {
  await mkdir(directory,{recursive:true});
  const schema=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../../docs/material-release-schema-v1.json',import.meta.url),'utf8'));
  const payloads={'schema.json':JSON.stringify(schema,null,2)+'\n','changes.jsonl':'','validation.md':'Synthetic structural fixture; no clinical review.\n','INGESTION.md':'Test-only handoff.\n',...release.markdown};
  for(const [key,rows] of Object.entries(release.records))payloads[`records/${key}.jsonl`]=rows.map(row=>JSON.stringify(row)).join('\n')+(rows.length?'\n':'');
  if(release.assetsManifest)payloads['assets-manifest.json']=JSON.stringify(release.assetsManifest)+'\n';
  release.manifest.counts=Object.fromEntries(Object.entries(release.records).map(([k,v])=>[k,v.length]));
  release.manifest.files=Object.entries(payloads).map(([path,bytes])=>({path,sha256:sha(bytes),bytes:Buffer.byteLength(bytes),kind:path.startsWith('records/')?'dataset':path.endsWith('.md')?'markdown':'metadata'}));
  for(const [path,bytes] of Object.entries(payloads)){await mkdir(dirname(join(directory,path)),{recursive:true});await writeFile(join(directory,path),bytes);}
  await writeFile(join(directory,'manifest.json'),JSON.stringify(release.manifest,null,2)+'\n');
}
