import { validateImport, projectLibrary, questionSignature } from '../../../../src/domain/content-library.js';

class LibraryError extends Error { constructor(status,code){super(code);this.status=status;} }
const fail=(status,code)=>{throw new LibraryError(status,code);};
const fields=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|')) fail(400,'invalid_fields');};
const knownErrors=new Set(['import_payload_conflict','stale_import_digest','answer_conflict','question_identity_conflict','concept_identity_conflict','source_identity_conflict','duplicate_target_not_published','duplicate_concept_conflict','publication_rights_unresolved','rights_not_resolved','publication_review_evidence_invalid','source_unknown','concept_unknown','linked_question_unknown','rights_source_invalid','note_link_invalid','source_evidence_required','rights_decision_conflict']);
export function createLibraryHandler({admin,getUser,runtimeAccess,allowedOrigins}) {
  return async req=>{
    const origin=req.headers.get('origin');
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin',...(origin&&allowedOrigins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
    const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    const checked=async promise=>{const {data,error}=await promise;if(error)fail(500,'library_read_unavailable');return data;};
    try {
      if(origin&&!allowedOrigins.includes(origin))fail(403,'origin_not_allowed');
      if(req.method==='OPTIONS')return new Response('ok',{headers});
      if(!['GET','POST'].includes(req.method))fail(405,'method_not_allowed');
      const authorization=req.headers.get('authorization')||'';
      if(!authorization.startsWith('Bearer '))fail(401,'unauthorized');
      const user=await getUser(authorization.slice(7));if(!user?.id)fail(401,'unauthorized');
      const access=await runtimeAccess(authorization.slice(7),user.id);if(access?.allowed!==true)fail(access?.reason==='account_suspended'?403:401,'runtime_access_denied');
      const url=new URL(req.url);if(url.search)fail(400,'query_not_supported');
      const pieces=url.pathname.split('/').filter(Boolean);const at=pieces.lastIndexOf('content-library-api');let path;try{path='/'+pieces.slice(at>=0?at+1:0).map(p=>{const decoded=decodeURIComponent(p);if(decoded.includes('/'))fail(400,'invalid_path');return decoded;}).join('/');}catch{fail(400,'invalid_path');}
      const body=async(maximum=1048576)=>{
        if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))fail(415,'json_required');
        if(Number(req.headers.get('content-length')||0)>maximum)fail(413,'body_too_large');
        const raw=await req.text();if(new TextEncoder().encode(raw).length>maximum)fail(413,'body_too_large');
        try{return JSON.parse(raw);}catch{fail(400,'invalid_json');}
      };
      const requireAdmin=async()=>{const data=await checked(admin.rpc('content_admin_status_v1',{p_user:user.id}));if(data?.isAdmin!==true)fail(403,'content_admin_required');};
      if(req.method==='GET'&&path==='/library'){
        const snapshot=await checked(admin.rpc('content_library_snapshot_v1',{p_learner:user.id}));
        return reply(200,projectLibrary(snapshot));
      }
      if(req.method==='POST'&&path==='/study'){
        const input=await body(32768);fields(input,['questionVersionIds']);
        const ids=input.questionVersionIds;
        if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'))fail(400,'question_selection_invalid');
        const snapshot=await checked(admin.rpc('content_library_snapshot_v1',{p_learner:user.id}));
        const available=new Set(snapshot.catalog.questions.filter(q=>q.status==='published').map(q=>q.questionVersionId));
        if(ids.some(id=>!available.has(id)))fail(400,'question_selection_invalid');
        const proposedId=crypto.randomUUID();
        const result=await checked(admin.rpc('study_start_session',{p_learner:user.id,p_id:proposedId,p_ids:ids,p_started:new Date().toISOString()}));
        if(result?.error||!result?.id)fail(409,'study_session_unavailable');
        return reply(200,{sessionId:result.id,resumedExisting:result.id!==proposedId});
      }
      if(!path.startsWith('/imports'))fail(404,'not_found');
      await requireAdmin();
      if(req.method==='GET'&&path==='/imports')return reply(200,{contractId:'content-library-inbox-v1',imports:await checked(admin.from('content_library_imports').select('import_id,digest,status,created_at').order('created_at',{ascending:false}).limit(100))});
      if(req.method==='POST'&&path==='/imports'){
        const input=await body();fields(input,['manifest']);
        try{validateImport(input.manifest);}catch{fail(400,'manifest_invalid');}
        const {data,error}=await admin.rpc('content_library_stage_v1',{p_manifest:input.manifest,p_submitter:user.id});
        if(error)fail(String(error.message).includes('import_payload_conflict')?409:400,String(error.message).includes('import_payload_conflict')?'import_payload_conflict':'manifest_invalid');
        return reply(200,data);
      }
      const detail=/^\/imports\/([a-zA-Z0-9:_@.\-]{1,160})(\/publish)?$/.exec(path);
      if(!detail)fail(404,'not_found');
      if(req.method==='GET'&&!detail[2]){
        const {data:row,error}=await admin.from('content_library_imports').select('import_id,manifest,digest,status,receipt').eq('import_id',detail[1]).single();if(error||!row)fail(404,'import_not_found');
        const catalog=await checked(admin.from('study_catalog').select('body').eq('id',1).single());
        const sourceIds=new Set([...row.manifest.questions,...row.manifest.notes].flatMap(x=>x.sourceIds));
        const sources=[...catalog.body.sources,...row.manifest.sources.map(x=>({...x,rights:{status:'unknown',evidence:x.evidence}}))].filter((x,i,all)=>sourceIds.has(x.sourceId)&&all.findIndex(y=>y.sourceId===x.sourceId)===i);
        const duplicateTargets=row.manifest.questions.flatMap(candidate=>catalog.body.questions.filter(q=>questionSignature(q)===questionSignature(candidate)).map(q=>({candidateId:candidate.questionId,canonicalQuestion:q})));
        return reply(200,{...row,sources,duplicateTargets});
      }
      if(req.method==='POST'&&detail[2]){
        const input=await body(65536);fields(input,['digest','rightsDecisions','reviewNotes','attested']);
        if(!/^[a-f0-9]{64}$/.test(input.digest)||input.attested!==true||typeof input.reviewNotes!=='string'||!input.reviewNotes.trim()||input.reviewNotes.length>4000||!Array.isArray(input.rightsDecisions))fail(400,'review_attestation_required');
        for(const d of input.rightsDecisions){fields(d,['sourceId','rightsStatus','evidence']);if(!['owned','licensed','public_domain','citation_only'].includes(d.rightsStatus)||typeof d.evidence!=='string'||!d.evidence.trim()||d.evidence.length>4000)fail(400,'rights_decisions_invalid');}
        const {data,error}=await admin.rpc('content_library_review_publish_v1',{p_import_id:detail[1],p_reviewer:user.id,p_expected_digest:input.digest,p_rights_decisions:input.rightsDecisions,p_review_notes:input.reviewNotes,p_attested:true});
        if(error){
          if(/content_admin_required|reviewer_not_authorized/.test(String(error.message)))fail(403,'reviewer_not_authorized');
          const code=[...knownErrors].find(x=>String(error.message).includes(x));fail(code?409:500,code||'import_publication_failed');
        }
        return reply(200,data);
      }
      fail(404,'not_found');
    }catch(error){return reply(error instanceof LibraryError?error.status:500,{error:error instanceof LibraryError?error.message:'library_unavailable'});}
  };
}
