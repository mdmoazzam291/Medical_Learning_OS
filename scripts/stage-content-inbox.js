import {readdir,readFile,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateImport} from '../src/domain/content-library.js';
export async function prepareInbox(directory) {
  const names=(await readdir(directory)).filter(n=>n.endsWith('.json')).sort();
  const statements=[];
  for(const name of names){
    const path=join(directory,name),info=await lstat(path);
    if(!info.isFile()||info.isSymbolicLink()||info.size>1048576)throw new Error('Invalid inbox file: '+name);
    const raw=await readFile(path,'utf8');
    const manifest=validateImport(JSON.parse(raw));
    if(name!==manifest.importId+'.json')throw new Error('Filename must match importId: '+name);
    const literal=JSON.stringify(manifest).replace(/'/g,"''");
    statements.push("select public.content_library_stage_v1('"+literal+"'::jsonb,null);");
  }
  return {count:names.length,sql:"begin;\nset local standard_conforming_strings=on;\n"+statements.join('\n')+'\ncommit;\n'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const prepared=await prepareInbox(resolve('content/inbox'));
    if(process.argv.includes('--stage')&&prepared.count){
      if(!/^postgres(?:ql)?:\/\//.test(process.env.SUPABASE_DB_URL||''))throw new Error('Repository database connection is missing.');
      const result=spawnSync('psql',['--no-psqlrc','--set','ON_ERROR_STOP=1','--quiet'],{input:prepared.sql,encoding:'utf8',env:{...process.env,PGDATABASE:process.env.SUPABASE_DB_URL},stdio:['pipe','pipe','pipe']});
      // Database errors can contain upload text or connection details. Never log them.
      if(result.error||result.status!==0)throw new Error('Inbox staging failed. Existing publications were unchanged; inspect the admin inbox and manifest.');
    }
    console.log(prepared.count+' inbox manifests '+(process.argv.includes('--stage')?'staged idempotently':'validated')+'. No publication performed.');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
