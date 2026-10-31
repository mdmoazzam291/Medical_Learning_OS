import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSourceEvidenceAccess } from '../src/domain/source-evidence-access.js';
const owner='11111111-1111-4111-8111-111111111111',reviewer='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const request=(action='read-metadata')=>({action,packageId:owner,packageVersion:1,packageDigest:'a'.repeat(64)});
const context=()=>({actorId:owner,authenticated:true,contentOwnerId:owner,packageAuthorId:owner,runtimeAllowed:true,
  currentPackage:{packageId:owner,packageVersion:1,packageDigest:'a'.repeat(64),status:'draft'},
  rights:{metadataAllowed:true,sourceRetentionAllowed:false,sourceDisplayAllowed:false},
  source:{expectedSha256:'b'.repeat(64),actualSha256:null,bytesVerified:false},grant:null});
const reviewerContext=()=>({...context(),actorId:reviewer,currentPackage:{...context().currentPackage,status:'staged'},
  grant:{targetType:'source-row-package',reviewerId:reviewer,packageId:owner,packageVersion:1,packageDigest:'a'.repeat(64),
    active:true,revoked:false,consentVerified:true,qualificationVerified:true,independenceVerified:true}});
test('owner can stage metadata-only draft but never publish',()=>{
  const r=evaluateSourceEvidenceAccess(request('stage-metadata'),context());
  assert.equal(r.allowed,true);assert.equal(r.sourceReviewOnly,true);assert.equal(r.learnerRelease,false);assert.equal(Object.isFrozen(r),true);
  assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),context()).allowed,false);
});
test('reviewer reads only the exact staged package and cannot stage',()=>{
  assert.equal(evaluateSourceEvidenceAccess(request(),reviewerContext()).allowed,true);
  assert.equal(evaluateSourceEvidenceAccess(request('stage-metadata'),reviewerContext()).allowed,false);
  const c=reviewerContext();c.currentPackage.status='draft';assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
});
test('revocation, wrong targets, mismatched actors and unverified independence deny reviewers',()=>{
  for(const [key,value] of Object.entries({active:false,revoked:true,consentVerified:false,qualificationVerified:false,independenceVerified:false,
    reviewerId:other,targetType:'syllabus-baseline',packageId:other,packageVersion:2,packageDigest:'c'.repeat(64)})) {
    const c=reviewerContext();c.grant[key]=value;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false,key);
  }
  const c=reviewerContext();c.packageAuthorId=reviewer;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
  c.grant=null;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
});
test('source bytes require verified matching bytes and retention/display rights',()=>{
  const c=reviewerContext();c.rights.sourceRetentionAllowed=true;c.rights.sourceDisplayAllowed=true;
  c.source.actualSha256=c.source.expectedSha256;c.source.bytesVerified=true;
  assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),c).allowed,true);
  for(const key of ['sourceRetentionAllowed','sourceDisplayAllowed']) {
    const x=structuredClone(c);x.rights[key]=false;assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),x).allowed,false);
  }
  for(const patch of [{bytesVerified:false},{actualSha256:null},{actualSha256:'c'.repeat(64)}])
    assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),{...c,source:{...c.source,...patch}}).allowed,false);
});
test('stale package, missing auth/runtime, withdrawn package or metadata rights deny',()=>{
  for(const [key,value] of Object.entries({packageId:other,packageVersion:2,packageDigest:'c'.repeat(64)}))
    assert.equal(evaluateSourceEvidenceAccess({...request(),[key]:value},context()).allowed,false,key);
  for(const key of ['authenticated','runtimeAllowed']) {
    const c=context();c[key]=false;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
  }
  const c=context();c.currentPackage.status='withdrawn';assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
  c.currentPackage.status='draft';c.rights.metadataAllowed=false;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
});
test('unknown/missing/accessor fields fail closed without running getters',()=>{
  const c=context();let invoked=false;Object.defineProperty(c,'authenticated',{enumerable:true,get(){invoked=true;return true;}});
  assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);assert.equal(invoked,false);
  assert.equal(evaluateSourceEvidenceAccess({...request(),learnerRelease:true},context()).allowed,false);
  assert.equal(evaluateSourceEvidenceAccess(request(),{...context(),admin:true}).allowed,false);
  assert.equal(evaluateSourceEvidenceAccess({...request(),action:'publish'},context()).allowed,false);
  for(const key of Object.keys(context())){const x=context();delete x[key];assert.equal(evaluateSourceEvidenceAccess(request(),x).allowed,false,key);}
});
test('every request and nested policy field is required and booleans are not coerced',()=>{
  for(const key of Object.keys(request())){const q=request();delete q[key];assert.equal(evaluateSourceEvidenceAccess(q,context()).allowed,false,key);}
  for(const group of ['currentPackage','rights','source','grant']){
    for(const key of Object.keys(reviewerContext()[group])){
      const c=reviewerContext();delete c[group][key];assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false,group+'.'+key);
    }
  }
  for(const field of ['authenticated','runtimeAllowed'])assert.equal(evaluateSourceEvidenceAccess(request(),{...context(),[field]:'true'}).allowed,false);
  const c=reviewerContext();c.grant.active=1;assert.equal(evaluateSourceEvidenceAccess(request(),c).allowed,false);
});
test('read access never upgrades draft or withdrawn packages and input remains untouched',()=>{
  const c=reviewerContext(),before=structuredClone(c),q=request();
  assert.equal(evaluateSourceEvidenceAccess(q,c).allowed,true);assert.deepEqual(c,before);assert.deepEqual(q,request());
  const o=context();o.currentPackage.status='staged';assert.equal(evaluateSourceEvidenceAccess(request('stage-metadata'),o).allowed,false);
  o.rights.sourceRetentionAllowed=true;o.rights.sourceDisplayAllowed=true;o.source.bytesVerified=true;o.source.actualSha256=o.source.expectedSha256;
  assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),o).allowed,true);
  o.currentPackage.status='withdrawn';assert.equal(evaluateSourceEvidenceAccess(request('read-source-bytes'),o).allowed,false);
});
