import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as pages from '../scripts/build-pages.js';
async function files(dir,prefix='') {let result=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=prefix+e.name;if(e.isDirectory())result.push(...await files(join(dir,e.name),path+'/'));else result.push(path);}return result.sort();}
test('public install profile excludes all application/config scripts and protects account/OAuth routes',async()=>{
 const out=await mkdtemp(join(tmpdir(),'mlos-public-preview-'));
 try{
  await pages.buildPages({outputDirectory:out,publicPreview:true});const list=await files(out);
  assert.ok(!list.some(x=>x.endsWith('.js')||x.startsWith('src/')||x.startsWith('data/')),'no application/config SDK scripts shipped');
  for(const path of list.filter(x=>x.endsWith('.html'))){const html=await readFile(join(out,path),'utf8');assert.doesNotMatch(html,/<script\b|<form\b|type=["']password/i,path);assert.match(html,/Public preview/,path);assert.match(html,/rel="manifest"/,path);}
  for(const path of ['web/account.html','web/workspace.html','web/oauth-consent.html','web/concept-http-check.html'])assert.match(await readFile(join(out,path),'utf8'),/Accounts and study data are unavailable/);
  for(const path of ['web/manifest.webmanifest','web/app-icon-192.png','web/app-icon-512.png'])assert.ok(list.includes(path));
  assert.deepEqual(await readFile(join(out,'index.html')),await readFile(join(out,'web/index.html')));
  for(const path of list.filter(x=>x.endsWith('.html'))){const html=await readFile(join(out,path),'utf8');for(const m of html.matchAll(/<link rel="stylesheet" href="([^"?]+)[^"]*"/g))assert.ok(list.includes(m[1].slice(1)),path+' stylesheet ships');}
  const headers=await readFile(join(out,'_headers'),'utf8');for(const directive of ["default-src 'none'","script-src 'none'","connect-src 'none'","form-action 'none'","manifest-src 'self'"])assert.ok(headers.includes(directive),directive);
  assert.match(await readFile(join(out,'robots.txt'),'utf8'),/Disallow: \//);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('preview selection is exact and cannot silently change main or controlled review builds',()=>{
 const select=pages.publicPreviewForBuild;
 assert.equal(select({}),false);assert.equal(select({WORKERS_CI_BRANCH:'main'}),false);
 assert.equal(select({WORKERS_CI_BRANCH:'feat/pwa-install-foundation-20261102'}),true);
 assert.equal(select({WORKERS_CI_BRANCH:'feat/admin-syllabus-review-preflight-20261029'}),false);
 assert.equal(select({MLOS_PAGES_PUBLIC_PREVIEW:'1'}),true);
 assert.throws(()=>select({WORKERS_CI_BRANCH:'main',MLOS_PAGES_PUBLIC_PREVIEW:'1'}),/production/);
 assert.throws(()=>select({MLOS_PAGES_PUBLIC_PREVIEW:'yes'}),/invalid/);
});
