import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceFrame } from '../web/content-workspace-view.js';
const classification={subjects:[],systems:[],organs:[],domains:[],tasks:[]};
test('a heavily linked concept does not render every exact version inside its context inspector',()=>{
 const library={concepts:[{conceptId:'a',label:'Synthetic',aliases:[],classification}],notes:[],sources:[],links:[],questions:Array.from({length:1000},(_,i)=>({questionId:'q'+i,questionVersionId:'q'+i+'@2',stem:'Synthetic prompt',options:[],sourceIds:[],classification,conceptLinks:[{conceptId:'a',role:'primary'}],home:{kind:'original',exams:[],platforms:[]},observed:{attempts:0,wrong:0}}))};
 const html=workspaceFrame({library,view:'overview',filters:{concept:'a'},options:{}},'',{search:'?concept=a'});
 const context=html.match(/<aside id="cw-context"[\s\S]*?<\/aside>/)?.[0]||'';
 assert.ok((context.match(/<li>/g)||[]).length<=100,'Inspector must bound initial version rows independently of the main reader.');
 assert.match(context,/1000/,'The complete artifact count must remain visible.');
 assert.match(context,/Show more/i,'The learner must be able to inspect the remaining versions.');
});
