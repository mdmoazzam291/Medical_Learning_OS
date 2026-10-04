// Descriptive endpoint audit. No causal claim, mastery update or research activation.
export function evaluateShortening(protocol,records){
  if(!protocol||typeof protocol.protocolId!=='string'||!Array.isArray(protocol.delayDays)||!protocol.delayDays.length||protocol.delayDays.some(d=>!Number.isInteger(d)||d<1)||!Number.isSafeInteger(protocol.studyBudgetMs)||protocol.studyBudgetMs<1||!Number.isFinite(protocol.acceptableLossPercentagePoints)||protocol.acceptableLossPercentagePoints<0||!Array.isArray(records))throw new TypeError('protocol_invalid');
  const unique=new Map();
  for(const r of records){
    if(!r||['recordId','learnerId','blockId','familyId','conceptId','questionVersionId'].some(k=>typeof r[k]!=='string'||!r[k].trim())||!['original','concise'].includes(r.arm)||!['study','test'].includes(r.phase)||!['original','concise-practice','revision-cue','transfer-variant'].includes(r.representation)||!Number.isFinite(Date.parse(r.occurredAt))||!Number.isFinite(Date.parse(r.studyEndedAt))||typeof r.correct!=='boolean'||!Number.isSafeInteger(r.hints)||r.hints<0||!Number.isSafeInteger(r.studyTimeMs)||r.studyTimeMs<0||typeof r.priorExposure!=='boolean'||typeof r.interveningExposure!=='boolean')throw new TypeError('record_invalid');
    const key=JSON.stringify(r);if(unique.has(r.recordId)&&JSON.stringify(unique.get(r.recordId))!==key)throw new Error('record_conflict');unique.set(r.recordId,r);
  }
  const rows=[...unique.values()],seenEndpoints=new Set(),excluded=[],eligible=[];
  for(const r of rows.filter(r=>r.phase==='test')){
    const delay=(Date.parse(r.occurredAt)-Date.parse(r.studyEndedAt))/86400000;
    const day=protocol.delayDays.find(d=>delay>=d&&delay<d+1);
    const endpoint=[r.learnerId,r.blockId,r.familyId,day].join('|');const reasons=[];
    if(!['original','transfer-variant'].includes(r.representation))reasons.push('not-full-question');
    if(r.priorExposure||rows.some(x=>x.learnerId===r.learnerId&&x.familyId===r.familyId&&Date.parse(x.occurredAt)<Date.parse(r.occurredAt)))reasons.push('family-exposure');
    if(rows.some(x=>x.learnerId===r.learnerId&&x.familyId===r.familyId&&x.arm!==r.arm))reasons.push('cross-arm-family');
    if(r.interveningExposure)reasons.push('intervening-exposure');
    if(r.hints)reasons.push('hint-assisted');
    if(day===undefined)reasons.push('outside-delay-window');
    if(r.studyTimeMs!==protocol.studyBudgetMs)reasons.push('study-time-mismatch');
    if(seenEndpoints.has(endpoint))reasons.push('duplicate-family-endpoint');
    if(reasons.length){excluded.push({recordId:r.recordId,reasons});continue;}
    seenEndpoints.add(endpoint);eligible.push({...r,delayDay:day});
  }
  const summarize=rows=>{const n=rows.length,correct=rows.filter(r=>r.correct).length;return {n,correct,accuracy:n?correct/n:null,learners:new Set(rows.map(r=>r.learnerId)).size,families:new Set(rows.map(r=>r.familyId)).size};};
  const arms=Object.fromEntries(['original','concise'].map(arm=>[arm,summarize(eligible.filter(r=>r.arm===arm))]));
  const delays=protocol.delayDays.map(day=>({day,...Object.fromEntries(['original','concise'].map(arm=>[arm,summarize(eligible.filter(r=>r.arm===arm&&r.delayDay===day))])),outcomes:Object.fromEntries(['original','transfer-variant'].map(representation=>[representation,Object.fromEntries(['original','concise'].map(arm=>[arm,summarize(eligible.filter(r=>r.arm===arm&&r.delayDay===day&&r.representation===representation))]))]))}));
  const difference=arms.original.n&&arms.concise.n?(arms.concise.accuracy-arms.original.accuracy)*100:null;
  return {schemaVersion:1,protocolId:protocol.protocolId,arms,delays,excluded,inputRecords:rows.length,eligibleRecords:eligible.length,differencePercentagePoints:difference,acceptableLossPercentagePoints:protocol.acceptableLossPercentagePoints,conclusion:difference===null?'insufficient-evidence':'descriptive-only',causalClaim:false,masteryInference:false,limitations:['Exposure flags need complete actual history; unknown exposure must not be coded false.','Missing follow-ups require a separate enrollment denominator; this input alone cannot estimate attrition.','Learner/item clustering, allocation balance, power and uncertainty require the preregistered efficacy analysis.']};
}
