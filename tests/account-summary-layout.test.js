import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/account.js',import.meta.url),'utf8');
const signedIn=source.slice(source.indexOf('function signedIn() {'),source.indexOf('\nfunction render()'));
function render(overrides={}){
 const state={user:{email:'learner@example.invalid'},progress:{attempts:12,correct:7},questions:[{}],projectionErrors:{},loading:false,isAdmin:false,...overrides};
 return vm.runInNewContext(signedIn+';signedIn()', {state,preparationState:{},escape:s=>String(s),preparationAccountMarkup:()=>'',recoveryPasswordPanel:()=>'',signInMethodsPanel:()=>'',retentionPilotPanel:()=>''});
}
test('Account summary exposes four unchanged learning destinations as labelled navigation',()=>{
 const html=render(),nav=html.match(/<nav[^>]*aria-label="Account shortcuts"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav,'Account shortcuts form a labelled navigation landmark');
 assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),['/','/web/medical.html','/web/exam.html','/web/vault.html']);
 for(const value of [12,7,1])assert.ok(html.includes('<strong>'+value+'</strong>'));
});
test('Account summary preserves zero, unknown and refresh failure semantics',()=>{
 const zero=render({progress:{attempts:0,correct:0},questions:[]});assert.equal((zero.match(/<strong>0<\/strong>/g)||[]).length,3);
 const unavailable=render({progress:null,questions:null,projectionErrors:{questions:'unavailable'}});assert.equal((unavailable.match(/<strong>—<\/strong>/g)||[]).length,3);assert.match(unavailable,/Some account data could not be refreshed/);
 const loading=render({loading:true});assert.match(loading,/Loading your learning account/);assert.match(loading,/aria-label="Account shortcuts"/);assert.doesNotMatch(loading,/Recorded attempts/);
});
