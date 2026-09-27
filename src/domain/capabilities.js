const definitions = [
  {
    id: 'learning.study.recommend',
    version: 1,
    risk: 'low',
    humanApproval: 'not_required',
    offlineSupport: 'possible'
  },
  {
    id: 'learning.memory.schedule',
    version: 1,
    risk: 'low',
    humanApproval: 'not_required',
    offlineSupport: 'yes'
  },
  {
    id: 'learning.session.create',
    version: 1,
    risk: 'low',
    humanApproval: 'not_required',
    offlineSupport: 'possible'
  },
  {
    id: 'assessment.evaluate',
    version: 1,
    risk: 'medium',
    humanApproval: 'not_required',
    offlineSupport: 'possible'
  },
  {
    id: 'knowledge.search',
    version: 1,
    risk: 'low',
    humanApproval: 'not_required',
    offlineSupport: 'possible'
  },
  {
    id: 'content.review.propose',
    version: 1,
    risk: 'medium',
    humanApproval: 'required_for_authoritative_decision',
    offlineSupport: 'possible'
  },
  {
    id: 'content.source.inspect',
    version: 1,
    risk: 'low',
    humanApproval: 'not_required',
    offlineSupport: 'possible'
  }
];

const registry = new Map(definitions.map(item => [item.id, Object.freeze({ ...item })]));

export const CAPABILITY_IDS = Object.freeze(definitions.map(item => item.id));

export function getCapability(id) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Invalid capability identifier');
  const capability = registry.get(id);
  if (!capability) throw new TypeError(`Unknown capability: ${id}`);
  return capability;
}

export function listCapabilities() {
  return Object.freeze(CAPABILITY_IDS.map(id => registry.get(id)));
}
