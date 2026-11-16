// Builds data/nmc-admin-learner-preview.json from the owner decisions and the interim AI review.
// Admin-only preview data: draft learning objectives (repository text) plus catalogue metadata.
// No official NMC description text is included. Usage: node ops/nmc/build-admin-learner-preview.js [--check]
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const review=read('docs/evidence/2026-11-16-nmc-interim-ai-review.json');
const catalogue=read('data/nmc-reference-catalogue.json');
const ref=new Map(catalogue.references.map(r=>[r.referenceId,r]));
const topic=new Map(catalogue.topics.map(t=>[t.topicId,t]));
const SUBJECTS={anatomy:'Anatomy',physiology:'Physiology',biochemistry:'Biochemistry',pharmacology:'Pharmacology',pathology:'Pathology',microbiology:'Microbiology','forensic-medicine':'Forensic Medicine & Toxicology','community-medicine':'Community Medicine',medicine:'General Medicine',pediatrics:'Paediatrics',psychiatry:'Psychiatry',dermatology:'Dermatology',surgery:'General Surgery',ophthalmology:'Ophthalmology',ent:'ENT','obstetrics-gynaecology':'Obstetrics & Gynaecology',orthopaedics:'Orthopaedics',anaesthesia:'Anaesthesiology',radiology:'Radiodiagnosis'};
const decisions=read('docs/evidence/2026-11-16-nmc-owner-decisions.json').decisions;
const ledger=new Map(read('docs/evidence/2026-11-16-nmc-exception-ledger.json').records.map(e=>[e.ledgerId,e]));
const grouping=new Map();
for(const d of decisions.filter(d=>d.category==='surgery-topic-label'&&d.decision==='accepted'))
 for(const id of ledger.get(d.ledgerId).originalValue.referenceIds) grouping.set(id,d.acceptedValue.groupingLabel.replace(/^Surgery Topic \d+ · /,''));
const items=review.rows.map(r=>{
 const c=ref.get(r.referenceId);if(!c)throw new Error('reference missing '+r.referenceId);
 const t=topic.get(c.topicId);
 return {objectiveRevisionId:r.reviewedRevisionId,referenceId:r.referenceId,code:c.observedCode,subjectId:c.subjectId,
  topicId:c.topicId,topicLabel:grouping.get(r.referenceId)||(t?t.label:null),topicLabelKind:grouping.has(r.referenceId)?'editorial-grouping':'source-topic',pdfPage:c.pdfPage,mode:r.finalValue.mode,objective:r.finalValue.draftTask,reviewOutcome:r.outcome};
}).sort((a,b)=>a.subjectId.localeCompare(b.subjectId)||a.pdfPage-b.pdfPage||a.code.localeCompare(b.code));
const out={schemaVersion:1,contractId:'nmc-admin-learner-preview-v1',audience:'admin-only',learnerActivation:false,
 sourceEdition:catalogue.edition,sourceUrl:catalogue.sourceUrl,
 status:'owner-accepted, interim AI-reviewed; faculty review pending',
 subjects:[...new Set(items.map(i=>i.subjectId))].map(id=>({subjectId:id,label:SUBJECTS[id]||id})),items};
const text=JSON.stringify(out)+'\n';
const target=new URL('../../data/nmc-admin-learner-preview.json',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==text)throw new Error('preview data out of date');}
else writeFileSync(target,text);
console.log(items.length,createHash('sha256').update(text).digest('hex'));
