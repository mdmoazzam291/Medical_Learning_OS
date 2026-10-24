import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {workspaceContent} from '../web/workspace-view.js';
const source=(await readFile(new URL('../web/workspace.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function open(search,{failure=false,guest=false}={}){
 const calls=[],root={innerHTML:'',addEventListener(){}};
 const cloud={async recentActivity(offset){calls.push(['activity',offset]);return {items:[{attemptId:'a1',representation:'original',questionVersionId:'q@1'}],nextOffset:null};},async attemptReview(id){calls.push(['review',id]);if(failure)throw Error('private provider detail');return {availability:'restricted',attempt:{correct:false},question:null,receipt:null};}};
 const context=vm.createContext({URLSearchParams,location:{pathname:'/web/workspace.html',search,hash:''},document:{querySelector:s=>s==='#workspace-app'?root:{}},window:{addEventListener(){}},routeIdentity:()=>({master:'home',section:'recent'}),navigationFor:()=>[{id:'recent',label:'Recent Activity'}],preferenceStore:()=>({}),createSupabaseAuth:()=>({getSession:async()=>guest?null:{user:{id:'alice'}}}),createCloudStudy:()=>cloud,cloudConfig:{},workspaceContent,guestToolContent:()=>'<p>Sign in</p>',e:String});
 vm.runInContext(source,context);await new Promise(r=>setImmediate(r));return {calls,html:root.innerHTML};
}
test('direct saved-review entry and reload preserve the exact attempt and activity page',async()=>{for(let i=0;i<2;i++){const p=await open('?master=home&section=recent&offset=50&attempt=a1');assert.deepEqual(p.calls,[['activity',50],['review','a1']]);assert.match(p.html,/Review unavailable/);assert.match(p.html,/offset=50/);}});
test('review failure preserves activity and hides provider error details',async()=>{const p=await open('?attempt=a1',{failure:true});assert.match(p.html,/Review unavailable/);assert.match(p.html,/q@1/);assert.doesNotMatch(p.html,/private provider/);});
test('guest cannot trigger attempt retrieval',async()=>{const p=await open('?attempt=a1',{guest:true});assert.deepEqual(p.calls,[]);assert.match(p.html,/Sign in/);});
