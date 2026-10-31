import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalGoTrueWriterRaceConfig,runLocalGoTrueWriterRace} from '../scripts/lib/source-evidence-auth-local-writer-race.js';
const uidA='11111111-1111-4111-8111-111111111111',uidB='22222222-2222-4222-8222-222222222222';
const sidA='33333333-3333-4333-8333-333333333333',sidB='44444444-4444-4444-8444-444444444444';
const config={
 databaseUrl:'postgresql://postgres:test-only@127.0.0.1:54322/postgres',
 confirmation:'ISOLATED_LOCAL_GOTRUE_TEST_STACK',url:'http://127.0.0.1:54321',
 accountA:{email:'a+mlos-probe-disposable@mlos.local',password:'dummy-test-password-very-long'},
 accountB:{email:'b+mlos-probe-disposable@mlos.local',password:'dummy-test-password-very-long'}
};
const jwt=(id,sid)=>'e30.'+Buffer.from(JSON.stringify({
 sub:id,session_id:sid,aud:'authenticated',iss:config.url+'/auth/v1',
 exp:Math.floor(Date.now()/1000)+3600
})).toString('base64url')+'.test-signature';
function fake({blocking=true}={}){
 let holderLock=false,heldSid=null;const pending=[];const sql=[],clients=[];
 const accounts=[{id:uidA,sid:sidA},{id:uidB,sid:sidB}];
 const release=()=>{holderLock=false;for(const resolve of pending.splice(0))resolve();};
 return {sql,clients,
 createDbClient(){
  const holder=clients.length===0;
  const c={async connect(){},async end(){},
   async query(q,params=[]){
    sql.push(q);
    if(q==='begin'){holderLock=true;return {rows:[]};}
    if(q==='commit'||q==='rollback'){release();return {rows:[]};}
    if(q.includes('for share')){heldSid=params[0];return {rows:[{id:heldSid}]};}
    if(q.includes('pg_backend_pid'))return {rows:[{pid:101}]};
    if(q.includes('pg_blocking_pids'))return {rows:[{blocked:blocking&&holderLock}]};
    if(q.includes('select exists(select 1 from auth.sessions'))return {rows:[{present:params[0]===sidB}]};
    throw Error('unexpected query');
   }};
  clients.push(c);return c;
 },
 createAuthClient(url){
  const account=accounts.shift();
  return {supabaseUrl:url,auth:{
   async signUp(){return {error:null,data:{user:{id:account.id},
    session:{access_token:jwt(account.id,account.sid),refresh_token:'initial'}}};},
   async signOut(){
    if(account.id===uidA&&holderLock&&blocking)await new Promise(resolve=>pending.push(resolve));
    return {error:null};
   },
   async refreshSession(){
    if(holderLock&&blocking)await new Promise(resolve=>pending.push(resolve));
    return {error:null,data:{session:{
     access_token:jwt(account.id,account.sid),refresh_token:'rotated'}}};
   }
  }};
 }};
}
test('writer race refuses remote targets before allocating clients',async()=>{
 for(const [field,value] of [
  ['url','https://iyapppmeieqhflnzslao.supabase.co'],
  ['databaseUrl','postgresql://postgres:test@prod.supabase.co:5432/postgres'],
  ['databaseUrl','postgresql://postgres:test@localhost:54322/postgres'],
  ['confirmation','ISOLATED_NONPRODUCTION_TEST_ACCOUNTS']
 ]){
  assert.throws(()=>validateLocalGoTrueWriterRaceConfig({...config,[field]:value}));
  let calls=0;
  await assert.rejects(runLocalGoTrueWriterRace({...config,[field]:value,
   createDbClient:()=>{calls++;throw Error('must not connect');},
   createAuthClient:()=>{calls++;throw Error('must not allocate');}
  }));
  assert.equal(calls,0);
 }
});
test('simulated provider writers obey a held FOR SHARE barrier and cleanup transactions',async()=>{
 const f=fake();
 const r=await runLocalGoTrueWriterRace({...config,
  createDbClient:f.createDbClient,createAuthClient:f.createAuthClient});
 assert.equal(r.status,'local_gotrue_writer_race_observed');
 assert.equal(r.signout.providerWaitedForShare,true);
 assert.equal(r.signout.sessionRowPresentAfter,false);
 assert.equal(r.refresh.providerWaitedForShare,true);
 assert.equal(r.refresh.sessionRowPresentAfter,true);
 assert.equal(r.bothProviderOperationsWaitedForShare,true);
 assert.equal(r.deployApproved,false);
 assert.equal(f.sql.filter(q=>q.includes('for share')).length,2);
 assert.equal(f.sql.filter(q=>q==='begin').length,2);
 assert.equal(f.sql.filter(q=>q==='commit').length,2);
 assert.ok(!JSON.stringify(r).includes(uidA)&&!JSON.stringify(r).includes('test-only'));
});
test('nonblocking provider response is observed as unproven, never promoted to an accepted lock guarantee',async()=>{
 const f=fake({blocking:false});
 const r=await runLocalGoTrueWriterRace({...config,
  createDbClient:f.createDbClient,createAuthClient:f.createAuthClient});
 assert.equal(r.bothProviderOperationsWaitedForShare,false);
 assert.equal(r.deployApproved,false);
 assert.equal(r.hostedWriterSemantics,'not_tested');
});
