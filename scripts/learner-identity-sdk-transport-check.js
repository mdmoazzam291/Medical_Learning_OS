// Actual pinned SDK + actual handler, synthetic fetch only. No network or hosted data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {allocateLearnerCode,normalizeLearnerCode} from '../ops/prototypes/learner-identity/learner-code.js';
const {createClient}=await import(process.env.SUPABASE_SDK_MODULE_URL||'@supabase/supabase-js');
if(process.argv.length!==2)throw Error('no arguments accepted');
const owner='11111111-1111-4111-8111-111111111111',session='33333333-3333-4333-8333-333333333333';
const token='e30.'+Buffer.from(JSON.stringify({sub:owner,session_id:session})).toString('base64url')+'.synthetic';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learner-identity-api/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),{mode:'transform'});
const runtime=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learner-experiment-api/_shared/runtime-access.ts',import.meta.url),'utf8').replace('export async function','async function'),{mode:'transform'});
let stored=null,inserts=0,handler;const calls=[];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function syntheticFetch(input,options={}){
 const url=new URL(input instanceof Request?input.url:input),method=options.method||'GET';assert.equal(url.origin,'https://sdk-fixture.invalid');calls.push({method,path:url.pathname});
 if(url.pathname==='/auth/v1/user')return json({id:owner,email:'synthetic@example.invalid',app_metadata:{},user_metadata:{}});
 if(url.pathname==='/rest/v1/rpc/learner_runtime_access_v1')return json({allowed:true,reason:'allowed'});
 assert.equal(url.pathname,'/rest/v1/learner_reference_codes');
 if(method==='GET')return json(stored?[stored]:[]);
 assert.equal(method,'POST');inserts++;
 if(inserts===1){stored=JSON.parse(options.body);throw Error('synthetic acknowledgement lost after possible commit');}
 return json({code:'23505',message:'synthetic duplicate after implicit replay'},409);
}
const env={SUPABASE_URL:'https://sdk-fixture.invalid',SUPABASE_ANON_KEY:'synthetic-public-key',SUPABASE_SERVICE_ROLE_KEY:'synthetic-private-key'};
const context=vm.createContext({Request,Response,URL,TextEncoder,atob,crypto,setTimeout,clearTimeout,allocateLearnerCode,normalizeLearnerCode,
 createClient(url,key,options){const config={...options,global:{...options.global,fetch:syntheticFetch}};return createClient(url,key,config);},
 Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}}
});
vm.runInContext(runtime+'\n'+source,context);
const response=await handler(new Request('https://sdk-fixture.invalid/functions/v1/learner-identity-api/ensure',{method:'POST',headers:{origin:'http://localhost:3000',authorization:'Bearer '+token}}));
const body=await response.json();
assert.ok(response.status===503&&inserts===1,'learner_sdk_ambiguous_write_replayed');
assert.equal(body.error,'learner_code_allocation_unavailable');assert.equal(body.learnerCode,undefined);assert.ok(stored);assert.equal(stored.auth_user_id,owner);
assert.equal(calls.filter(x=>x.path==='/rest/v1/learner_reference_codes'&&x.method==='GET').length,1,'no automatic reconciliation after ambiguous write');
assert.equal(calls.filter(x=>x.path==='/rest/v1/rpc/learner_runtime_access_v1').length,1);
assert.equal(response.headers.get('cache-control'),'no-store, private');
console.log('Learner SDK transport PASS: actual handler and pinned SDK stop after one ambiguous insert, withhold code and preserve manual reconciliation; no network used.');
