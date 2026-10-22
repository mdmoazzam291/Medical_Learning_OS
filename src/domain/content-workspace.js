import { libraryContextUrl, libraryRouteState, selectWorkspace } from './library-workspaces.js';
const normalized = value => String(value || '').normalize('NFKC').toLowerCase().trim();
export const CONTENT_GROUPS = Object.freeze([
  { label: 'Explore', items: [['overview','Concept Explorer'],['subjects','Subjects & Topics'],['overview','Body Systems','system'],['overview','Clinical Problems','task']] },
  { label: 'Content Collections', items: [['notes','Concept Notes'],['questions','QBank','platform'],['questions','Original QBank','original'],['questions','PYQs','pyq'],['media','Media Library'],['atlas','Atlas'],['cases','Clinical Cases']] },
  { label: 'Connections', items: [['graph','Knowledge Graph'],['compare','Compare Concepts'],['foundation','Prerequisite Paths'],['references','Reference Tools']] },
  { label: 'My Library', items: [['vault','NeuralVault / My Notes'],['savedviews','Bookmarks & Saved Views']] }
]);
export function transitionContext(search, overrides = {}) {
  const next = { ...overrides };
  if (Object.hasOwn(next,'collection')) {
    if(next.collection==='pyq')next.platform='';
    if(['platform','original'].includes(next.collection))next.exam='';
    if(next.collection==='original')next.platform='';
  }
  if (next.view) {
    const to = next.view;
    if (!['media','atlas','images'].includes(to)) next.category = '';
    if (!['references','skills'].includes(to)) next.reference = '';
    if (to !== 'subjects') next.module = '';
    if (!['questions','cases','images','media','atlas','graph'].includes(to)) {
      for (const k of ['collection','exam','platform','observed','keyword','qualifier','medium','response']) next[k] = '';
    }
    if (to !== 'graph') next.perspective = '';
    if(to!=='overview')next.browse='';
  }
  return libraryContextUrl(search, next);
}
export function exploreConcepts(library, { search = '', subject = '', system = '', task = '', limit = 60 } = {}) {
  const needle = normalized(search);
  const items = library.concepts.filter(c => (!subject || c.classification?.subjects?.includes(subject)) && (!system || c.classification?.systems?.includes(system)) && (!task || c.classification?.tasks?.includes(task)) && (!needle || normalized([c.label, ...(c.aliases || [])].join(' ')).includes(needle))).sort((a,b) => a.label.localeCompare(b.label) || a.conceptId.localeCompare(b.conceptId));
  return { total: items.length, items: items.slice(0, Math.min(1000, Math.max(1, Number(limit) || 60))) };
}
export function conceptDossier(library, conceptId, options = {}) {
  const concept = library.concepts.find(c => c.conceptId === conceptId) || null;
  const data = concept ? selectWorkspace(library, { ...options, filters: { ...(options.filters || {}), concept: conceptId } }) : { questions: [], notes: [], links: [] };
  const sourceIds = new Set([...data.questions,...data.notes].flatMap(x => x.sourceIds || []));
  return { concept, questions: data.questions, notes: data.notes, links: data.links || [], sources: (library.sources || []).filter(s => sourceIds.has(s.sourceId)), counts: { questions: data.questions.length, notes: data.notes.length, pyq: data.questions.filter(q => q.home.kind === 'pyq').length, media: data.questions.filter(q => q.intelligence?.presentation?.some(p => ['image','ecg-tracing','histology','audio','video'].includes(p))).length, cases: data.questions.filter(q => q.intelligence?.presentation?.some(p => ['clinical-vignette','sequential-case'].includes(p))).length } };
}
export function conceptNeighborhood(library, conceptId, { perspective = 'exam', limit = 30, ...options } = {}) {
  const dossier = conceptDossier(library, conceptId, options);
  if (!dossier.concept) return { nodes: [], edges: [], hidden: 0, hiddenEdges:0, perspective };
  const center = 'concept:' + conceptId, nodes = new Map([[center,{ id:center, kind:'concept', conceptId, label:dossier.concept.label }]]), edges = [];
  const known = new Map(library.concepts.map(c => [c.conceptId,c]));
  if (perspective === 'medical') {
    // Only pre-reviewed, exact-version projections from the protected library API.
    // Neither educational co-links nor learner weaknesses imply clinical causality.
    for (const r of library.medicalRelationships || []) {
      if (!r || (r.fromConceptId !== conceptId && r.toConceptId !== conceptId)) continue;
      if (!known.has(r.fromConceptId) || !known.has(r.toConceptId) || r.fromConceptId === r.toConceptId) continue;
      for (const id of [r.fromConceptId,r.toConceptId])
        nodes.set('concept:'+id,{id:'concept:'+id,kind:'concept',conceptId:id,label:known.get(id).label});
      edges.push({from:'concept:'+r.fromConceptId,to:'concept:'+r.toConceptId,
        kind:r.relationType,evidenceVersionId:r.evidenceVersionId,relationVersionId:r.relationshipVersionId,
        claimText:r.claimText,sourceId:r.sourceId,sourceVersion:r.sourceVersion});
    }
  } else if (perspective === 'learning') {
    for (const q of dossier.questions) for (const from of q.conceptLinks.filter(l => l.role === 'prerequisite')) for (const to of q.conceptLinks.filter(l => l.role === 'primary')) {
      if (from.conceptId === to.conceptId || ![from.conceptId,to.conceptId].includes(conceptId) || !known.has(from.conceptId) || !known.has(to.conceptId)) continue;
      for (const id of [from.conceptId,to.conceptId]) nodes.set('concept:'+id,{ id:'concept:'+id,kind:'concept',conceptId:id,label:known.get(id).label });
      edges.push({ from:'concept:'+from.conceptId,to:'concept:'+to.conceptId,kind:'prerequisite-evidence',evidenceVersionId:q.questionVersionId });
    }
  } else if (perspective !== 'medical') {
    for (const q of dossier.questions) {
      const id='question:'+q.questionVersionId;
      nodes.set(id,{ id,kind:'question',questionId:q.questionId,label:q.stem,observed:q.observed });
      edges.push({ from:center,to:id,kind:q.conceptLinks.find(l=>l.conceptId===conceptId)?.role || 'note-link',evidenceVersionId:q.questionVersionId });
    }
    for (const n of dossier.notes) {
      const id='note:'+n.noteVersionId; nodes.set(id,{id,kind:'note',noteVersionId:n.noteVersionId,label:n.title});
      edges.push({from:center,to:id,kind:'canonical-note',evidenceVersionId:n.noteVersionId});
    }
  }
  const max = Math.max(2,Math.min(100,Number(limit)||30)), selected=[...nodes.values()].slice(0,max), ids=new Set(selected.map(n=>n.id));
  const eligibleEdges=edges.filter(x=>ids.has(x.from)&&ids.has(x.to));
  return { nodes:selected,edges:eligibleEdges.slice(0,max*2),hidden:nodes.size-selected.length,hiddenEdges:eligibleEdges.length-Math.min(eligibleEdges.length,max*2),perspective };
}
export function contextState(search) { return libraryRouteState(search); }
