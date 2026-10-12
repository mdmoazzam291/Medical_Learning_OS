// Owner-only diagnostic projection. Observations are user-submitted evidence,
 // not independent verification, clinical approval or a publication gate.
const identifier = x => typeof x === 'string' && /^[a-zA-Z0-9:_@.\-]{1,160}$/.test(x);
const plain = (x,max) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const supportedKinds = new Set(['version_seen','source_retired']);
const safeEvidenceUrl = value => {
  if (!plain(value,2000)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
};
export function validateSourceSighting(input, sources) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).sort().join('|') !==
      ['requestId','sourceId','kind','observedVersion','evidenceUrl','evidenceNote','catalogVersion'].sort().join('|')) {
    throw new TypeError('source_sighting_fields_invalid');
  }
  if (typeof input.requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw new TypeError('source_sighting_request_id_invalid');
  }
  if (!identifier(input.sourceId) || !supportedKinds.has(input.kind) ||
    !Number.isSafeInteger(input.catalogVersion) || input.catalogVersion < 0 ||
    !safeEvidenceUrl(input.evidenceUrl) ||
    !plain(input.evidenceNote,2000) || input.evidenceNote.trim().length < 20 ||
    !Array.isArray(sources)) throw new TypeError('source_sighting_invalid');

  const source = sources.find(s => s.sourceId === input.sourceId);
  if (!source) throw new TypeError('source_sighting_source_not_found');
  if (!plain(source.version,300)) throw new TypeError('source_sighting_cited_version_invalid');
  if (input.kind === 'version_seen' && (!plain(input.observedVersion,300) ||
      input.observedVersion.trim() === source.version.trim())) {
    throw new TypeError('source_sighting_version_difference_required');
  }
  if (input.kind === 'source_retired' && input.observedVersion !== null) {
    throw new TypeError('source_sighting_retired_version_must_be_null');
  }
  return {
    request_id: input.requestId, source_id: input.sourceId, kind: input.kind,
    cited_version: source.version, observed_version: input.observedVersion,
    evidence_url: input.evidenceUrl, evidence_note: input.evidenceNote.trim(),
    catalog_version: input.catalogVersion
  };
}
const uniqueSorted = x => [...new Set(x)].sort((a,b)=>a.localeCompare(b));
export function buildSourceWatchReport({catalog, notes, observations, catalogVersion}={}) {
  if (!catalog || !Array.isArray(catalog.sources) || !Array.isArray(catalog.questions) ||
    !Array.isArray(notes) || !Array.isArray(observations) ||
    !Number.isSafeInteger(catalogVersion) || catalogVersion < 0) {
    throw new TypeError('source_watch_snapshot_incomplete');
  }
  const publishedQuestions = catalog.questions.filter(q=>q?.status==='published');
  const reviewedQuestions = catalog.questions.filter(q=>q?.status==='in_review');
  const publishedNotes = notes.filter(n=>n?.status==='published');
  const reviewedNotes = notes.filter(n=>n?.status==='in_review');
  const latest = new Map();
  for (const o of observations) {
    const key=JSON.stringify([o.source_id,o.cited_version]);
    const prev=latest.get(key);
    if (!prev || Date.parse(o.recorded_at)>Date.parse(prev.recorded_at) ||
      (o.recorded_at === prev.recorded_at && String(o.id)>String(prev.id))) latest.set(key,o);
  }
  const ids = new Set();
  const rows = [];
  for (const source of catalog.sources) {
    if (!identifier(source?.sourceId) || !plain(source.version,300) ||
      ids.has(source.sourceId)) throw new TypeError('source_watch_catalog_invalid');
    ids.add(source.sourceId);
    const match=q=>Array.isArray(q?.sourceIds)&&q.sourceIds.includes(source.sourceId);
    const matchesNote=n=>Array.isArray(n?.source_ids)&&n.source_ids.includes(source.sourceId);
    const affected = {
      publishedQuestionVersions:uniqueSorted(publishedQuestions.filter(match).map(q=>q.questionVersionId).filter(x=>typeof x==='string')),
      inReviewQuestionVersions:uniqueSorted(reviewedQuestions.filter(match).map(q=>q.questionVersionId).filter(x=>typeof x==='string')),
      publishedNoteVersions:uniqueSorted(publishedNotes.filter(matchesNote).map(n=>n.id).filter(x=>typeof x==='string')),
      inReviewNoteVersions:uniqueSorted(reviewedNotes.filter(matchesNote).map(n=>n.id).filter(x=>typeof x==='string'))
    };
    const obs = latest.get(JSON.stringify([source.sourceId, source.version]));
    rows.push({
      sourceId:source.sourceId,
      title:typeof source.title==='string'?source.title:'',
      citedVersion:source.version,
      sourceUrl:typeof source.url==='string'&&safeEvidenceUrl(source.url)?source.url:null,
      status:obs ? obs.kind==='source_retired'?'possible_retirement':'possible_version_change' : 'not_monitored',
      sighting: obs ? {
        id:obs.id, kind:obs.kind, observedVersion:obs.observed_version,
        evidenceUrl:obs.evidence_url, evidenceNote:obs.evidence_note, recordedAt:obs.recorded_at
      } : null,
      affected,
      affectedCount:Object.values(affected).reduce((n,v)=>n+v.length,0)
    });
  }
  rows.sort((a,b)=>(b.status!=='not_monitored')-(a.status!=='not_monitored') ||
    b.affectedCount-a.affectedCount || a.sourceId.localeCompare(b.sourceId));
  return {
    contractId:'owner-medical-source-watch-v1', catalogVersion,
    asOf:null, sourceCount:rows.length,
    sourcesWithSightings: rows.filter(s=>s.sighting).length,
    pendingVerification:rows.filter(s=>s.sighting && s.affectedCount>0).length,
    unmatchedHistoricalSightings:observations.filter(o=>!ids.has(o.source_id) ||
      catalog.sources.find(s=>s.sourceId===o.source_id)?.version!==o.cited_version).length,
    sources:rows, scope:'owner_submitted_evidence_only',
    automatedWebChecks:false, medicalUpdateVerified:false, clinicalApprovalGranted:false
  };
}
