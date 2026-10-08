import {createHash} from 'node:crypto';
import {validateMediaBundle} from '../media.js';
import {canonicalJson,exact,safeRelativePath,fail} from './contract.js';
import {questionContentDigest} from './corrections.js';
import {isMeasuredImageFacts} from './media-facts.js';
const digest=x=>createHash('sha256').update(canonicalJson(x)).digest('hex');
const questionFacts=q=>Object.fromEntries(['questionId','stem','options','answerOptionId','explanation','conceptLinks','sourceIds'].map(k=>[k,q[k]]));
export function mediaBindingDigest(question,bundle,privacyEvidence){const links=bundle.questionLinks.filter(l=>l.questionVersionId===question.questionVersionId),ids=new Set(links.map(l=>l.mediaAssetVersionId));return digest({question,assets:bundle.assets.filter(a=>ids.has(a.mediaAssetVersionId)),annotations:bundle.annotations.filter(a=>ids.has(a.mediaAssetVersionId)),links,privacyEvidence:privacyEvidence.filter(p=>ids.has(p.mediaAssetVersionId))});}
export function prepareMediaPackage(release,{target=null,assetFacts={},privacyEvidence=[]}={}){
  const m=release.assetsManifest;if(!m)fail('missing_media_asset');exact(m,['bundle','assetFiles','privacyEvidence','promptEvidence']);
  let bundle;try{bundle=validateMediaBundle(m.bundle);}catch{fail('invalid_media_bundle');}
  if(!Array.isArray(m.assetFiles)||!Array.isArray(privacyEvidence)||!Array.isArray(m.promptEvidence))fail('invalid_media_metadata');
  const diagnostics=[],add=code=>{if(!diagnostics.includes(code))diagnostics.push(code);};
  for(const a of bundle.assets){const f=m.assetFiles.find(f=>f.mediaAssetVersionId===a.mediaAssetVersionId);if(!f)fail('missing_media_asset');exact(f,['mediaAssetVersionId','path','sha256','bytes']);safeRelativePath(f.path);
    const fact=assetFacts[f.path];if(!fact)fail('missing_media_asset');if(!isMeasuredImageFacts(fact))fail('unmeasured_media_asset');
    if(fact.sha256!==a.contentSha256||fact.sha256!==f.sha256||fact.bytes!==f.bytes)fail('file_hash_mismatch');if(fact.mimeType!==a.mimeType)fail('media_mime_mismatch');if(fact.width!==a.width||fact.height!==a.height)fail('media_dimensions_mismatch');
    if(!/^assets\/[0-9a-f]{64}\.(png|jpg|jpeg|webp)$/.test(a.deliveryRef)||a.deliveryRef!==f.path)fail('unsafe_media_delivery_reference');
    if(a.source.rightsStatus==='unknown')add('media_rights_unresolved');
    const privacy=privacyEvidence.find(p=>p.mediaAssetVersionId===a.mediaAssetVersionId);if(privacy)exact(privacy,['mediaAssetVersionId','status','evidence']);if(!privacy||privacy.status!=='cleared'||typeof privacy.evidence!=='string'||!privacy.evidence.trim())add('privacy_review_required');
    const old=target?.mediaBundle?.assets?.find(x=>x.mediaAssetVersionId===a.mediaAssetVersionId);if(a.review.status!=='unverified'&&canonicalJson(old??null)!==canonicalJson(a))add('unverified_review_evidence');
  }
  for(const a of bundle.annotations){const old=target?.mediaBundle?.annotations?.find(x=>x.annotationVersionId===a.annotationVersionId);if(a.review.status!=='unverified'&&canonicalJson(old??null)!==canonicalJson(a))add('unverified_review_evidence');}
  if(m.assetFiles.length!==bundle.assets.length||new Set(m.assetFiles.map(f=>f.mediaAssetVersionId)).size!==m.assetFiles.length)fail('invalid_media_metadata');
  const questionBindings=[];
  for(const id of [...new Set(bundle.questionLinks.map(l=>l.questionVersionId))].sort()){
    const q=target?.catalog.questions.find(q=>q.questionVersionId===id),row=release.records.questions.find(r=>r.recordId===q?.questionId);
    if(!q||!row){add('binding_pending');continue;}const latest=target.catalog.questions.filter(x=>x.questionId===q.questionId).sort((a,b)=>b.version-a.version)[0];
    if(latest.questionVersionId!==id||canonicalJson(questionFacts(q))!==canonicalJson(questionFacts(row.app))){add('stale_question_binding');continue;}
    const bindingSha256=mediaBindingDigest(q,bundle,privacyEvidence);questionBindings.push({questionVersionId:id,expectedQuestionSha256:questionContentDigest(q),bindingSha256});
    const e=m.promptEvidence.find(x=>x.questionVersionId===id&&x.bindingSha256===bindingSha256&&x.status==='cleared'&&typeof x.evidence==='string'&&x.evidence.trim());if(!e)add('prompt_leakage_review_required');
  }
  // Asset reviews cannot attest a question binding. Storage and mutation capabilities stay disabled.
  const result={sourceReleaseId:release.manifest.releaseId,bundle,assetFiles:structuredClone(m.assetFiles),privacyEvidence:structuredClone(privacyEvidence),questionBindings,diagnostics,status:'media_delivery_blocked'};result.packageId='media-'+digest(result);return result;
}
