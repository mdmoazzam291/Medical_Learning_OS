import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=(await readFile(new URL('../web/medical-relationship-admin.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
function harness(){
 const nodes=new Map(),listeners=new Map(),pending=new Map();let allow=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,isConnected:true,checked:false,listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},setAttribute(){},querySelector:selector=>node(selector),querySelectorAll:()=>[...nodes.values()],focus(){}});return nodes.get(id);};
 const root=node('#medical-relationships');root.querySelector=id=>node(id);node('#relationship-detail textarea');node('#relationship-retire').elements={reason:{value:''}};node('#relationship-publish').elements={reviewNotes:{value:''},attested:{checked:false}};
 const context=vm.createContext({TextEncoder,document:{querySelector:()=>root},window:{confirm:()=>allow,addEventListener:(type,fn)=>listeners.set(type,fn)},e:String,request:(path,body)=>path==='/relationships'&&body===undefined?Promise.resolve({versions:[]}):new Promise((resolve,reject)=>pending.set(path,{resolve,reject,body}))});
 vm.runInContext(code,context);
 const packet=id=>({version:{relationshipVersionId:id,digest:'a'.repeat(64),assertion:{version:1,fromConceptId:'alpha',toConceptId:'beta'},bindings:{}},events:[],reviewKinds:['medical','references','rights'],currentBindings:{},isLatest:true,rightsReady:true,source:{},concepts:[]});
 return {context,node,pending,packet,allow:()=>{allow=true;},warned(){let warned=false;listeners.get('beforeunload')({preventDefault(){warned=true;}});return warned;},inspect:async id=>{const p=vm.runInContext(`inspect('${id}')`,context);pending.get('/relationships/'+id).resolve(packet(id));await p;}};
}
test('stage locks every editor during delayed save and restores them on failure with draft warning',{timeout:2000},async()=>{
 const h=harness();const input=h.node('#relationship-json');input.value='{"relationshipId":"A"}';h.node('#relationship-stage').listeners.input();
 const p=h.node('#relationship-stage').listeners.submit({preventDefault(){}});
 assert.equal(input.disabled,true);assert.equal(h.node('#relationship-detail textarea').disabled,true);
 h.pending.get('/relationships').reject(new Error('Temporary unavailable'));await p;
 assert.equal(input.disabled,false);assert.equal(input.value,'{"relationshipId":"A"}');assert.equal(h.warned(),true);
});
test('stage keeps editors locked through delayed inspection following a successful save',{timeout:2000},async()=>{
 const h=harness();h.node('#relationship-json').value='{"relationshipId":"A"}';h.node('#relationship-stage').listeners.input();
 const p=h.node('#relationship-stage').listeners.submit({preventDefault(){}});assert.equal(h.node('#relationship-json').disabled,true);
 h.pending.get('/relationships').resolve({relationshipVersionId:'A@1'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.node('#relationship-json').disabled,true);h.pending.get('/relationships/A%401').resolve(h.packet('A@1'));await p;
 assert.equal(h.node('#relationship-json').disabled,false);assert.equal(h.warned(),false);
 h.node('#relationship-json').value='Unsaved B';h.node('#relationship-stage').listeners.input();assert.equal(h.warned(),true);
});
test('publication locks review and staging fields and a failure preserves human review changes',{timeout:2000},async()=>{
 const h=harness();await h.inspect('A');h.node('#relationship-detail textarea');
 const form={id:'relationship-publish',querySelector:()=>h.node('publish-button'),elements:{reviewNotes:{value:'Exact human review'},attested:{checked:true}}};
 h.node('#relationship-detail').listeners.input();const p=h.node('#relationship-detail').listeners.submit({preventDefault(){},target:form});
 assert.equal(h.node('#relationship-detail textarea').disabled,true);assert.equal(h.node('#relationship-json').disabled,true);
 h.pending.get('/relationships/A/publish').reject(new Error('stale_relationship_target'));await p;
 assert.equal(h.node('#relationship-detail textarea').disabled,false);assert.equal(h.warned(),true);
});
test('publishing cannot silently discard another forms unsaved retirement reason',{timeout:2000},async()=>{
 const h=harness();await h.inspect('A');h.node('#relationship-retire').elements={reason:{value:'Unsaved other-form reason'}};
 const form={id:'relationship-publish',querySelector:()=>h.node('publish-button'),elements:{reviewNotes:{value:'Exact human review'},attested:{checked:true}}};
 const p=h.node('#relationship-detail').listeners.submit({preventDefault(){},target:form});assert.equal(h.pending.has('/relationships/A/publish'),false);await p;
});
test('late inspection success and failure cannot overwrite a newer selected packet',{timeout:2000},async()=>{
 const h=harness();const a=vm.runInContext("inspect('A')",h.context),b=vm.runInContext("inspect('B')",h.context);h.pending.get('/relationships/B').resolve(h.packet('B'));await b;h.pending.get('/relationships/A').resolve(h.packet('A'));await a;
 assert.match(h.node('#relationship-detail').innerHTML,/Inspect B/);
 const c=vm.runInContext("inspect('C')",h.context),d=vm.runInContext("inspect('D')",h.context);h.pending.get('/relationships/D').resolve(h.packet('D'));await d;h.pending.get('/relationships/C').reject(new Error('late failure'));await c;assert.match(h.node('#relationship-detail').innerHTML,/Inspect D/);
});
