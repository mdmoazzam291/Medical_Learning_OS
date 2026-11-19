import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePreviewData,parsePreviewFilters,previewPage} from '../src/domain/nmc-admin-learner-preview.js';
import {learnerPreviewMarkup,conceptLayerMarkup,validPreviewResult} from '../web/nmc-admin-learner-preview.js';
const raw=readFileSync(new URL('../data/nmc-admin-learner-preview.json',import.meta.url));
const data=JSON.parse(raw);
const fn=readFileSync(new URL('../supabase/functions/nmc-admin-preview/index.ts',import.meta.url),'utf8');
const pack=JSON.parse(readFileSync(new URL('../data/nmc-learning-foundation-drafts.json',import.meta.url),'utf8'));
test('preview data is admin-only, valid and lists every registry objective',()=>{
 validatePreviewData(data);
 assert.equal(data.items.length,pack.objectives.length);assert.equal(data.audience,'admin-only');assert.equal(data.learnerActivation,false);
 assert.equal(data.registryVersion,pack.draftVersion);
 const byId=new Map(pack.objectives.map(r=>[r.objective.objectiveVersionId,r]));
 for(const i of data.items){const r=byId.get(i.objectiveVersionId);assert.equal(i.objective,r.wording);assert.equal(i.task,r.objective.task);assert.equal(i.assessability,r.assessability);assert.equal(i.reviewState,r.reviewState);assert.equal(i.prerequisiteCodes.length>0,r.objective.prerequisites.length>0);assert.ok(i.topicLabel);}
});
test('edge function pins the exact data checksum and requires Admin',()=>{
 const sha=fn.match(/DATA_SHA256 = "([0-9a-f]{64})"/)[1];
 assert.equal(createHash('sha256').update(raw).digest('hex'),sha);
 assert.match(fn,/raw\.githubusercontent\.com\/mdmoazzam291\/Medical_Learning_OS\/[0-9a-f]{40}\/data\/nmc-admin-learner-preview\.json/);
 assert.match(fn,/content_admin_status_v1/);assert.match(fn,/content_admin_required/);
 assert.doesNotMatch(fn,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
test('filters and grouping',()=>{
 assert.throws(()=>parsePreviewFilters({subject:'x',bad:'1'}));
 const all=previewPage(data,parsePreviewFilters({}));assert.equal(all.filterRequired,true);assert.equal(all.topics.length,0);assert.equal(all.total,data.items.length);
 const s=previewPage(data,parsePreviewFilters({subject:'surgery'}));
 assert.ok(s.topics.every(t=>t.subjectId==='surgery'));
 assert.ok(s.topics.some(t=>t.topicLabelKind==='editorial-grouping'));
 assert.equal(s.matched,s.topics.reduce((n,t)=>n+t.objectives.length,0));
 assert.throws(()=>previewPage(data,{subject:'nope',search:''}));
 assert.ok(previewPage(data,parsePreviewFilters({search:'rabies'})).matched>=1);
});
test('markup shows the Admin-only banner and escapes content',()=>{
 const p=previewPage(data,{subject:'surgery',search:''});
 const html=learnerPreviewMarkup(p,{});
 assert.match(html,/Admin preview only/);assert.match(html,/Learners cannot see this/);assert.match(html,/not faculty-reviewed/);assert.match(learnerPreviewMarkup(previewPage(data,{}),{}),/Choose a subject or search/);
 const evil=learnerPreviewMarkup({...p,topics:[{subjectId:'x',topicLabel:'<img src=x>',objectives:[{objective:'<script>',mode:'knowledge',code:'A',pdfPage:1}]}]},{});
 assert.doesNotMatch(evil,/<script>|<img src=x>/);
});
test('preview shows AI-draft concept layers once per concept per topic, escaped',()=>{
 const data=JSON.parse(readFileSync(new URL('../data/nmc-admin-learner-preview.json',import.meta.url)));
 validatePreviewData(data);
 const p=previewPage(data,parsePreviewFilters({search:'rabies'}));
 const layer=p.topics.flatMap(t=>t.concepts).find(c=>c.label==='Rabies');
 assert.ok(layer&&layer.misconceptions.length>=1);
 for(const t of p.topics)assert.equal(new Set(t.concepts.map(c=>c.conceptId)).size,t.concepts.length);
 const html=learnerPreviewMarkup(p,{});
 assert.match(html,/Concept links and misconceptions/);assert.match(html,/Common misconceptions/);assert.match(html,/check against current guidelines/);
 const evil=conceptLayerMarkup({label:'<b>x',after:[{label:'<i>',strength:'essential',reason:'<s>'}],confusedWith:[],misconceptions:[{misconception:'<script>',correction:'<x>',kind:'reversed',guidelineSensitive:false}],presentations:[]});
 assert.doesNotMatch(evil,/<script>|<b>x|<i>/);
 assert.throws(()=>validatePreviewData({...data,concepts:[]}),/preview_data_invalid/);
});
test('concept-wise browsing reaches every objective through only its linked subjects',()=>{
 const index=previewPage(data,parsePreviewFilters({view:'concept'}));
 assert.equal(index.view,'concept');assert.equal(index.matched,index.totalConcepts);
 const conceptIds=new Set(data.items.map(i=>i.conceptId));
 assert.equal(index.concepts.length,conceptIds.size);
 assert.equal(index.concepts.reduce((n,c)=>n+c.objectiveCount,0),data.items.length);
 let reached=0;
 for(const c of index.concepts){
  const page=previewPage(data,parsePreviewFilters({view:'concept',concept:c.conceptId}));
  const own=data.items.filter(i=>i.conceptId===c.conceptId);
  assert.deepEqual(new Set(page.concept.subjectIds),new Set(own.map(i=>i.subjectId)));
  assert.ok(page.concept.sections.every(s=>s.objectives.length>0));
  reached+=page.concept.sections.reduce((n,s)=>n+s.objectives.length,0);
 }
 assert.equal(reached,data.items.length);
 const multi=index.concepts.find(c=>c.subjectIds.length>=4);assert.ok(multi);
 const page=previewPage(data,parsePreviewFilters({view:'concept',concept:multi.conceptId}));
 assert.ok(validPreviewResult(page));assert.equal(page.concept.sections.length,multi.subjectIds.length);
 const surgery=previewPage(data,parsePreviewFilters({view:'concept',subject:'surgery'}));
 assert.ok(surgery.concepts.length>0&&surgery.concepts.every(c=>c.subjectIds.includes('surgery')));
 assert.ok(previewPage(data,parsePreviewFilters({view:'concept',search:'rabies'})).concepts.some(c=>c.label==='Rabies'));
});
test('concept filters are validated',()=>{
 assert.throws(()=>parsePreviewFilters({concept:'C-abc'}));
 assert.throws(()=>parsePreviewFilters({view:'concept',concept:'not-an-id'}));
 assert.throws(()=>parsePreviewFilters({view:'tree'}));
 assert.throws(()=>previewPage(data,parsePreviewFilters({view:'concept',concept:'C-0000-missing'})));
 assert.equal(parsePreviewFilters({}).view,'subject');
});
test('subject search also matches concept names, and objectives link to their concept',()=>{
 const label=data.items.find(i=>i.conceptLabel&&!i.objective.toLowerCase().includes(i.conceptLabel.toLowerCase())).conceptLabel;
 const p=previewPage(data,parsePreviewFilters({search:label}));
 assert.ok(p.topics.flatMap(t=>t.objectives).some(o=>o.conceptLabel===label));
 assert.match(learnerPreviewMarkup(p,{}),/data-preview-concept="C-/);
});
test('concept markup keeps the Admin banner, escapes content and offers a way back',()=>{
 const index=previewPage(data,parsePreviewFilters({view:'concept'}));
 const html=learnerPreviewMarkup(index,{view:'concept'});
 assert.match(html,/Admin preview only/);assert.match(html,/Concept \(across subjects\)/);assert.match(html,/concepts\. Each concept lists only the subjects/);
 const page=previewPage(data,parsePreviewFilters({view:'concept',concept:index.concepts[0].conceptId}));
 const detail=learnerPreviewMarkup(page,{});
 assert.match(detail,/data-preview-back/);assert.match(detail,/Admin preview only/);assert.match(detail,/AI draft/);
 const evil=learnerPreviewMarkup({...index,concepts:[{conceptId:'C-x"><script>',label:'<img src=x>',subjectIds:['<b>'],objectiveCount:1}]},{});
 assert.doesNotMatch(evil,/<script>|<img src=x>|<b>/);
 assert.equal(validPreviewResult({...index,learnerActivation:true}),false);
});
