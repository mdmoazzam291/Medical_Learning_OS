import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePreviewData,parsePreviewFilters,previewPage} from '../src/domain/nmc-admin-learner-preview.js';
import {learnerPreviewMarkup} from '../web/nmc-admin-learner-preview.js';
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
