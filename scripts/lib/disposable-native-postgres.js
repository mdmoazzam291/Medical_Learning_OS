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
 let server,options,closing,restarting;
 const stopped=child=>!child||child.exitCode!==null||child.signalCode!==null;
 async function waitStopped(child){
  const deadline=Date.now()+10000;while(!stopped(child)&&Date.now()<deadline)await pause(25);
  if(!stopped(child))throw new Error('native_server_stop_timeout');
 }
 async function launch(){
  const child=spawn(join(native,'bin','postgres'),['-D',data,'-k',socket,'-p','55432','-c','listen_addresses=','-c','log_min_messages=log'],options);
  server=child;let log='',spawnError;child.on('error',e=>{spawnError=e;});
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{log=(log+b).slice(-12000);});
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
   if(spawnError||stopped(child))throw new Error('native_server_failed: '+(spawnError?.message||log));
   if(log.includes('database system is ready to accept connections')){
    await access(join(socket,'.s.PGSQL.55432'));return log;
   }
   await pause(25);
  }
  throw new Error('native_server_ready_timeout: '+log);
 }
 async function stopServer(mode){
  if(stopped(server))return;
  await run(join(native,'bin','pg_ctl'),['-D',data,'-m',mode,'-w','-t','10','stop'],options);
  await waitStopped(server);
 }
 async function cleanup(){
  if(!stopped(server)){
   try{await stopServer('fast');}catch{await stopServer('immediate');}
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
  options={cwd:root,...identity,env:{PATH:process.env.PATH,LANG:'C',LC_ALL:'C',LD_LIBRARY_PATH:join(native,'lib')},stdio:['ignore','pipe','pipe']};
  await run(join(native,'bin','initdb'),['-D',data,'-A','trust','-U','postgres','--no-locale','--encoding=UTF8'],options);
  await launch();
  return {
   root,config:{host:socket,port:55432,user:'postgres',database:'postgres',connectionTimeoutMillis:5000},
   crashAndRestart(){
    if(closing)throw new Error('native_server_closing');
    if(!restarting)restarting=(async()=>{
     const previousPid=server.pid;await stopServer('immediate');const recoveryLog=await launch();
     return {mode:'immediate',previousPid,newPid:server.pid,recoveryLog};
    })().finally(()=>{restarting=null;});
    return restarting;
   },
   stop(){if(!closing)closing=(async()=>{if(restarting)await restarting.catch(()=>{});await cleanup();})();return closing;}
  };
 }catch(error){await cleanup();throw error;}
}
