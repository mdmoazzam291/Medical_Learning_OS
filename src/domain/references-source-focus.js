// Read-only queue index. A source inspection can be shared; a review decision cannot.
export function referencesSourceFocus(items) {
  if (!Array.isArray(items)) throw new TypeError('Expected review queue');
  const sources = new Map();
  for (const item of items) {
    const targetId = item?.question?.questionVersionId || item?.note?.noteVersionId;
    if (!targetId) continue;
    for (const source of Array.isArray(item.sources) ? item.sources : []) {
      if (!source?.sourceId || !source?.version) continue;
      const key = JSON.stringify([source.sourceId, source.version]);
      if (!sources.has(key)) sources.set(key, { source, targetIds: new Set() });
      sources.get(key).targetIds.add(targetId);
    }
  }
  return [...sources.values()].map(entry => ({
    source: entry.source, targetIds: [...entry.targetIds].sort()
  })).sort((a, b) => b.targetIds.length - a.targetIds.length ||
    a.source.sourceId.localeCompare(b.source.sourceId));
}

export function filterReferencesBySource(items, sourceId) {
  if (!sourceId) return items;
  return items.filter(item => Array.isArray(item.sources) &&
    item.sources.some(source => source?.sourceId === sourceId));
}
