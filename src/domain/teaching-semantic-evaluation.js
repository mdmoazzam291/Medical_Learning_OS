const DIMENSIONS = Object.freeze([
  'medicalCorrectness',
  'errorCorrection',
  'grounding',
  'unsupportedClaims',
  'verbosity'
]);

const VERDICTS = new Set(['pass', 'fail']);

function fail(message) { throw new TypeError(message); }
function plain(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, expected, label) {
  if (!plain(value)) fail(`Invalid ${label}`);
  const keys=Object.keys(value);
  if (keys.length!==expected.length || expected.some(key=>!Object.hasOwn(value,key))) fail(`Invalid ${label}`);
}
function text(value,label,max=1000) {
  if (typeof value!=='string' || !value.trim() || value.length>max) fail(`Invalid ${label}`);
  return value.trim();
}
function timestamp(value,label) {
  text(value,label,40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString()!==value) {
    fail(`Invalid ${label}`);
  }
}
function deepFreezeCopy(value) {
  const copy=structuredClone(value);
  const visit=item=>{
    if(item&&typeof item==='object'){Object.values(item).forEach(visit);Object.freeze(item);}
    return item;
  };
  return visit(copy);
}
function validateReference(value,label) {
  exactKeys(value,['type','id','version'],label);
  if(value.type!=='content-source') fail('Semantic teaching grounding must use content-source references');
  text(value.id,`${label} id`,240);
  if(value.version!==null) text(value.version,`${label} version`,160);
}
function validateStringList(value,label,min=1,max=12) {
  if(!Array.isArray(value)||value.length<min||value.length>max) fail(`Invalid ${label}`);
  const seen=new Set();
  for(const item of value){
    const normalized=text(item,label,700);
    if(seen.has(normalized)) fail(`Duplicate ${label}`);
    seen.add(normalized);
  }
}
function validateCase(value) {
  exactKeys(value,[
    'caseId','questionVersionId','conceptId','teachingAction','learnerError',
    'grounding','gold','rubric'
  ],'semantic teaching case');
  text(value.caseId,'caseId',200);
  text(value.questionVersionId,'questionVersionId',240);
  text(value.conceptId,'conceptId',240);
  if(value.teachingAction!=='concise_explanation') fail('Unsupported semantic teaching action');

  exactKeys(value.learnerError,['selectedOptionId','selectedOptionText'],'learner error');
  text(value.learnerError.selectedOptionId,'selectedOptionId',160);
  text(value.learnerError.selectedOptionText,'selectedOptionText',500);

  if(!Array.isArray(value.grounding)||value.grounding.length===0||value.grounding.length>8) fail('Invalid semantic teaching grounding');
  const refs=new Set();
  for(const ref of value.grounding){
    validateReference(ref,'semantic teaching grounding');
    const key=`${ref.type}\u0000${ref.id}\u0000${ref.version??''}`;
    if(refs.has(key)) fail('Duplicate semantic teaching grounding');
    refs.add(key);
  }

  exactKeys(value.gold,['canonicalExplanation','requiredFacts','forbiddenClaims'],'semantic teaching gold');
  text(value.gold.canonicalExplanation,'canonicalExplanation',5000);
  validateStringList(value.gold.requiredFacts,'required fact');
  validateStringList(value.gold.forbiddenClaims,'forbidden claim');

  exactKeys(value.rubric,[
    'medicalCorrectness','errorCorrection','grounding','unsupportedClaims','maxWords'
  ],'semantic teaching rubric');
  if(value.rubric.medicalCorrectness!=='human_required' ||
     value.rubric.errorCorrection!=='human_required' ||
     value.rubric.grounding!=='contract_plus_human' ||
     value.rubric.unsupportedClaims!=='human_required') {
    fail('Semantic medical review cannot be automated away');
  }
  if(!Number.isSafeInteger(value.rubric.maxWords)||value.rubric.maxWords<20||value.rubric.maxWords>200) {
    fail('Invalid semantic teaching maxWords');
  }
}

export function validateSemanticTeachingEvaluationSet(value) {
  exactKeys(value,[
    'schemaVersion','evaluationSetId','version','basis','reviewMode',
    'productionQualificationAuthority','notes','cases'
  ],'semantic teaching evaluation set');
  if(value.schemaVersion!==1) fail('Unsupported semantic teaching evaluation set version');
  text(value.evaluationSetId,'evaluationSetId',200);
  text(value.version,'evaluation set version',80);
  text(value.basis,'evaluation basis',240);
  if(value.reviewMode!=='human_semantic_review_required') fail('Human semantic review is required');
  if(value.productionQualificationAuthority!==false) fail('Bootstrap evaluation set cannot qualify production provider');
  validateStringList(value.notes,'evaluation note',1,12);
  if(!Array.isArray(value.cases)||value.cases.length===0||value.cases.length>100) fail('Invalid semantic teaching cases');
  const caseIds=new Set(), questionIds=new Set();
  for(const item of value.cases){
    validateCase(item);
    if(caseIds.has(item.caseId)) fail('Duplicate semantic teaching caseId');
    if(questionIds.has(item.questionVersionId)) fail('Duplicate semantic teaching questionVersionId');
    caseIds.add(item.caseId);
    questionIds.add(item.questionVersionId);
  }
  return deepFreezeCopy(value);
}

export function semanticTeachingChecklist(setValue, caseId) {
  const set=validateSemanticTeachingEvaluationSet(setValue);
  const item=set.cases.find(candidate=>candidate.caseId===caseId);
  if(!item) fail('Unknown semantic teaching case');
  return deepFreezeCopy({
    contractId:'semantic-teaching-checklist-v1',
    evaluationSetId:set.evaluationSetId,
    evaluationSetVersion:set.version,
    caseId:item.caseId,
    questionVersionId:item.questionVersionId,
    dimensions:[
      {
        id:'medicalCorrectness',
        reviewMode:'human_required',
        prompt:'Does the teaching preserve the medically correct meaning of the reviewed canonical explanation?'
      },
      {
        id:'errorCorrection',
        reviewMode:'human_required',
        prompt:'Does the teaching clearly correct the observed wrong option without introducing a new misconception?'
      },
      {
        id:'grounding',
        reviewMode:'contract_plus_human',
        prompt:'Are the cited sources permitted by the case and do they actually support the teaching claims?'
      },
      {
        id:'unsupportedClaims',
        reviewMode:'human_required',
        prompt:'Does the output avoid the listed forbidden claims and any other unsupported medical claim?'
      },
      {
        id:'verbosity',
        reviewMode:'deterministic_plus_human',
        prompt:`Is the teaching concise enough for micro-remediation (maximum ${item.rubric.maxWords} words)?`
      }
    ],
    requiredFacts:item.gold.requiredFacts,
    forbiddenClaims:item.gold.forbiddenClaims,
    grounding:item.grounding,
    maxWords:item.rubric.maxWords
  });
}

export function validateSemanticTeachingReview(setValue, review) {
  const set=validateSemanticTeachingEvaluationSet(setValue);
  exactKeys(review,[
    'schemaVersion','evaluationSetId','evaluationSetVersion','caseId','providerRunRef',
    'reviewerId','reviewedAt','dimensions','overallVerdict','notes'
  ],'semantic teaching review');
  if(review.schemaVersion!==1) fail('Unsupported semantic teaching review version');
  if(review.evaluationSetId!==set.evaluationSetId||review.evaluationSetVersion!==set.version) {
    fail('Semantic teaching review set mismatch');
  }
  if(!set.cases.some(item=>item.caseId===review.caseId)) fail('Unknown semantic teaching case');
  text(review.providerRunRef,'providerRunRef',240);
  text(review.reviewerId,'reviewerId',200);
  timestamp(review.reviewedAt,'reviewedAt');
  if(!Array.isArray(review.dimensions)||review.dimensions.length!==DIMENSIONS.length) fail('Invalid semantic review dimensions');
  const seen=new Set();
  for(const dimension of review.dimensions){
    exactKeys(dimension,['id','verdict','notes'],'semantic review dimension');
    if(!DIMENSIONS.includes(dimension.id)||seen.has(dimension.id)) fail('Invalid semantic review dimension');
    seen.add(dimension.id);
    if(!VERDICTS.has(dimension.verdict)) fail('Invalid semantic review verdict');
    text(dimension.notes,'semantic review notes',1000);
  }
  if(!VERDICTS.has(review.overallVerdict)) fail('Invalid overall semantic review verdict');
  text(review.notes,'semantic review overall notes',2000);
  const allPass=review.dimensions.every(item=>item.verdict==='pass');
  if((review.overallVerdict==='pass')!==allPass) fail('Overall semantic verdict must match dimension verdicts');
  return deepFreezeCopy(review);
}
