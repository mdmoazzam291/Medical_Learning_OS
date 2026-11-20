import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateHierarchy,hierarchyIndex,rollUp,addLink,removeLink,subtopicId,nodeKind,HIERARCHY_CONTRACT} from '../src/domain/concept-hierarchy.js';
import {validatePreviewData,previewPage} from '../src/domain/nmc-admin-learner-preview.js';
import {learnerPreviewMarkup} from '../web/nmc-admin-learner-preview.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const empty={schemaVersion:1,contractId:HIERARCHY_CONTRACT,status:'test',nodes:[],links:[]};
const T='nmc-2024-topic:'+'a'.repeat(64);
const known=new Set(['C-plexus','C-erb','C-klumpke',T]);

test('registry file is valid against the current preview concepts and topics',()=>{
 const doc=read('data/concept-hierarchy.json'),preview=read('data/nmc-admin-learner-preview.json');
 validateHierarchy(doc,new Set([...preview.items.map(i=>i.conceptId),...preview.items.map(i=>i.topicId)]));
});

test('node kinds',()=>{
 assert.equal(nodeKind('C-79d0924a-e2a2'),'concept');assert.equal(nodeKind(T),'nmc-topic');
 assert.equal(nodeKind('mlos-topic:erbs-palsy'),'subtopic');assert.equal(nodeKind('erbs'),null);assert.equal(nodeKind(5),null);
 assert.equal(subtopicId("Erb's palsy (upper trunk)"),'mlos-topic:erb-s-palsy-upper-trunk');
});

test('one parent, no cycles, no self links, NMC topics only as parents, sub-topics need a parent',()=>{
 const bad=(links,nodes=[])=>assert.throws(()=>validateHierarchy({...empty,links,nodes},known),/hierarchy_invalid/);
 bad([{childId:'C-erb',parentId:'C-erb'}]);
 bad([{childId:'C-erb',parentId:'C-plexus'},{childId:'C-erb',parentId:'C-klumpke'}]);
 bad([{childId:'C-erb',parentId:'C-plexus'},{childId:'C-plexus',parentId:'C-erb'}]);
 bad([{childId:T,parentId:'C-plexus'}]);
 bad([{childId:'C-unknown',parentId:'C-plexus'}]);
 bad([],[{nodeId:'mlos-topic:orphan',label:'Orphan',subjectIds:[]}]);
 const chain=Array.from({length:10},(_,n)=>'C-n'+n),deep=new Set(chain);
 assert.throws(()=>validateHierarchy({...empty,links:chain.slice(1).map((c,n)=>({childId:c,parentId:chain[n]}))},deep),/hierarchy_invalid/);
 validateHierarchy({...empty,links:[{childId:'C-plexus',parentId:T},{childId:'C-erb',parentId:'C-plexus'}]},known);
});

test('add, index, roll up and remove',()=>{
 let doc=addLink(empty,{childId:'C-plexus',parentId:T});
 doc=addLink(doc,{childId:'C-erb',parentId:'C-plexus'});
 doc=addLink(doc,{childId:'C-klumpke',parentId:'C-plexus'});
 doc=addLink(doc,{childId:subtopicId('Waiter tip sign'),parentId:'C-erb',newSubtopic:{label:'Waiter tip sign',subjectIds:['anatomy']}});
 validateHierarchy(doc,known);
 const ix=hierarchyIndex(doc);
 assert.deepEqual(ix.ancestors('mlos-topic:waiter-tip-sign'),['C-erb','C-plexus',T]);
 assert.deepEqual(ix.childrenOf('C-plexus'),['C-erb','C-klumpke']);
 assert.deepEqual(ix.rollupIds(T),[T,'C-plexus','C-erb','mlos-topic:waiter-tip-sign','C-klumpke']);
 // A question linked to a sub-topic is listed under every ancestor; a parent's own question is not listed under its child.
 const qs=[{id:'q1',links:['C-erb']},{id:'q2',links:['C-plexus']},{id:'q3',links:['C-other']}];
 assert.deepEqual(rollUp(qs,ix,'C-plexus',q=>q.links).map(q=>q.id),['q1','q2']);
 assert.deepEqual(rollUp(qs,ix,'C-erb',q=>q.links).map(q=>q.id),['q1']);
 const removed=removeLink(doc,'mlos-topic:waiter-tip-sign');
 assert.equal(removed.nodes.length,0);validateHierarchy(removed,known);
});

test('preview shows breadcrumb and sub-topics only when links exist',()=>{
 const data=read('data/nmc-admin-learner-preview.json');
 assert.equal(data.hierarchy,undefined);
 const [a,b]=[...new Set(data.items.map(i=>i.conceptId))];
 const topic=data.items.find(i=>i.topicLabelKind==='source-topic');
 const withH={...data,hierarchy:{status:'test',nodes:{[a]:'Parent A',[b]:'Child B',[topic.topicId]:topic.topicLabel},links:[{childId:a,parentId:topic.topicId},{childId:b,parentId:a}]}};
 validatePreviewData(withH);
 const page=previewPage(withH,{view:'concept',concept:a});
 assert.deepEqual(page.concept.hierarchy.children.map(n=>n.id),[b]);
 assert.deepEqual(page.concept.hierarchy.ancestors.map(n=>n.kind),['nmc-topic']);
 assert.match(learnerPreviewMarkup(page,{view:'concept',concept:a}),/Sub-topics: <button[^>]+data-preview-concept="[^"]+">Child B/);
 const subject=previewPage(withH,{subject:topic.subjectId});
 assert.ok(subject.topics.some(t=>t.hierarchy?.children.some(n=>n.id===a)));
 assert.equal(previewPage(data,{view:'concept',concept:a}).concept.hierarchy,null);
 assert.throws(()=>validatePreviewData({...data,hierarchy:{nodes:{},links:[{childId:a,parentId:b}]}}),/preview_data_invalid/);
});
