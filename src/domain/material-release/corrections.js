import {createHash} from 'node:crypto';
import {canonicalJson,fail} from './contract.js';
const fields=['questionId','questionVersionId','stem','options','answerOptionId','explanation','conceptLinks','sourceIds','provenance'];
const digest=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const current=(target,id)=>target?.catalog.questions.filter(q=>q.questionId===id).sort((a,b)=>b.version-a.version)[0];
export function questionContentDigest(question){return digest(Object.fromEntries(fields.map(k=>[k,question[k]??null])));}
export function assertProposalBase(proposal,target){const q=current(target,proposal.questionId);if(!q||q.questionVersionId!==proposal.expectedQuestionVersionId||questionContentDigest(q)!==proposal.expectedContentSha256)fail('stale_question_version');}
export function buildCorrectionProposals(release,mapped,target){
  return mapped.routes.filter(r=>['correction','provenance'].includes(r.kind)).map(route=>{
    const row=release.records.questions.find(q=>q.recordId===route.recordId);if(!row)fail('missing_proposal_question');
    const old=current(target,row.recordId),meta=target?.questionMetadata.find(q=>q.question_id===row.recordId);
    const requiredGates=['medical','references','rights','identity-review','fresh-version-review'];
    if(old?.answerOptionId!==row.app.answerOptionId)requiredGates.push('disputed-key-review');
    if(row.archive.mediaRequired||row.app.intelligence?.presentation?.some(x=>x!=='text'))requiredGates.push('media-binding-review');
    const proposedContent=structuredClone(row.app);
    const p={kind:route.kind,questionId:row.recordId,expectedQuestionVersionId:old?.questionVersionId??null,expectedContentSha256:old?questionContentDigest(old):null,sourceReleaseId:release.manifest.releaseId,sourceReleaseDigest:mapped.releaseDigest,changeReason:route.reason??'Owner identity and evidence review required.',evidence:(row.archive.gates??[]).flatMap(g=>g.evidenceRefs.map(e=>({...e,statement:`Uploaded evidence for ${g.gate}; requires accountable review.`}))),proposedContent,affectedDerivativeIds:(meta?.intelligence?.derivatives??[]).map(d=>d.variantId).sort(),requiredGates,status:old?`${route.kind}_delivery_blocked`:'conflict'};
    // No author identity, predecessor mutation or human approval is manufactured.
    p.proposalId='proposal-'+digest(p);return p;
  });
}
