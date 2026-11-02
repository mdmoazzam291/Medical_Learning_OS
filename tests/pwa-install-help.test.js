import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from '../scripts/build-pages.js';
import {navigationMarkup} from '../web/navigation-view.js';
test('normal bundle offers script-free installation help with a standalone Home route',async()=>{
 const out=await mkdtemp(join(tmpdir(),'install-help-'));
 try{
  await buildPages({outputDirectory:out});
  const html=await readFile(join(out,'web/install.html'),'utf8');
  assert.match(html,/<h1>Install Medretica<\/h1>/);
  assert.match(html,/href="\/"/);assert.match(html,/rel="manifest"/);
  assert.doesNotMatch(html,/<script\b|<form\b|javascript:|Public preview|Install Medretica Preview|cannot sign you in/i);
  for(const text of ['Safari','Chrome','Open as Web App','internet connection','inside another app','Sign in','Home'])assert.ok(html.includes(text),text);
  for(const href of [...html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)].map(m=>m[1]))await readFile(join(out,href==='/'?'index.html':href.slice(1)));
  const manifest=JSON.parse(await readFile(join(out,'web/manifest.webmanifest'),'utf8'));assert.equal(manifest.name,'Medretica');assert.equal(manifest.start_url,'/');
 }finally{await rm(out,{recursive:true,force:true});}
});
test('guest and signed-in phone/tablet/desktop menus expose installation help',()=>{
 for(const signedIn of [false,true])for(const phone of [false,true])for(const currentHref of ['/','/web/account.html','/web/account','/web/library.html']){
  const html=navigationMarkup({signedIn,phone,currentHref});assert.match(html,/<a href="\/web\/install.html">(?:[^<]*|<[^>]+>)*?Install Medretica/);
 }
});
