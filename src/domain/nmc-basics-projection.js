// Derived authoring view only. No new identities, content copies or approval claims.
import {validatePreparationCurriculum} from './preparation-pathways.js';
export function projectFoundationBasics(curriculum, targetObjectiveVersionIds) {
  const c = validatePreparationCurriculum(curriculum);
  const byId = new Map(c.objectives.map(o => [o.objectiveVersionId, o]));
  if (!Array.isArray(targetObjectiveVersionIds) || targetObjectiveVersionIds.length > c.objectives.length ||
      new Set(targetObjectiveVersionIds).size !== targetObjectiveVersionIds.length ||
      targetObjectiveVersionIds.some(id => typeof id !== 'string' || !byId.has(id))) {
    throw new TypeError('foundation_basics_targets_invalid');
  }
  const targets = new Set(targetObjectiveVersionIds), ordered = [], seen = new Set(), neededBy = new Map();
  for (const target of targets) {
    const visited = new Set();
    function visit(id) {
      if (visited.has(id)) return;
      visited.add(id);
      const objective = byId.get(id);
      objective.prerequisites.forEach(visit);
      if (!neededBy.has(id)) neededBy.set(id, new Set());
      neededBy.get(id).add(target);
      if (!seen.has(id)) { seen.add(id); ordered.push(id); }
    }
    visit(target);
  }
  const concepts = new Map();
  for (const id of ordered) {
    const o = byId.get(id);
    if (!concepts.has(o.conceptId)) concepts.set(o.conceptId, {
      conceptId:o.conceptId, objectiveVersionIds:[], targetObjectiveVersionIds:[],
      basicsObjectiveVersionIds:[], requiredByTargetObjectiveVersionIds:[]
    });
    const row = concepts.get(o.conceptId);
    row.objectiveVersionIds.push(id);
    row[targets.has(id) ? 'targetObjectiveVersionIds' : 'basicsObjectiveVersionIds'].push(id);
    row.requiredByTargetObjectiveVersionIds = [...new Set([...row.requiredByTargetObjectiveVersionIds, ...neededBy.get(id)])];
  }
  return {
    registryVersion:c.registryVersion, targetObjectiveVersionIds:[...targets],
    objectiveVersionIds:ordered, basicsObjectiveVersionIds:ordered.filter(id => !targets.has(id)),
    concepts:[...concepts.values()],
    prerequisiteEdges:ordered.flatMap(id => byId.get(id).prerequisites.map(prerequisiteObjectiveVersionId => ({
      objectiveVersionId:id, prerequisiteObjectiveVersionId
    }))),
    coverageFraction:null, readinessInferred:false
  };
}
