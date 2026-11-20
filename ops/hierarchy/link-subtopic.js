// Add or remove parent → sub-topic links in data/concept-hierarchy.json (ADR-144).
// Concept and NMC topic IDs come from the NMC preview data (every concept/topic that has an objective).
//   node ops/hierarchy/link-subtopic.js --find "brachial plexus"            # look up IDs by label
//   node ops/hierarchy/link-subtopic.js --parent <id> --child <id>          # existing concept under a parent
//   node ops/hierarchy/link-subtopic.js --parent <id> --new "Erb's palsy" [--subjects anatomy,orthopaedics]
//   node ops/hierarchy/link-subtopic.js --unlink <childId>
//   node ops/hierarchy/link-subtopic.js --check                             # validate only (used by tests)
// After a change: node ops/nmc/build-admin-learner-preview.js, then repin and redeploy nmc-admin-preview.
import {readFileSync,writeFileSync} from 'node:fs';
import {validateHierarchy,addLink,removeLink,subtopicId,nodeKind} from '../../src/domain/concept-hierarchy.js';
const path=new URL('../../data/concept-hierarchy.json',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const preview=read('data/nmc-admin-learner-preview.json');
const labels=new Map();
for(const i of preview.items){labels.set(i.conceptId,i.conceptLabel||i.conceptId);if(i.topicId&&i.topicLabelKind==='source-topic')labels.set(i.topicId,i.topicLabel||i.topicId);}
const known=new Set(labels.keys());
const args=process.argv.slice(2),arg=k=>{const n=args.indexOf(k);return n<0?null:args[n+1];};
let doc=JSON.parse(readFileSync(path,'utf8'));
const save=d=>{validateHierarchy(d,known);writeFileSync(path,JSON.stringify(d)+'\n');console.log('saved',d.links.length,'links,',d.nodes.length,'custom sub-topics');};
if(args.includes('--check')){validateHierarchy(doc,known);console.log('ok',doc.links.length,'links');}
else if(arg('--find')){
 const q=arg('--find').toLowerCase();
 for(const [id,label] of labels)if(label.toLowerCase().includes(q))console.log(nodeKind(id).padEnd(9),id,' ',label);
 for(const n of doc.nodes)if(n.label.toLowerCase().includes(q))console.log('subtopic ',n.nodeId,' ',n.label);
}
else if(arg('--unlink'))save(removeLink(doc,arg('--unlink')));
else if(arg('--parent')&&(arg('--child')||arg('--new'))){
 const parentId=arg('--parent');
 if(arg('--new')){
  const label=arg('--new').trim(),childId=subtopicId(label);
  const subjectIds=(arg('--subjects')||'').split(',').map(s=>s.trim()).filter(Boolean);
  save(addLink(doc,{childId,parentId,newSubtopic:{label,subjectIds}}));
 } else save(addLink(doc,{childId:arg('--child'),parentId}));
}
else {console.error('usage: see header of ops/hierarchy/link-subtopic.js');process.exit(2);}
