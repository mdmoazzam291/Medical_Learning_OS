// DISPOSABLE local-only TLS acceptance harness for a private evidence connector.
// Not a deployable Supabase or browser connector; no remote target is accepted.
const denied=()=>new Error('private_tls_gateway_not_accepted');
export const PRIVATE_GATEWAY_LOGIN='evidence_private_gateway';
export const PRIVATE_GATEWAY_HOST='127.0.0.1';
export const PRIVATE_GATEWAY_PORT=55432;
const permittedSql=new Map([
 ['select evidence_private.stage($1,$2,$3,$4) as r',4],
 ['select evidence_private.reserve_intent($1,$2,$3,$4) as r',4]
]);
const attestationSql=`select session_user::text as login_role,current_user::text as active_role,
 rolcanlogin,rolbypassrls,rolsuper from pg_catalog.pg_roles
 where rolname=current_user`;
const tlsStateSql="select ssl from pg_catalog.pg_stat_ssl where pid=pg_catalog.pg_backend_pid()";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const digest=/^[a-f0-9]{64}$/;
export function validateIsolatedTlsGatewayConfig(config){
 if(!config||Object.getPrototypeOf(config)!==Object.prototype||
    Reflect.ownKeys(config).length!==7||
    !['host','port','database','user','password','ca','confirmation'].every(k=>Object.hasOwn(config,k))||
    config.host!==PRIVATE_GATEWAY_HOST||config.port!==PRIVATE_GATEWAY_PORT||
    !['postgres','mlos_private_restore'].includes(config.database)||
    config.user!==PRIVATE_GATEWAY_LOGIN||
    config.confirmation!=='DISPOSABLE_PRIVATE_TLS_ONLY'||
    typeof config.password!=='string'||config.password.length<32||config.password.length>200||
    !/^[a-f0-9]+$/.test(config.password)||
    typeof config.ca!=='string'||config.ca.length<300||config.ca.length>10000||
    !config.ca.includes('-----BEGIN CERTIFICATE-----')||
    !config.ca.includes('-----END CERTIFICATE-----'))throw denied();
 return Object.freeze({
  host:config.host,port:config.port,database:config.database,user:config.user,
  password:config.password,
  ssl:Object.freeze({ca:config.ca,rejectUnauthorized:true}),
  connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:5000
 });
}
export function createIsolatedPrivateTlsQuery({config,createClient}){
 const secureConfig=validateIsolatedTlsGatewayConfig(config);
 if(typeof createClient!=='function')throw denied();
 return async function query(sql,args){
  if(!permittedSql.has(sql)||!Array.isArray(args)||
     args.length!==permittedSql.get(sql)||args.some((v,i)=>i<3?!uuid.test(v):!digest.test(v)))throw denied();
  let client,attested=false;
  try{
   client=createClient(secureConfig);
   if(!client||typeof client.connect!=='function'||typeof client.query!=='function'||
      typeof client.end!=='function'||client.connectionParameters?.user!==PRIVATE_GATEWAY_LOGIN||
      client.connectionParameters?.host!==PRIVATE_GATEWAY_HOST||
      client.connectionParameters?.database!==secureConfig.database)throw denied();
   await client.connect();
   const socket=client.connection?.stream;
   if(socket?.encrypted!==true||socket?.authorized!==true)throw denied();
   const s=(await client.query(tlsStateSql))?.rows;
   if(s?.length!==1||s[0].ssl!==true)throw denied();
   const r=(await client.query(attestationSql))?.rows;
   if(r?.length!==1||r[0].login_role!==PRIVATE_GATEWAY_LOGIN||
      r[0].active_role!==PRIVATE_GATEWAY_LOGIN||r[0].rolcanlogin!==true||
      r[0].rolbypassrls!==false||r[0].rolsuper!==false)throw denied();
   attested=true;
   return await client.query(sql,args);
  }catch(error){
   if(attested&&['private_denied','private_conflict','private_invalid'].includes(error?.message))
    throw new Error(error.message);
   throw denied();
  }finally{
   if(client&&typeof client.end==='function')try{await client.end();}catch{}
  }
 };
}
