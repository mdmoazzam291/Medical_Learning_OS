import test from 'node:test';
import assert from 'node:assert/strict';
const view=await import('../web/admin-workflow-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('publication preflight distinguishes genuine current grants, unresolved evidence and human attestation',()=>{
 assert.equal(view.importPreflight({reviewKinds:null,sources:[]}).authorized,false);
 const ok=view.importPreflight({reviewKinds:['medical','references','rights'],sources:[]});assert.equal(ok.authorized,true);assert.match(ok.message,/attestation/);
 const no=view.importPreflight({reviewKinds:['medical','references'],sources:[{rights:{status:'unknown'}}]});assert.equal(no.authorized,false);assert.match(no.message,/Rights/);assert.match(no.message,/permission/);
});
test('errors offer a bounded useful next action without displaying untrusted server text',()=>{
 const msg=view.adminErrorMessage({code:'stale_import_digest',message:'<script>private</script>'});assert.match(msg,/refresh/i);assert.doesNotMatch(msg,/script|private/);
 assert.match(view.adminErrorMessage({code:'reviewer_not_authorized'}),/grant/i);assert.match(view.adminErrorMessage({code:'unrecognized',message:'secret'}),/try again/i);
});
