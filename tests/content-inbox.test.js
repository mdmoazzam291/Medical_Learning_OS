import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const module=await import('../scripts/stage-content-inbox.js').catch(()=>({}));
test('inbox validates every file before any staging and keeps SQL text literal',async()=>{
 assert.equal(typeof module.prepareInbox,'function');const dir=await mkdtemp(join(tmpdir(),'inbox-test-'));try{
 const manifest={schemaVersion:1,importId:'test',concepts:[],sources:[],questions:[],notes:[{noteId:'n',conceptId:'c',title:"O'Brien",bodyMarkdown:"'); drop table study_catalog; --",sourceIds:['s'],provenance:{kind:'ai_generated_original',evidence:'Synthetic'}}],noteQuestionLinks:[{noteId:'n',questionId:'q',relation:'explains',section:''}]};
 await writeFile(join(dir,'test.json'),JSON.stringify(manifest));const result=await module.prepareInbox(dir);assert.equal(result.count,1);assert.match(result.sql,/O''Brien/);assert.match(result.sql,/begin;/i);assert.match(result.sql,/commit;/i);assert.equal(result.sql.includes('review_publish'),false);
 await writeFile(join(dir,'bad.json'),'{}');await assert.rejects(()=>module.prepareInbox(dir));
 }finally{await rm(dir,{recursive:true,force:true});}
});
