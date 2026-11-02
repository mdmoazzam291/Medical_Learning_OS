import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {publicFiles} from '../scripts/public-surface.js';
import {buildPages} from '../scripts/build-pages.js';

test('install manifest has stable same-origin root identity and launch, independent of auth/deep links',async()=>{
 const m=JSON.parse(await readFile(new URL('../web/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(m.name,'Medretica');assert.equal(m.short_name,'Medretica');assert.equal(m.id,'/');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');assert.equal(m.prefer_related_applications,false);assert.equal(m.orientation,undefined);
 assert.equal(m.icons.length,2);
 for(const size of [192,512]){
  const icon=m.icons.find(x=>x.sizes===`${size}x${size}`);assert.ok(icon);assert.equal(icon.type,'image/png');assert.equal(icon.purpose,'any');assert.ok(publicFiles.includes(icon.src.slice(1)));
  const bytes=await readFile(new URL('..'+icon.src,import.meta.url));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 }
});
test('every served HTML entry discovers the same manifest and standalone metadata',async()=>{
 for(const path of publicFiles.filter(x=>x.endsWith('.html'))){
  const html=(await readFile(new URL('../'+path,import.meta.url),'utf8')).split('</head>')[0];assert.match(html,/<link rel="manifest" href="\/web\/manifest.webmanifest">/,path);assert.match(html,/<meta name="apple-mobile-web-app-capable" content="yes">/,path);
 }
});
test('built public bundle includes manifest and exact icons with explicit safe manifest MIME',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mlos-pwa-'));
 try{
  await buildPages({outputDirectory:dir});const root=await readFile(join(dir,'index.html'),'utf8');assert.match(root,/rel="manifest"/);
  assert.deepEqual(await readFile(join(dir,'web/manifest.webmanifest')),await readFile(new URL('../web/manifest.webmanifest',import.meta.url)));
  for(const size of [192,512])assert.deepEqual(await readFile(join(dir,`web/app-icon-${size}.png`)),await readFile(new URL(`../web/app-icon-${size}.png`,import.meta.url)));
  assert.match(await readFile(join(dir,'_headers'),'utf8'),/\/web\/manifest\.webmanifest\n\s+Content-Type: application\/manifest\+json/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('actual local static server serves manifest MIME and icons through the reviewed allowlist',{timeout:10000},async()=>{
 const child=spawn(process.execPath,['scripts/serve.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',()=>{});
 try{
  const deadline=Date.now()+5000;while(!/http:\/\/127\.0\.0\.1:\d+/.test(output)&&Date.now()<deadline){assert.equal(child.exitCode,null);await new Promise(r=>setTimeout(r,20));}
  const origin=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];assert.ok(origin,'static server must start');
  const r=await fetch(origin+'/web/manifest.webmanifest');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^application\/manifest\+json/);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).start_url,'/');
  for(const size of [192,512]){const icon=await fetch(origin+`/web/app-icon-${size}.png`);assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/^image\/png/);await icon.arrayBuffer();}
  assert.equal((await fetch(origin+'/package.json')).status,404);
 }finally{
  const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),2000);try{await exited;}finally{clearTimeout(timer);}
 }
});
