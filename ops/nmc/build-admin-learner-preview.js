// Builds data/nmc-admin-learner-preview.json from the objective registry (all draft objectives, @25+).
// Admin-only preview data: draft learning objectives (repository text) plus catalogue metadata.
// No official NMC description text is included. Usage: node ops/nmc/build-admin-learner-preview.js [--check]
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const reg=read('data/nmc-learning-foundation-drafts.json');
const catalogue=read('data/nmc-reference-catalogue.json');
const overlay=read('data/nmc-reference-overlay.json');
const ref=new Map(catalogue.references.map(r=>[r.referenceId,r]));
const topic=new Map(catalogue.topics.map(t=>[t.topicId,t]));
const grouping=new Map(overlay.rows.filter(r=>r.kind==='topic-group').map(r=>[r.referenceId,r.value.replace(/^[A-Za-z ]+Topic \d+ · /,'')]));
const SUBJECTS={anatomy:'Anatomy',physiology:'Physiology',biochemistry:'Biochemistry',pharmacology:'Pharmacology',pathology:'Pathology',microbiology:'Microbiology','forensic-medicine':'Forensic Medicine & Toxicology','community-medicine':'Community Medicine',medicine:'General Medicine',surgery:'General Surgery','obstetrics-gynaecology':'Obstetrics & Gynaecology',pediatrics:'Paediatrics',ent:'ENT',ophthalmology:'Ophthalmology',orthopaedics:'Orthopaedics',dermatology:'Dermatology',psychiatry:'Psychiatry',anaesthesia:'Anaesthesiology',radiology:'Radiodiagnosis'};
const firstBinding=new Map();for(const b of reg.sourceBindings)if(!firstBinding.has(b.objectiveVersionId))firstBinding.set(b.objectiveVersionId,b);
const items=reg.objectives.map(row=>{
 const o=row.objective,b=firstBinding.get(o.objectiveVersionId),c=ref.get(b.referenceId),t=topic.get(c.topicId);
 return {objectiveRevisionId:'nmc-objrev:'+createHash('sha256').update(o.objectiveVersionId).digest('hex').slice(0,16),objectiveVersionId:o.objectiveVersionId,
  referenceId:b.referenceId,code:c.observedCode,subjectId:c.subjectId,topicId:c.topicId,topicLabel:grouping.get(b.referenceId)||(t?t.label:null),
  topicLabelKind:grouping.has(b.referenceId)?'editorial-grouping':'source-topic',pdfPage:c.pdfPage,
  mode:row.assessability==='in-app'?'knowledge':'performance-and-knowledge',task:o.task,assessability:row.assessability,objective:row.wording};
}).sort((a,b)=>a.subjectId.localeCompare(b.subjectId)||a.pdfPage-b.pdfPage||a.code.localeCompare(b.code)||a.objectiveVersionId.localeCompare(b.objectiveVersionId));
const out={schemaVersion:1,contractId:'nmc-admin-learner-preview-v1',audience:'admin-only',learnerActivation:false,
 sourceEdition:catalogue.edition,sourceUrl:catalogue.sourceUrl,registryVersion:reg.draftVersion,
 status:'AI-drafted objectives; faculty review skipped by owner; not published to learners',
 subjects:[...new Set(items.map(i=>i.subjectId))].sort().map(id=>({subjectId:id,label:SUBJECTS[id]||id})),items};
const text=JSON.stringify(out)+'\n';
const target=new URL('../../data/nmc-admin-learner-preview.json',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==text)throw new Error('preview data out of date');}
else writeFileSync(target,text);
console.log(items.length,createHash('sha256').update(text).digest('hex'));
