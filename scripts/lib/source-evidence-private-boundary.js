// Offline server-side contract only. Never instantiated in a browser or connected to a hosted project here.
// The trusted caller must supply a real network-authoritative getUser(token) and a fresh direct-login client.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const stageSql='select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r';
const readbackSql='select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r';
const attestationSql=`select session_user::text as login_role, current_user::text as active_role,
 rolcanlogin, rolbypassrls, rolsuper from pg_catalog.pg_roles
 where rolname=current_user`;
const rejected=()=>new Error('evidence_private_database_unavailable');

// Match the network Auth API's {data:{user},error} result. It must NOT be
// replaced with getSession, a locally decoded token or caller-provided claims.
export function createSourceEvidenceVerifiedUser({getUser}){
 if(typeof getUser!=='function')throw new TypeError('evidence_auth_verifier_configuration_invalid');
 return async function verifyUser(token){
  if(typeof token!=='string'||!token||token.length>16384)return null;
  try{
   const response=await getUser(token);
   if(!response||response.error!=null)return null;
   const id=response.data?.user?.id;
   if(typeof id!=='string'||!uuid.test(id))return null;
   return Object.freeze({id:id.toLowerCase()});
  }catch{return null;}
 };
}

// Dedicated fresh connection per approved statement, never supplied by the
// caller/request body. A real connector must still prove authenticated transport,
// credential isolation, autocommit completion, revocation and restore security.
export function createSourceEvidencePrivateQuery({createClient}){
 if(typeof createClient!=='function')throw new TypeError('evidence_private_query_configuration_invalid');
 return async function query(sql,args){
  const length=sql===stageSql?7:sql===readbackSql?6:0;
  if(!length||!Array.isArray(args)||args.length!==length)throw rejected();
  let client;
  try{
   client=createClient();
   if(!client||typeof client.connect!=='function'||typeof client.query!=='function'||typeof client.end!=='function')throw rejected();
   // Catches an accidental broad-credential fallback in the pg driver itself.
   if(client.connectionParameters?.user&&client.connectionParameters.user!=='evidence_gateway')throw rejected();
   await client.connect();
   const result=await client.query(attestationSql);
   const row=result?.rows?.length===1?result.rows[0]:null;
   if(!row||row.login_role!=='evidence_gateway'||row.active_role!=='evidence_gateway'
      ||row.rolcanlogin!==true||row.rolbypassrls!==false||row.rolsuper!==false)throw rejected();
   // This is exactly one SQL statement in a fresh connection. Never wrap in
   // a caller-controlled BEGIN or silently downgrade to a privileged role.
   return await client.query(sql,args);
  }catch{
   throw rejected();
  }finally{
   if(client&&typeof client.end==='function')await client.end().catch(()=>{});
  }
 };
}
