import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=(await readFile(new URL('../web/content-import.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
function harness(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',addEventListener(){}});return nodes.get(id);};
 const pending=new Map();let allow=false;
 const context=vm.createContext({document:{querySelector:node},window:{confirm:()=>allow,addEventListener(){}},e:String,validateImport:x=>x,request:path=>path==='/imports'?Promise.resolve({imports:[]}):new Promise((resolve,reject)=>pending.set(path,{resolve,reject}))});
 vm.runInContext(code,context);
 const draft=id=>({import_id:id,status:'draft',manifest:{questions:[],notes:[]},sources:[],duplicateTargets:[]});
 return {context,pending,node,draft,inspect:id=>vm.runInContext(`inspect('${id}')`,context),dirty:()=>vm.runInContext('reviewDirty=true',context),allow:()=>{allow=true;}};
}
test('late draft success cannot replace the newer selected draft',async()=>{const h=harness(),a=h.inspect('A'),b=h.inspect('B');h.pending.get('/imports/B').resolve(h.draft('B'));await b;h.pending.get('/imports/A').resolve(h.draft('A'));await a;assert.match(h.node('#import-detail').innerHTML,/<h2>B<\/h2>/);assert.equal(vm.runInContext('selected.import_id',h.context),'B');});
test('late draft failure cannot replace newer draft detail',async()=>{const h=harness(),a=h.inspect('A'),b=h.inspect('B');h.pending.get('/imports/B').resolve(h.draft('B'));await b;h.pending.get('/imports/A').reject(new Error('A failed'));await a;assert.notEqual(h.node('#import-detail').textContent,'A failed');});
test('cancelled draft switch preserves edited review and selection',async()=>{const h=harness(),a=h.inspect('A');h.pending.get('/imports/A').resolve(h.draft('A'));await a;h.dirty();await h.inspect('B');assert.equal(h.pending.has('/imports/B'),false);assert.equal(vm.runInContext('selected.import_id',h.context),'A');h.allow();const b=h.inspect('B');h.pending.get('/imports/B').resolve(h.draft('B'));await b;assert.equal(vm.runInContext('selected.import_id',h.context),'B');});
