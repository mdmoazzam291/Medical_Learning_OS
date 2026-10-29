// Hosted Admin concept-drafts no-write access contract. Never log tokens or private bodies.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const missing='00000000-0000-4000-8000-000000000000';
export async function check({base,key,admin,learner,origin='',fetcher=fetch}){
 const u=new URL(base);
 assert.equal(u.protocol,'https:');assert.match(u.host,/^[a-z0-9-]+\.supabase\.co$/);
 assert.equal(u.pathname,'/');assert.ok(!u.search&&!u.hash&&!u.username&&!u.password);
 assert.match(key,/^sb_publishable_[A-Za-z0-9_-]+$/);
 assert.ok(admin?.length>30&&learner?.length>30&&admin!==learner,'Separate Admin and learner tokens required');
 if(origin){assert.equal(new URL(origin).origin,origin);assert.ok(origin.startsWith('https://'));}
 const endpoint=u.origin+'/functions/v1/owner-api/concept-drafts';const report=[];
 async function test(name,{token='',method='GET',path='',body,code,err,verify}={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  let res;try{res=await fetcher(endpoint+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});}
  catch(e){throw Error(name+': transport unavailable, no HTTP status established ('+(e?.name||'network')+')');}
  finally{clearTimeout(timer);}
  assert.equal(res.status,code,name+' HTTP status');assert.equal(res.headers.get('cache-control'),'no-store',name+' cache policy');
  if(origin)assert.equal(res.headers.get('access-control-allow-origin'),origin,name+' CORS policy');
  let payload;try{payload=await res.json();}catch{throw Error(name+': non-JSON response');}
  if(err)assert.equal(payload?.error,err,name+' error code');if(verify)verify(payload);report.push(name+': HTTP '+code);
 }
 await test('anonymous GET denied',{code:401,err:'unauthorized'});
 await test('anonymous POST denied',{method:'POST',body:{},code:401,err:'unauthorized'});
 await test('learner GET denied',{token:learner,code:403,err:'content_admin_required'});
 await test('learner POST denied',{token:learner,method:'POST',body:{},code:403,err:'content_admin_required'});
 await test('Admin inventory accessible',{token:admin,code:200,verify:d=>{assert.equal(d?.contractId,'admin-concept-drafts-v1');assert.ok(Array.isArray(d.concepts)&&Array.isArray(d.drafts));}});
 await test('Admin missing proposal',{token:admin,path:'/'+missing,code:404,err:'concept_draft_not_found'});
 await test('Admin invalid write rejected',{token:admin,method:'POST',body:{},code:400,err:'concept_draft_invalid'});
 return report;
}
async function selfTest(){
 const admin='a'.repeat(80),learner='l'.repeat(80),origin='https://medical-learning-os-web.medicalos.workers.dev';
 const args={base:'https://test-project.supabase.co/',key:'sb_publishable_test',admin,learner,origin};
 const calls=[];const fetcher=async(path,options)=>{
  const role=options.headers.Authorization==='Bearer '+admin?'admin':options.headers.Authorization==='Bearer '+learner?'learner':'anon';
  calls.push({role,method:options.method});const status=role==='anon'?401:role==='learner'?403:options.method==='POST'?400:path.endsWith(missing)?404:200;
  const code={401:'unauthorized',403:'content_admin_required',404:'concept_draft_not_found',400:'concept_draft_invalid'}[status];
  return new Response(JSON.stringify(status===200?{contractId:'admin-concept-drafts-v1',concepts:[],drafts:[]}:{error:code}),{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':origin}});
 };
 const r=await check({...args,fetcher});assert.equal(r.length,7);assert.equal(calls.filter(c=>c.method==='POST').length,3);
 await assert.rejects(()=>check({...args,learner:admin,fetcher}));
 await assert.rejects(()=>check({...args,fetcher:async()=>{throw Error('offline');}}),/transport unavailable/);
 console.log('PASS: seven HTTP contract checks and two failure regressions; no persistent write');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{if(process.argv[2]==='--self-test'&&process.argv.length===3)await selfTest();
 else if(process.argv.length===2){const result=await check({base:process.env.MLOS_SUPABASE_URL||'',key:process.env.MLOS_PUBLISHABLE_KEY||'',admin:process.env.MLOS_ADMIN_ACCESS_TOKEN||'',learner:process.env.MLOS_LEARNER_ACCESS_TOKEN||'',origin:process.env.MLOS_SITE_ORIGIN||''});result.forEach(x=>console.log(x));console.log('Hosted no-write access PASS; browser UI and authorized write/readback are separate gates');}
 else throw Error('Usage: node scripts/live-concept-drafts-http-check.mjs [--self-test]');
 }catch(e){console.error('Access test FAILED: '+e.message);process.exitCode=1;}
}
