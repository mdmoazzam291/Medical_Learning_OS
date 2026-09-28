const DIMENSIONS = Object.freeze([
  'medicalCorrectness',
  'errorCorrection',
  'grounding',
  'unsupportedClaims',
  'verbosity'
]);

const VERDICTS = new Set(['pass', 'fail']);
const TEACHING_ACTIONS = new Set([
  'concise_explanation',
  'contrastive_explanation',
  'misconception_repair',
  'prerequisite_remediation'
]);
const REPRESENTATIONS = new Set([
  'factual_recall',
  'clinical_vignette',
  'management_decision',
  'discrimination'
]);
const CLAIM_ROLES = new Set([
  'explanation',
  'correction',
  'discriminator',
  'prerequisite',
  'example'
]);

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
function nullableText(value,label,max=1000) {
  if (value===null) return null;
  return text(value,label,max);
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
function validateGrounding(value) {
  if(!Array.isArray(value)||value.length===0||value.length>8) fail('Invalid semantic teaching grounding');
  const refs=new Set();
  for(const ref of value){
    validateReference(ref,'semantic teaching grounding');
    const key=`${ref.type}\u0000${ref.id}\u0000${ref.version??''}`;
    if(refs.has(key)) fail('Duplicate semantic teaching grounding');
    refs.add(key);
  }
}
function validateRubric(value) {
  exactKeys(value,[
    'medicalCorrectness','errorCorrection','grounding','unsupportedClaims','maxWords'
  ],'semantic teaching rubric');
  if(value.medicalCorrectness!=='human_required' ||
     value.errorCorrection!=='human_required' ||
     value.grounding!=='contract_plus_human' ||
     value.unsupportedClaims!=='human_required') {
    fail('Semantic medical review cannot be automated away');
  }
  if(!Number.isSafeInteger(value.maxWords)||value.maxWords<20||value.maxWords>200) {
    fail('Invalid semantic teaching maxWords');
  }
}
function validateGoldV1(value) {
  exactKeys(value,['canonicalExplanation','requiredFacts','forbiddenClaims'],'semantic teaching gold');
  text(value.canonicalExplanation,'canonicalExplanation',5000);
  validateStringList(value.requiredFacts,'required fact');
  validateStringList(value.forbiddenClaims,'forbidden claim');
}
function validateCanonicalClaim(value) {
  exactKeys(value,['role','text'],'semantic canonical claim');
  if(!CLAIM_ROLES.has(value.role)) fail('Invalid semantic canonical claim role');
  text(value.text,'semantic canonical claim text',1000);
}
function validateGoldV2(value, teachingAction) {
  exactKeys(value,[
    'canonicalExplanation','canonicalClaims','requiredFacts','forbiddenClaims','nextPrompt'
  ],'semantic teaching gold');
  text(value.canonicalExplanation,'canonicalExplanation',5000);
  if(!Array.isArray(value.canonicalClaims)||value.canonicalClaims.length===0||value.canonicalClaims.length>6) {
    fail('Invalid semantic canonical claims');
  }
  value.canonicalClaims.forEach(validateCanonicalClaim);
  validateStringList(value.requiredFacts,'required fact');
  validateStringList(value.forbiddenClaims,'forbidden claim');
  text(value.nextPrompt,'semantic nextPrompt',500);

  const roles=value.canonicalClaims.map(item=>item.role);
  if(teachingAction==='concise_explanation' && !roles.includes('explanation')) {
    fail('Concise semantic case requires explanation claim');
  }
  if(teachingAction==='contrastive_explanation' && !roles.includes('discriminator')) {
    fail('Contrastive semantic case requires discriminator claim');
  }
  if(teachingAction==='misconception_repair' &&
     (!roles.includes('correction') || !roles.includes('discriminator'))) {
    fail('Misconception semantic case requires correction and discriminator claims');
  }
  if(teachingAction==='prerequisite_remediation' && !roles.includes('prerequisite')) {
    fail('Prerequisite semantic case requires prerequisite claim');
  }
}
function validateCaseV1(value) {
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
  validateGrounding(value.grounding);
  validateGoldV1(value.gold);
  validateRubric(value.rubric);
}
function validateCaseV2(value) {
  exactKeys(value,[
    'caseId','questionVersionId','conceptId','teachingAction','representation',
    'learnerError','grounding','gold','rubric'
  ],'semantic teaching case');
  text(value.caseId,'caseId',200);
  text(value.questionVersionId,'questionVersionId',240);
  text(value.conceptId,'conceptId',240);
  if(!TEACHING_ACTIONS.has(value.teachingAction)) fail('Unsupported semantic teaching action');
  if(!REPRESENTATIONS.has(value.representation)) fail('Unsupported semantic teaching representation');

  exactKeys(value.learnerError,[
    'selectedOptionId','selectedOptionText','observedBelief'
  ],'learner error');
  text(value.learnerError.selectedOptionId,'selectedOptionId',160);
  text(value.learnerError.selectedOptionText,'selectedOptionText',500);
  nullableText(value.learnerError.observedBelief,'observedBelief',700);
  if(value.teachingAction==='misconception_repair' && value.learnerError.observedBelief===null) {
    fail('Misconception semantic case requires observed belief');
  }

  validateGrounding(value.grounding);
  validateGoldV2(value.gold,value.teachingAction);
  validateRubric(value.rubric);
}
function validateCase(value,schemaVersion) {
  if(schemaVersion===1) return validateCaseV1(value);
  if(schemaVersion===2) return validateCaseV2(value);
  fail('Unsupported semantic teaching evaluation set version');
}

export function validateSemanticTeachingEvaluationSet(value) {
  exactKeys(value,[
    'schemaVersion','evaluationSetId','version','basis','reviewMode',
    'productionQualificationAuthority','notes','cases'
  ],'semantic teaching evaluation set');
  if(value.schemaVersion!==1 && value.schemaVersion!==2) fail('Unsupported semantic teaching evaluation set version');
  text(value.evaluationSetId,'evaluationSetId',200);
  text(value.version,'evaluation set version',80);
  text(value.basis,'evaluation basis',240);
  if(value.reviewMode!=='human_semantic_review_required') fail('Human semantic review is required');
  if(value.productionQualificationAuthority!==false) fail('Bootstrap evaluation set cannot qualify production provider');
  validateStringList(value.notes,'evaluation note',1,12);
  if(!Array.isArray(value.cases)||value.cases.length===0||value.cases.length>100) fail('Invalid semantic teaching cases');
  const caseIds=new Set(), questionIds=new Set();
  for(const item of value.cases){
    validateCase(item,value.schemaVersion);
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
  const representation=set.schemaVersion===2 ? item.representation : 'factual_recall';
  return deepFreezeCopy({
    contractId:'semantic-teaching-checklist-v1',
    evaluationSetId:set.evaluationSetId,
    evaluationSetVersion:set.version,
    caseId:item.caseId,
    questionVersionId:item.questionVersionId,
    teachingAction:item.teachingAction,
    representation,
    dimensions:[
      {
        id:'medicalCorrectness',
        reviewMode:'human_required',
        prompt:'Does the teaching preserve the medically correct meaning of the reviewed canonical explanation?'
      },
      {
        id:'errorCorrection',
        reviewMode:'human_required',
        prompt:`Does the ${item.teachingAction} clearly address the observed learner error without introducing a new misconception?`
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
