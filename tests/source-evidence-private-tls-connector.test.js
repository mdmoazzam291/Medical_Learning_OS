import test from 'node:test';
import assert from 'node:assert/strict';
import {createIsolatedPrivateTlsQuery,validateIsolatedTlsGatewayConfig} from '../scripts/lib/source-evidence-private-tls-connector.js';
const actor='11111111-1111-4111-8111-111111111111',session='33333333-3333-4333-8333-333333333333';
const request='44444444-4444-4444-8444-444444444444',digest='a'.repeat(64);
const config={host:'127.0.0.1',port:55432,database:'postgres',user:'evidence_private_gateway',
 password:'a'.repeat(64),ca:'-----BEGIN CERTIFICATE-----\n'+('a'.repeat(350))+'\n-----END CERTIFICATE-----',
 confirmation:'DISPOSABLE_PRIVATE_TLS_ONLY'};
const stage='select evidence_private.stage($1,$2,$3,$4) as r';
const reserve='select evidence_private.reserve_intent($1,$2,$3,$4) as r';
function fixture({role=config.user,tls=true,authorized=true,pgSsl=true,login=config.user,
 attestationUser=role,sqlError=null}={}){
 const calls=[];
 let closed=false;
 const createClient=connection=>{
  calls.push({type:'create',connection});
  return {connectionParameters:{host:connection.host,database:connection.database,user:login},
   connection:{stream:{encrypted:tls,authorized}},
   async connect(){calls.push({type:'connect'});},
   async query(sql,args){
    calls.push({type:'query',sql,args});
    if(sql.includes('pg_catalog.pg_stat_ssl'))return {rows:[{ssl:pgSsl}]};
    if(sql.includes('pg_catalog.pg_roles'))return {rows:[{
     login_role:attestationUser,active_role:attestationUser,rolcanlogin:true,rolbypassrls:false,rolsuper:false
    }]};
    if(sqlError)throw Error(sqlError);
    return {rows:[{r:{status:sql===stage?'staged':'intent-recorded'}}]};
   },
   async end(){closed=true;}
  };
 };
 return {calls,createClient,get closed(){return closed;}};
}
test('local-only connection config fixes CA validation and restricted login before creating any client',async()=>{
 const safe=validateIsolatedTlsGatewayConfig(config);
 assert.equal(safe.ssl.rejectUnauthorized,true);
 assert.equal(safe.ssl.ca,config.ca);
 for(const change of [{host:'db.example.com'},{host:'localhost'},{port:5432},{user:'postgres'},
  {user:'service_role'},{database:'production'},{ca:'invalid'},{password:'short'},
  {confirmation:'HOSTED'}, {ssl:{rejectUnauthorized:false}}]){
  const f=fixture();
  await assert.rejects(async()=>createIsolatedPrivateTlsQuery({
   config:{...config,...change},createClient:f.createClient
  }),/private_tls_gateway_not_accepted/);
  assert.equal(f.calls.length,0);
 }
});
test('only two parameter-bound RPCs execute after TLS and role attestation, and always close',async()=>{
 const f=fixture(),query=createIsolatedPrivateTlsQuery({config,createClient:f.createClient});
 assert.equal((await query(stage,[actor,session,request,digest])).rows[0].r.status,'staged');
 assert.equal((await query(reserve,[actor,session,request,digest])).rows[0].r.status,'intent-recorded');
 assert.equal(f.calls.filter(x=>x.type==='connect').length,2);
 assert.equal(f.calls.filter(x=>x.type==='query').length,6);
 assert.equal(f.closed,true);
 assert.ok(f.calls.every(x=>x.type!=='create'||(x.connection.ssl.rejectUnauthorized===true&&x.connection.user==='evidence_private_gateway')));
});
test('unknown SQL and incorrect argument structure reject before network allocation',async()=>{
 const f=fixture(),query=createIsolatedPrivateTlsQuery({config,createClient:f.createClient});
 for(const [sql,args] of [
  ['select * from evidence_private.receipts',[]],
  ['select evidence_private.control($1,true,60)',[actor]],
  [stage,[actor,session,request]],
  [stage,[actor,session,request,'not-a-digest']],
  [stage,['not-uuid',session,request,digest]]
 ]){
  await assert.rejects(query(sql,args),/private_tls_gateway_not_accepted/);
 }
 assert.equal(f.calls.length,0);
});
test('unencrypted, unauthorized, ambiguous server TLS and unexpected login all fail closed and close',async()=>{
 for(const options of [
  {tls:false},{authorized:false},{pgSsl:false},{login:'evidence_private_controller'},
  {attestationUser:'evidence_private_controller'},{sqlError:'unexpected DB error'}
 ]){
  const f=fixture(options),query=createIsolatedPrivateTlsQuery({config,createClient:f.createClient});
  await assert.rejects(query(stage,[actor,session,request,digest]),/private_tls_gateway_not_accepted/);
  assert.equal(f.closed,true);
 }
});
test('domain denials propagate only after successful TLS and identity attestation',async()=>{
 const f=fixture({sqlError:'private_denied'}),query=createIsolatedPrivateTlsQuery({config,createClient:f.createClient});
 await assert.rejects(query(stage,[actor,session,request,digest]),/private_denied/);
 assert.equal(f.closed,true);
});
