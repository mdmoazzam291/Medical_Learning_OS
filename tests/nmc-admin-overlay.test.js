import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conceptFromSearch,overlaySummary} from '../web/nmc-admin-overlay.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('concept IDs from the URL are validated',()=>{
 assert.equal(conceptFromSearch('?concept=C-101d60e987915f6fa8175c469a265f79'),'C-101d60e987915f6fa8175c469a265f79');
 assert.equal(conceptFromSearch('?concept=<script>'),'');assert.equal(conceptFromSearch(''),'');
 assert.match(overlaySummary(''),/Admin preview \(AI draft\)/);assert.match(overlaySummary('C-x'),/this concept/);
});
test('learner pages carry a hidden slot and the Admin-gated boot only',()=>{
 for(const page of ['web/library.html','web/nmc-catalogue.html','web/vault.html']){
  const html=read(page);
  assert.match(html,/<section id="nmc-admin-overlay"[^>]*hidden><\/section>/,page);
  assert.match(html,/src="\/web\/nmc-admin-overlay-boot\.js"/,page);
 }
});
test('overlay asks the server for Admin status before showing or loading anything',()=>{
 const src=read('web/nmc-admin-overlay.js');
 const gate=src.indexOf('resolveAdminAccess(readAccess)'),show=src.indexOf('root.hidden=false'),mount=src.indexOf('mountLearnerPreview({');
 assert.ok(gate>0&&gate<show&&show<mount);
 assert.match(src,/if\(!details\.open\)/);
 const boot=read('web/nmc-admin-overlay-boot.js');
 assert.match(boot,/review\.me\(\)/);assert.match(boot,/owner\.adminLearnerPreview/);
 assert.doesNotMatch(boot+src,/content-library-api|_publish_|study_start|\/publish\b/);
});
