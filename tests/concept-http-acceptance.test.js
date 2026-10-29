import test from 'node:test';
import assert from 'node:assert/strict';
import {runConceptHttpAcceptance,acceptanceOrigin} from '../src/adapters/concept-http-acceptance.js';
function fixture(role='admin') {
 const calls=[]; const secret='synthetic-private-token';
 const args={projectUrl:'https://iyapppmeieqhflnzslao.supabase.co',publishableKey:'sb_publishable_test',origin:acceptanceOrigin,role,getSession:async()=>({accessToken:secret}),getMe:async()=>({isAdmin:role==='admin'}),fetchFn:async(url,options)=>{
  calls.push({url,options}); const signed=Boolean(options.headers.Authorization);
  const accepting=url.includes('/concept-draft-accept');
  const status=!signed?401:role==='learner'?403:accepting?(options.method==='POST'?400:405):options.method==='POST'?400:url.endsWith('00000000-0000-4000-8000-000000000000')?404:200;
  return new Response(JSON.stringify(status===200?{contractId:'admin-concept-drafts-v1',concepts:[],drafts:[]}:{error:{401:'unauthorized',403:'content_admin_required',400:accepting?'concept_accept_invalid':'concept_draft_invalid',404:'concept_draft_not_found',405:'method_not_allowed'}[status]}),{status,headers:{'Cache-Control':'no-store'}});
 }}; return {args,calls,secret};
}
for(const suite of ['drafts','acceptance']) for(const role of ['admin','learner']) test(`${suite} ${role}: exact non-persisting requests, redacted reports`,async()=>{
 const {args,calls,secret}=fixture(role); args.suite=suite; const result=await runConceptHttpAcceptance(args);
 assert.deepEqual(result.map(r=>r.status),role==='admin'?(suite==='acceptance'?[401,401,405,400]:[401,401,200,404,400]):[401,401,403,403]);
 assert.equal(JSON.stringify(result).includes(secret),false);
 for(const {url,options}of calls){assert.ok(url.startsWith(args.projectUrl+'/functions/v1/owner-api/'+(suite==='acceptance'?'concept-draft-accept':'concept-drafts')));if(options.method==='POST')assert.equal(options.body,'{}');}
 assert.equal(calls[0].options.headers.Authorization,undefined);assert.equal(calls[1].options.headers.Authorization,undefined);
});
test('wrong role, missing session and non-preview scopes make no endpoint requests',async()=>{
 for(const change of [{origin:'https://medical-learning-os-web.medicalos.workers.dev'},{projectUrl:'https://untrusted.invalid'},{role:'other'},{suite:'other'},{getMe:async()=>({isAdmin:false})},{getSession:async()=>null}]){
  const {args,calls}=fixture();await assert.rejects(()=>runConceptHttpAcceptance({...args,...change}));assert.equal(calls.length,0);
 }
});
test('wrong status, cached, malformed and network responses cannot pass',async()=>{
 for(const fetchFn of [async()=>new Response('{"error":"unauthorized"}',{status:200,headers:{'Cache-Control':'no-store'}}),async()=>new Response('{}',{status:401}),async()=>new Response('bad',{status:401,headers:{'Cache-Control':'no-store'}}),async()=>{throw Error('private transport details');}]){
  const {args}=fixture();await assert.rejects(()=>runConceptHttpAcceptance({...args,fetchFn}),e=>e.message==='acceptance_failed'&&!e.acceptanceFailure.includes('private transport details'));
 }
});
