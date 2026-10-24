import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../supabase/functions/infrastructure-monitor/index.ts',import.meta.url),'utf8');
const script=stripTypeScriptTypes(source.replace(/^import\s[^\n]*;\s*$/gm,''),{mode:'transform'});
function runtime(fetch=async()=>{throw Error('unexpected network')},env={}) {
 const context={Deno:{env:{get:k=>env[k]},serve(){}},Response,AbortController,setTimeout,clearTimeout,fetch,URL};
 runInNewContext(script,context); return context;
}
test('database capacity thresholds use observed bytes and never invent healthy on missing evidence',async()=>{
 for(const [bytes,stage,status] of [[299999999,'normal','healthy'],[300000000,'review','degraded'],[375000000,'action','degraded'],[425000000,'urgent','degraded'],[475000000,'critical','unavailable']]){
  const r=await runtime().supabaseProbe({rpc:async name=>({data:name==='owner_admin_dashboard_v1'?{infrastructure:{databaseBytes:bytes}}:{},error:null}),storage:{listBuckets:async()=>({data:[],error:null})}});
  assert.equal(r.metrics.capacityStage,stage);assert.equal(r.status,status);assert.equal(r.metrics.databaseBytes,bytes);
 }
 const r=await runtime().supabaseProbe({rpc:async()=>({data:{},error:null}),storage:{listBuckets:async()=>({data:[],error:null})}});
 assert.equal(r.status,'degraded');assert.equal(r.metrics.capacityStage,'unknown');
});
test('backup probe considers only production main evidence',async()=>{
 const now=new Date().toISOString();const calls=[];
 const r=await runtime(async url=>{calls.push(url);return new Response(JSON.stringify({workflow_runs:[{id:1,status:'completed',conclusion:'success',updated_at:now,created_at:now,head_branch:'main',html_url:'https://github.com/example/run/1'}]}));}).r2Probe();
 assert.equal(r.status,'healthy');assert.ok(calls.every(url=>url.includes('branch=main')));
 assert.ok(calls.some(url=>url.includes('supabase-r2-restore-drill.yml')));
});
test('stale successful backup evidence does not imply current recovery health',async()=>{
 const r=await runtime(async()=>new Response(JSON.stringify({workflow_runs:[{status:'completed',conclusion:'success',created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-01T00:00:00Z'}]}))).r2Probe();
 assert.equal(r.status,'degraded');
});
test('delivery diagnostics retain only allowlisted codes and never provider error text',()=>{
 const c=runtime();
 assert.equal(typeof c.alertDeliveryErrorCode,'function');
 for(const code of ['alert_delivery_not_configured','alert_owner_unavailable','resend_alert_http_401','resend_alert_http_429']) assert.equal(c.alertDeliveryErrorCode(Error(code)),code);
 assert.equal(c.alertDeliveryErrorCode(Error('secret payload admin@example.test')),'delivery_failed');
});
