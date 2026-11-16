import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePreviewData,parsePreviewFilters,previewPage} from '../src/domain/nmc-admin-learner-preview.js';
import {learnerPreviewMarkup} from '../web/nmc-admin-learner-preview.js';
const raw=readFileSync(new URL('../data/nmc-admin-learner-preview.json',import.meta.url));
const data=JSON.parse(raw);
const review=JSON.parse(readFileSync(new URL('../docs/evidence/2026-11-16-nmc-interim-ai-review.json',import.meta.url),'utf8'));
const fn=readFileSync(new URL('../supabase/functions/nmc-admin-preview/index.ts',import.meta.url),'utf8');
test('preview data is admin-only, valid and matches the interim review',()=>{
 validatePreviewData(data);
 assert.equal(data.items.length,170);assert.equal(data.audience,'admin-only');assert.equal(data.learnerActivation,false);
 const finals=new Map(review.rows.map(r=>[r.reviewedRevisionId,r.finalValue.draftTask]));
 for(const i of data.items){assert.equal(i.objective,finals.get(i.objectiveRevisionId));assert.ok(i.topicLabel);}
 assert.equal(review.clinicalErrorsFound,0);assert.equal(review.rows.filter(r=>r.outcome==='cleanup-applied').length,3);
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
 const all=previewPage(data,parsePreviewFilters({}));assert.equal(all.matched,170);
 assert.equal(all.topics.reduce((n,t)=>n+t.objectives.length,0),170);
 const s=previewPage(data,parsePreviewFilters({subject:'surgery'}));
 assert.ok(s.topics.every(t=>t.subjectId==='surgery'));
 assert.ok(s.topics.some(t=>t.topicLabelKind==='editorial-grouping'));
 assert.throws(()=>previewPage(data,{subject:'nope',search:''}));
 assert.equal(previewPage(data,parsePreviewFilters({search:'rabies'})).matched,1);
});
test('markup shows the Admin-only banner and escapes content',()=>{
 const p=previewPage(data,{});
 const html=learnerPreviewMarkup(p,{});
 assert.match(html,/Admin preview only/);assert.match(html,/Learners cannot see this/);
 const evil=learnerPreviewMarkup({...p,topics:[{subjectId:'x',topicLabel:'<img src=x>',objectives:[{objective:'<script>',mode:'knowledge',code:'A',pdfPage:1}]}]},{});
 assert.doesNotMatch(evil,/<script>|<img src=x>/);
});
