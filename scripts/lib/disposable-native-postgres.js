// Test tooling only: creates its own private local server, never connects to a supplied URL.
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,cp,chown,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function run(binary,args,options){
 return new Promise((resolve,reject)=>{
  const child=spawn(binary,args,options);let output='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output=(output+b).slice(-4000);});
  child.once('error',reject);child.once('close',code=>code===0?resolve(output):reject(new Error('native_command_failed: '+output)));
 });
}
export async function startDisposableNativePostgres({postgres}){
 const root=await mkdtemp(join(tmpdir(),'mlos-native-pg-')),native=join(root,'native'),data=join(root,'data'),socket=join(root,'socket');
 const identity=process.getuid?.()===0?{uid:65534,gid:65534}:{};
 let server,closing;const stopped=()=>!server||server.exitCode!==null||server.signalCode!==null;
 async function cleanup(){
  if(server&&!stopped()){
   server.kill('SIGTERM');const deadline=Date.now()+5000;while(!stopped()&&Date.now()<deadline)await pause(25);
   if(!stopped()){server.kill('SIGKILL');while(!stopped())await pause(25);}
  }
  await rm(root,{recursive:true,force:true});
 }
 try{
  await cp(dirname(dirname(postgres)),native,{recursive:true,verbatimSymlinks:true});
  await mkdir(socket,{mode:0o700});
  if(identity.uid!==undefined){
   try{await chown(root,identity.uid,identity.gid);await chown(socket,identity.uid,identity.gid);}
   catch(error){if(['EINVAL','EPERM'].includes(error.code))throw new Error('native_postgres_requires_non_root_runner');throw error;}
  }
  const options={cwd:root,...identity,env:{PATH:process.env.PATH,LANG:'C',LC_ALL:'C',LD_LIBRARY_PATH:join(native,'lib')},stdio:['ignore','pipe','pipe']};
  await run(join(native,'bin','initdb'),['-D',data,'-A','trust','-U','postgres','--no-locale','--encoding=UTF8'],options);
  server=spawn(join(native,'bin','postgres'),['-D',data,'-k',socket,'-p','55432','-c','listen_addresses=','-c','log_min_messages=warning'],options);
  server.on('error',()=>{});
  let log='';for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{log=(log+b).slice(-4000);});
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
   if(stopped())throw new Error('native_server_failed: '+log);
   try{await access(join(socket,'.s.PGSQL.55432'));break;}catch{await pause(25);}
  }
  await access(join(socket,'.s.PGSQL.55432'));
  return {root,config:{host:socket,port:55432,user:'postgres',database:'postgres',connectionTimeoutMillis:5000},stop(){if(!closing)closing=cleanup();return closing;}};
 }catch(error){await cleanup();throw error;}
}
