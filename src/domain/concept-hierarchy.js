// Parent → sub-topic hierarchy for canonical concepts and topics (ADR-144). Pure functions; no I/O.
// Owner decision 2026-11-20: one optional parent per concept/topic, many levels deep, filled in later
// (never automatically). Questions and notes linked to a child also roll up under every ancestor, so a
// parent's Library and Question bank listings include its sub-topics' material.
export const HIERARCHY_CONTRACT='mlos-concept-hierarchy-v1';
export const MAX_DEPTH=8;
// Node identities: canonical concept, official NMC source topic, or an owner-added sub-topic.
const CONCEPT=/^C-[0-9A-Za-z-]{1,80}$/;
const NMC_TOPIC=/^nmc-2024-topic:[0-9a-f]{64}$/;
const CUSTOM=/^mlos-topic:[a-z0-9]+(?:-[a-z0-9]+){0,15}$/;
export const nodeKind=id=>typeof id!=='string'?null:CONCEPT.test(id)?'concept':NMC_TOPIC.test(id)?'nmc-topic':CUSTOM.test(id)?'subtopic':null;
const fail=(code,detail)=>{const e=new Error(code);e.detail=detail;throw e;};

// knownIds: Set of concept and NMC topic IDs that exist in the current catalogue. Custom sub-topics are
// declared in doc.nodes. Throws hierarchy_invalid with a detail on the first problem.
export function validateHierarchy(doc,knownIds=new Set()){
 if(!doc||doc.contractId!==HIERARCHY_CONTRACT||doc.schemaVersion!==1||!Array.isArray(doc.nodes)||!Array.isArray(doc.links))fail('hierarchy_invalid','shape');
 const custom=new Map();
 for(const n of doc.nodes){
  if(!n||nodeKind(n.nodeId)!=='subtopic'||typeof n.label!=='string'||!n.label.trim()||n.label.length>200)fail('hierarchy_invalid','node:'+n?.nodeId);
  if(!Array.isArray(n.subjectIds)||n.subjectIds.some(s=>typeof s!=='string'))fail('hierarchy_invalid','node-subjects:'+n.nodeId);
  if(custom.has(n.nodeId))fail('hierarchy_invalid','duplicate-node:'+n.nodeId);
  custom.set(n.nodeId,n);
 }
 const exists=id=>custom.has(id)||knownIds.has(id);
 const parent=new Map();
 for(const l of doc.links){
  if(!l||!nodeKind(l.childId)||!nodeKind(l.parentId))fail('hierarchy_invalid','link-id:'+l?.childId);
  if(l.childId===l.parentId)fail('hierarchy_invalid','self-link:'+l.childId);
  if(!exists(l.childId)||!exists(l.parentId))fail('hierarchy_invalid','unknown-node:'+(exists(l.childId)?l.parentId:l.childId));
  if(parent.has(l.childId))fail('hierarchy_invalid','second-parent:'+l.childId);
  // An official NMC topic never sits under a concept or a custom sub-topic; it can only be a parent.
  if(nodeKind(l.childId)==='nmc-topic')fail('hierarchy_invalid','nmc-topic-as-child:'+l.childId);
  parent.set(l.childId,l.parentId);
 }
 for(const start of parent.keys()){
  const seen=new Set([start]);let at=start,depth=0;
  while(parent.has(at)){at=parent.get(at);if(seen.has(at))fail('hierarchy_invalid','cycle:'+start);seen.add(at);if(++depth>MAX_DEPTH)fail('hierarchy_invalid','too-deep:'+start);}
 }
 for(const id of custom.keys())if(!parent.has(id))fail('hierarchy_invalid','orphan-subtopic:'+id);
 return doc;
}

// Read-side index. Build once per data version.
export function hierarchyIndex(doc){
 const parent=new Map(),children=new Map(),labels=new Map(doc.nodes.map(n=>[n.nodeId,n.label]));
 for(const l of doc.links){parent.set(l.childId,l.parentId);if(!children.has(l.parentId))children.set(l.parentId,[]);children.get(l.parentId).push(l.childId);}
 for(const list of children.values())list.sort();
 const ancestors=id=>{const out=[];let at=id;while(parent.has(at)){at=parent.get(at);out.push(at);}return out;};
 const descendants=id=>{const out=[],stack=[...(children.get(id)||[])].reverse();while(stack.length){const c=stack.pop();out.push(c);stack.push(...[...(children.get(c)||[])].reverse());}return out;};
 return {
  parentOf:id=>parent.get(id)||null,
  childrenOf:id=>[...(children.get(id)||[])],
  ancestors,          // nearest parent first
  descendants,        // depth-first, stable order
  rollupIds:id=>[id,...descendants(id)], // use for Library/Question bank listings of a parent
  customLabel:id=>labels.get(id)||null
 };
}

// Items (questions, notes, objectives) linked to a node or any of its sub-topics.
// linkedIdsOf(item) returns the concept/topic IDs the item is linked to.
export function rollUp(items,index,nodeId,linkedIdsOf){
 const ids=new Set(index.rollupIds(nodeId));
 return items.filter(it=>linkedIdsOf(it).some(x=>ids.has(x)));
}

// Pure edit used by the CLI and, later, an Admin route. Returns a new document; validate after.
export function addLink(doc,{childId,parentId,newSubtopic=null}){
 const next={...doc,nodes:[...doc.nodes],links:[...doc.links]};
 if(newSubtopic)next.nodes.push({nodeId:childId,label:newSubtopic.label,subjectIds:newSubtopic.subjectIds||[]});
 next.links.push({childId,parentId});
 next.links.sort((a,b)=>a.childId.localeCompare(b.childId));
 next.nodes.sort((a,b)=>a.nodeId.localeCompare(b.nodeId));
 return next;
}
export function removeLink(doc,childId){
 const next={...doc,links:doc.links.filter(l=>l.childId!==childId)};
 // A custom sub-topic without a parent has no home; drop it with its link (it never owns learner data).
 if(nodeKind(childId)==='subtopic')next.nodes=doc.nodes.filter(n=>n.nodeId!==childId);
 return next;
}
export const subtopicId=label=>'mlos-topic:'+label.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').split('-').slice(0,16).join('-');
