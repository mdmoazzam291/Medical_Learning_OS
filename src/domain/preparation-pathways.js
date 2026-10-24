// Preparation is a relevance preference, never access, publication or exam authority.
const fail = code => { throw new TypeError(code); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function shape(value, keys) {
  if (!object(value) || Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) fail('preparation_fields_invalid');
}
function text(value) { if (typeof value !== 'string' || !value.trim() || value.length > 300) fail('preparation_text_invalid'); }
function id(value) { text(value); if (!/^[a-zA-Z0-9:_.@-]+$/.test(value)) fail('preparation_id_invalid'); }
function rows(value, key) {
  if (!Array.isArray(value) || value.length > 50000) fail('preparation_list_invalid');
  if (key && new Set(value.map(x => x?.[key])).size !== value.length) fail('preparation_duplicate_id');
}
function ids(value) { rows(value); value.forEach(id); if (new Set(value).size !== value.length) fail('preparation_duplicate_id'); }
function approved(row) { return row.status === 'approved'; }
function review(row) {
  if (!['draft', 'approved', 'retired'].includes(row.status)) fail('preparation_status_invalid');
  if (row.reviewedBy !== null) text(row.reviewedBy);
  if (approved(row) && !row.reviewedBy) fail('preparation_review_required');
}
export function validatePreparationCurriculum(input) {
  shape(input, ['schemaVersion', 'registryVersion', 'pathways', 'objectives', 'mappings', 'artifacts']);
  if (input.schemaVersion !== 1) fail('preparation_schema_invalid');
  id(input.registryVersion);
  rows(input.pathways, 'pathwayId'); rows(input.objectives, 'objectiveVersionId'); rows(input.mappings, 'mappingId'); rows(input.artifacts);
  const paths = new Set(), objectives = new Map();
  for (const p of input.pathways) {
    shape(p, ['pathwayId', 'pathwayVersionId', 'label', 'status']); id(p.pathwayId); id(p.pathwayVersionId); text(p.label);
    if (!['active', 'planned', 'retired'].includes(p.status) || paths.has(p.pathwayVersionId)) fail('preparation_pathway_invalid');
    paths.add(p.pathwayVersionId);
  }
  for (const o of input.objectives) {
    shape(o, ['objectiveId', 'objectiveVersionId', 'conceptId', 'task', 'depth', 'context', 'prerequisites']);
    for (const key of ['objectiveId', 'objectiveVersionId', 'conceptId', 'task', 'depth']) id(o[key]);
    shape(o.context, ['jurisdiction', 'population', 'setting']); Object.values(o.context).forEach(text); ids(o.prerequisites);
    objectives.set(o.objectiveVersionId, o);
  }
  const done = new Set(), active = new Set();
  function visit(key) {
    if (!objectives.has(key)) fail('preparation_objective_unknown');
    if (active.has(key)) fail('preparation_prerequisite_cycle');
    if (done.has(key)) return;
    active.add(key); objectives.get(key).prerequisites.forEach(visit); active.delete(key); done.add(key);
  }
  for (const key of objectives.keys()) visit(key);
  const mappingPairs = new Set(), artifactKeys = new Set();
  for (const m of input.mappings) {
    shape(m, ['mappingId', 'pathwayVersionId', 'objectiveVersionId', 'status', 'evidence', 'reviewedBy']);
    id(m.mappingId); review(m);
    if (!paths.has(m.pathwayVersionId) || !objectives.has(m.objectiveVersionId)) fail('preparation_mapping_reference_invalid');
    const pair = m.pathwayVersionId + '|' + m.objectiveVersionId;
    if (mappingPairs.has(pair)) fail('preparation_duplicate_mapping'); mappingPairs.add(pair);
    shape(m.evidence, ['kind', 'sourceId', 'sourceVersion']);
    if (!['official', 'expert', 'historical'].includes(m.evidence.kind)) fail('preparation_evidence_invalid');
    id(m.evidence.sourceId); text(m.evidence.sourceVersion);
  }
  for (const a of input.artifacts) {
    shape(a, ['artifactKind', 'artifactVersionId', 'objectiveVersionIds', 'role', 'status', 'reviewedBy', 'familyId']);
    if (!['question', 'note', 'media', 'case'].includes(a.artifactKind) || !['teaching', 'assessment'].includes(a.role)) fail('preparation_artifact_invalid');
    id(a.artifactVersionId); ids(a.objectiveVersionIds); review(a);
    if (!a.objectiveVersionIds.length || a.objectiveVersionIds.some(key => !objectives.has(key))) fail('preparation_artifact_objective_invalid');
    if (a.familyId !== null) id(a.familyId);
    const key = a.artifactKind + '|' + a.artifactVersionId;
    if (artifactKeys.has(key)) fail('preparation_duplicate_artifact'); artifactKeys.add(key);
  }
  return structuredClone(input);
}
export function validatePreparationProfile(input, curriculum) {
  shape(input, ['schemaVersion', 'pathwayIds', 'primaryPathwayId']);
  if (input.schemaVersion !== 1) fail('preparation_profile_schema_invalid');
  ids(input.pathwayIds); id(input.primaryPathwayId);
  if (!input.pathwayIds.length || input.pathwayIds.length > 8 || !input.pathwayIds.includes(input.primaryPathwayId)) fail('preparation_primary_invalid');
  if (input.pathwayIds.some(key => !curriculum.pathways.some(p => p.pathwayId === key && p.status === 'active'))) fail('preparation_pathway_unavailable');
  return {schemaVersion:1,pathwayIds:curriculum.pathways.filter(p => input.pathwayIds.includes(p.pathwayId)).map(p => p.pathwayId),primaryPathwayId:input.primaryPathwayId};
}
export function preparationContext(curriculum, input) {
  const checked = validatePreparationCurriculum(curriculum);
  if (input == null) return {curriculum:checked, profile:null, status:'unconfigured'};
  try { return {curriculum:checked, profile:validatePreparationProfile(input, checked), status:'configured'}; }
  catch { return {curriculum:checked, profile:null, status:'invalid-profile'}; }
}
export function resolvePreparation(curriculum, profile) {
  const c = validatePreparationCurriculum(curriculum), p = validatePreparationProfile(profile, c);
  const byId = new Map(c.objectives.map(o => [o.objectiveVersionId, o]));
  const closure = keys => {
    const found = new Set();
    function include(key) { if (found.has(key)) return; found.add(key); byId.get(key).prerequisites.forEach(include); }
    keys.forEach(include); return [...found];
  };
  const pathways = p.pathwayIds.map(key => {
    const path = c.pathways.find(x => x.pathwayId === key);
    const requiredObjectiveVersionIds = c.mappings.filter(m => approved(m) && m.pathwayVersionId === path.pathwayVersionId).map(m => m.objectiveVersionId);
    return {...path, requiredObjectiveVersionIds, objectiveVersionIds:closure(requiredObjectiveVersionIds)};
  });
  const required = new Set(pathways.flatMap(x => x.requiredObjectiveVersionIds));
  const objectiveVersionIds = [...new Set(pathways.flatMap(x => x.objectiveVersionIds))];
  return {registryVersion:c.registryVersion, profile:p, pathways, objectiveVersionIds, foundationObjectiveVersionIds:objectiveVersionIds.filter(key => !required.has(key))};
}
function availableBindings(library, curriculum) {
  const questionIds = new Set(library.questions.map(q => q.questionVersionId)), noteIds = new Set(library.notes.map(n => n.noteVersionId));
  // Other runtimes must supply their own exact published availability before counting.
  return curriculum.artifacts.filter(a => approved(a) && (a.artifactKind === 'question' ? questionIds.has(a.artifactVersionId) : a.artifactKind === 'note' && noteIds.has(a.artifactVersionId)));
}
export function preparationCoverage(library, curriculum, profile) {
  const resolved = resolvePreparation(curriculum, profile), bindings = availableBindings(library, curriculum);
  return {registryVersion:resolved.registryVersion, readinessInferred:false, pathways:resolved.pathways.map(p => {
    const required = p.requiredObjectiveVersionIds;
    const covered = role => required.filter(key => bindings.some(a => a.role === role && a.objectiveVersionIds.includes(key)));
    const teaching = covered('teaching'), assessment = covered('assessment');
    return {pathwayId:p.pathwayId,label:p.label,pathwayVersionId:p.pathwayVersionId,status:required.length ? 'mapped-inventory' : 'unmapped',required:required.length,
      withTeaching:teaching.length,withAssessment:assessment.length,missingTeaching:required.filter(k => !teaching.includes(k)),missingAssessment:required.filter(k => !assessment.includes(k)),
      assessmentFamilies:new Set(bindings.filter(a => a.role === 'assessment' && a.familyId && a.objectiveVersionIds.some(k => required.includes(k))).map(a => a.familyId)).size,
      coverageFraction:required.length ? required.filter(k => teaching.includes(k) && assessment.includes(k)).length / required.length : null};
  })};
}
export function preparationLibrary(library, scope) {
  if (!library.preparation) return library;
  const context = preparationContext(library.preparation.curriculum, library.preparation.profile);
  if (library.preparation.status === 'invalid-profile') context.status = 'invalid-profile';
  scope = scope || library.preparation.scope;
  const selectedScope = ['goals', 'foundations', 'all'].includes(scope) ? scope : context.status === 'unconfigured' ? 'all' : 'goals';
  if (context.status === 'unconfigured' || selectedScope === 'all') return {...library,preparation:{...context,scope:selectedScope}};
  const empty = () => ({...library,concepts:[],questions:[],notes:[],links:[],sources:[],medicalRelationships:[],preparation:{...context,scope:selectedScope}});
  if (!context.profile) return empty();
  const resolved = resolvePreparation(context.curriculum, context.profile);
  // No approved requirements means exam suitability is unknown, not that the
  // published catalog is unusable. Expose it only as explicitly unmapped
  // general practice; never infer objective bindings from topic or PYQ origin.
  if (selectedScope === 'goals' && resolved.pathways.every(p => !p.requiredObjectiveVersionIds.length)) {
    return {...library,preparation:{...context,scope:selectedScope,
      fallbackReason:'unmapped-goal-requirements',
      coverage:preparationCoverage(library,context.curriculum,context.profile)}};
  }
  const ids = new Set(selectedScope === 'foundations' ? resolved.foundationObjectiveVersionIds : resolved.objectiveVersionIds);
  const bindings = availableBindings(library, context.curriculum).filter(a => a.objectiveVersionIds.some(key => ids.has(key)));
  const questions = library.questions.filter(q => bindings.some(a => a.artifactKind === 'question' && a.artifactVersionId === q.questionVersionId));
  const seen = new Set();
  const uniqueQuestions = questions.filter(q => !seen.has(q.questionId) && seen.add(q.questionId));
  const notes = library.notes.filter(n => bindings.some(a => a.artifactKind === 'note' && a.artifactVersionId === n.noteVersionId));
  const conceptIds = new Set(context.curriculum.objectives.filter(o => ids.has(o.objectiveVersionId)).map(o => o.conceptId));
  // Preserve the complete published context of eligible artifacts without inventing objective mappings.
  uniqueQuestions.flatMap(q => q.conceptLinks || []).forEach(l => conceptIds.add(l.conceptId)); notes.forEach(n => conceptIds.add(n.conceptId));
  const questionIds = new Set(uniqueQuestions.map(q => q.questionId)), noteIds = new Set(notes.map(n => n.noteVersionId));
  const concepts = library.concepts.filter(c => conceptIds.has(c.conceptId));
  const visibleConceptIds = new Set(concepts.map(c => c.conceptId));
  const medicalRelationships = (library.medicalRelationships || []).filter(r => visibleConceptIds.has(r.fromConceptId) && visibleConceptIds.has(r.toConceptId));
  const sourceIds = new Set([...uniqueQuestions, ...notes].flatMap(a => a.sourceIds || []));
  medicalRelationships.forEach(r => sourceIds.add(r.sourceId));
  return {...library,concepts,questions:uniqueQuestions,notes,medicalRelationships,
    sources:(library.sources || []).filter(s => sourceIds.has(s.sourceId)),links:(library.links || []).filter(l => questionIds.has(l.question_id) && noteIds.has(l.note_version_id)),
    preparation:{...context,scope:selectedScope,coverage:preparationCoverage(library,context.curriculum,context.profile)}};
}
export function preparationQuestionScope(questions, curriculum, profile) {
  const context = preparationContext(curriculum, profile);
  const result = preparationLibrary({concepts:[],questions,notes:[],links:[],preparation:context}, 'goals');
  return {questions:result.questions,registryVersion:curriculum.registryVersion,status:context.status,profile:context.profile,
    fallbackReason:result.preparation?.fallbackReason||null};
}
