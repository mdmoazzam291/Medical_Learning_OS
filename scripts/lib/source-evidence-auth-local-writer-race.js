// Real provider-writer ordering experiment. ONLY against disposable GoTrue
// and the exact CLI loopback PostgreSQL. This is not a gateway implementation.
// SELECT FOR SHARE targets newly generated sandbox session IDs only.
import {validateLocalAuthCatalogTarget,LOCAL_AUTH_CATALOG_CONFIRM} from './source-evidence-auth-catalog-probe.js';
import {validateNonproductionAuthProbeConfig} from './source-evidence-auth-provider-probe.js';

const denied=()=>new Error('local_auth_writer_race_not_accepted');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const origin='http://127.0.0.1:54321';
const ref='local-gotrue-only';
const lockSql='select id from auth.sessions where id=$1 and user_id=$2 for share';
const statusSql=`select exists(
 select 1 from pg_catalog.pg_stat_activity
 where pid<>$1 and wait_event_type='Lock'
 and pg_catalog.pg_blocking_pids(pid) @> array[$1]::integer[]
) as blocked`;

export function validateLocalGoTrueWriterRaceConfig({databaseUrl,confirmation,accountA,accountB,url}){
 validateLocalAuthCatalogTarget({databaseUrl,confirmation});
 validateNonproductionAuthProbeConfig({url,projectRef:ref,confirmation,accountA,accountB});
 if(confirmation!==LOCAL_AUTH_CATALOG_CONFIRM||url!==origin)throw denied();
 return Object.freeze({databaseUrl,url});
}
function sessionClaims(token,expectedUser){
 try{
  if(typeof token!=='string'||token.length>16384)return null;
  const part=token.split('.');
  if(part.length!==3)return null;
  const c=JSON.parse(Buffer.from(part[1],'base64url').toString('utf8'));
  if(!uuid.test(c.session_id)||c.sub?.toLowerCase()!==expectedUser?.toLowerCase()||
     c.iss!==origin+'/auth/v1'||c.aud!=='authenticated'||
     !Number.isInteger(c.exp)||c.exp<=Math.floor(Date.now()/1000))return null;
  return c.session_id.toLowerCase();
 }catch{return null;}
}
async function bounded(p,ms=7000){
 let timer;
 try{return await Promise.race([p,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(denied()),ms);
 })]);}finally{clearTimeout(timer);}
}
export async function runLocalGoTrueWriterRace({
 databaseUrl,confirmation,url,accountA,accountB,createDbClient,createAuthClient
}){
 validateLocalGoTrueWriterRaceConfig({databaseUrl,confirmation,url,accountA,accountB});
 if(typeof createDbClient!=='function'||typeof createAuthClient!=='function')throw denied();
 let holder,observer,holding=false;
 const clientA=createAuthClient(url),clientB=createAuthClient(url);
 if(clientA?.supabaseUrl!==origin||clientB?.supabaseUrl!==origin||
    typeof clientA.auth?.signUp!=='function'||typeof clientA.auth?.signOut!=='function'||
    typeof clientB.auth?.refreshSession!=='function')throw denied();
 const results={};
 async function exercise(kind,client,account){
  const signed=await bounded(client.auth.signUp(account));
  const sess=signed?.data?.session,uid=signed?.data?.user?.id;
  if(signed?.error||!uuid.test(uid)||!sess?.access_token||!sess?.refresh_token)throw denied();
  const id=sessionClaims(sess.access_token,uid);
  if(!id)throw denied();
  try{
   await holder.query('begin');
   holding=true;
   const locked=await holder.query(lockSql,[id,uid]);
   if(locked?.rows?.length!==1||locked.rows[0]?.id?.toLowerCase()!==id)throw denied();
   const pid=(await holder.query('select pg_catalog.pg_backend_pid() as pid')).rows?.[0]?.pid;
   if(!Number.isInteger(pid))throw denied();
   let settled=false;
   const pending=(async()=>{
    try{
     return kind==='signout'?
      await client.auth.signOut({scope:'local'}):
      await client.auth.refreshSession({refresh_token:sess.refresh_token});
    }finally{settled=true;}
   })();
   let blocked=false;
   const until=Date.now()+2400;
   while(Date.now()<until&&!settled){
    const state=await observer.query(statusSql,[pid]);
    if(state?.rows?.length!==1||typeof state.rows[0].blocked!=='boolean')throw denied();
    if(state.rows[0].blocked){blocked=true;break;}
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   await holder.query('commit');holding=false;
   const outcome=await bounded(pending);
   if(outcome?.error)throw denied();
   const rowPresent=(await observer.query(
    'select exists(select 1 from auth.sessions where id=$1 and user_id=$2) as present',[id,uid]
   )).rows?.[0]?.present;
   if(typeof rowPresent!=='boolean')throw denied();
   if(kind==='refresh'){
    const fresh=outcome?.data?.session;
    if(!fresh?.refresh_token||sessionClaims(fresh.access_token,uid)!==id)throw denied();
   }else if(rowPresent)throw denied();
   return {providerWaitedForShare:blocked,sessionRowPresentAfter:rowPresent,
    operationCompleted:true};
  }finally{
   if(holding){try{await holder.query('rollback');}catch{}holding=false;}
   try{await bounded(client.auth.signOut({scope:'local'}),4000);}catch{}
  }
 }
 try{
  holder=createDbClient(databaseUrl);observer=createDbClient(databaseUrl);
  if(!holder||!observer||holder===observer||typeof holder.connect!=='function'||
     typeof observer.connect!=='function'||typeof holder.query!=='function'||
     typeof observer.query!=='function'||typeof holder.end!=='function'||
     typeof observer.end!=='function')throw denied();
  await bounded(holder.connect());await bounded(observer.connect());
  results.signout=await exercise('signout',clientA,accountA);
  results.refresh=await exercise('refresh',clientB,accountB);
  return Object.freeze({
   status:'local_gotrue_writer_race_observed',
   environment:'disposable_local_gotrue',
   directAuthTableDmlByHarness:false,
   signout:results.signout,refresh:results.refresh,
   bothProviderOperationsWaitedForShare:
    results.signout.providerWaitedForShare&&results.refresh.providerWaitedForShare,
   hostedGrantPath:'not_established',hostedWriterSemantics:'not_tested',
   restrictedDatabaseLogin:'not_tested',deployApproved:false
  });
 }catch{throw denied();}
 finally{
  if(holding&&holder)try{await holder.query('rollback');}catch{}
  for(const c of [holder,observer])if(typeof c?.end==='function')try{await c.end();}catch{}
 }
}
