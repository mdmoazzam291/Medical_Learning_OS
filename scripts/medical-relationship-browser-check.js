import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from './build-pages.js';
import {publicFileSet} from './public-surface.js';
import {projectLibrary} from '../src/domain/content-library.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const output=await mkdtemp(join(tmpdir(),'mlos-relationship-'));await buildPages({outputDirectory:output});
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname.slice(1);if(!publicFileSet.has(p)){res.writeHead(404);return res.end();}try{res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(join(output,p)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const digest='a'.repeat(64),secondDigest='b'.repeat(64),fingerprint='c'.repeat(64),bindings={fromHash:'d'.repeat(64),toHash:'e'.repeat(64),sourceFingerprintSha256:fingerprint};
const assertion={relationshipId:'synthetic',version:1,fromConceptId:'alpha',toConceptId:'beta',relationType:'mechanism-of',claimText:'Synthetic assertion <img src=x onerror="window.injected=true">',sourceId:'s',sourceVersion:'edition-1',evidenceVersionId:'synthetic-evidence@1',evidenceLocator:'Synthetic section A',previousVersionId:null,previousDigest:null,provenance:{kind:'external',authorLabel:'External synthetic author',evidence:'Synthetic source packet'}};
const catalog={concepts:[{conceptId:'alpha',label:'Synthetic Alpha'},{conceptId:'beta',label:'Synthetic Beta'}],sources:[{sourceId:'s',title:'Synthetic source',version:'edition-1',rights:{status:'licensed'},fingerprintSha256:fingerprint}],questions:[]};
let browser;const errors=[];
try{
 browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
 for(const [name,width,height] of [['phone',390,844],['tablet',820,1180],['desktop',1600,1000]]){
  console.log('Relationship viewport:',name);const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(()=>localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}})));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let saved=null,status='draft',events=[],failPublish=false,failStage=false,stageWrites=0,publishWrites=0,rightsReady=true,reviewKinds=['medical','references','rights'],stageGate=null,publishGate=null;
  const packet=()=>({reviewKinds,version:{relationshipVersionId:'synthetic@'+saved.version,digest:saved.version===1?digest:secondDigest,assertion:saved,bindings},isLatest:true,currentBindings:bindings,rightsReady,source:catalog.sources[0],concepts:catalog.concepts,events});
  const queue=()=>({reviewKinds,versions:saved?[{relationshipVersionId:'synthetic@'+saved.version,status}]:[]});
  await context.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,body=req.postDataJSON();const reply=(data,code=200)=>route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(data)});
   if(path.endsWith('/review-api/me'))return reply({isAdmin:true,reviewKinds});
   if(path.endsWith('/content-library-api/imports'))return reply({imports:[]});
   if(path.endsWith('/content-library-api/relationships')){
    if(req.method()==='GET')return reply(queue());stageWrites++;if(stageGate)await stageGate;if(failStage)return reply({error:'stale_relationship_predecessor'},409);saved=body.assertion;status='draft';events=[];return reply({relationshipVersionId:'synthetic@'+saved.version,digest:saved.version===1?digest:secondDigest,status});
   }
   if(/\/relationships\/synthetic@\d+$/.test(decodeURIComponent(path)))return reply(packet());
   if(path.endsWith('/publish')){publishWrites++;if(publishGate)await publishGate;assert.deepEqual(body,{digest:saved.version===1?digest:secondDigest,reviewNotes:'Inspected synthetic source only.',attested:true});if(failPublish)return reply({error:'stale_relationship_target'},409);status='published';events=[{action:'published',notes:'PRIVATE REVIEW NOTE'}];return reply({status});}
   if(path.endsWith('/retire')){assert.equal(body.digest,secondDigest);assert.equal(body.reason,'Synthetic correction.');status='retired';events.push({action:'retired',notes:body.reason});return reply({status});}
   if(path.endsWith('/content-library-api/library')){
    return reply(projectLibrary({catalog,medicalRelationships:saved?[{...saved,relationshipVersionId:'synthetic@'+saved.version,status,sourceFingerprintSha256:fingerprint,reviewedAt:'2026-10-23T09:00:00Z',medicalReviewVerified:true,referenceReviewVerified:true,rightsVerified:true}]:[]}));
   }
   throw new Error('Unexpected fixture route '+req.method()+' '+path);
  });
  await page.goto(origin+'/web/content-import.html#medical-relationships');
  await page.getByRole('heading',{name:'Medical relationships',exact:true}).waitFor({timeout:10000});
  await page.getByText('No relationship drafts or publications yet.',{exact:true}).waitFor();
  const input=page.getByLabel('Relationship assertion JSON',{exact:true});await input.fill(JSON.stringify(assertion));
  failStage=true;await page.getByRole('button',{name:'Stage relationship draft',exact:true}).click();await page.locator('#relationship-status').filter({hasText:'stale_relationship_predecessor'}).waitFor();assert.equal(await input.inputValue(),JSON.stringify(assertion));
  failStage=false;let releaseStage;stageGate=new Promise(resolve=>{releaseStage=resolve;});await page.getByRole('button',{name:'Stage relationship draft',exact:true}).click();assert.equal(await input.isDisabled(),true);releaseStage();stageGate=null;await page.getByRole('heading',{name:'Inspect synthetic@1',exact:true}).waitFor();assert.equal(stageWrites,2);assert.equal(publishWrites,0);
  assert.match(await page.locator('#relationship-detail').textContent(),/Synthetic Alpha/);assert.match(await page.locator('#relationship-detail').textContent(),/Synthetic section A/);assert.equal(await page.locator('#relationship-detail img').count(),0);assert.equal(await page.evaluate(()=>window.injected===true),false);
  await page.getByLabel('Relationship review notes',{exact:true}).fill('Inspected synthetic source only.');
  // Required human attestation prevents a submit, independent of server enforcement.
  await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).click();assert.equal(publishWrites,0);
  await page.getByLabel('I curated externally authored content and inspected this exact assertion, direction, source, evidence and reuse permission; I approve medical accuracy and references.').check();
  failPublish=true;let releasePublish;publishGate=new Promise(resolve=>{releasePublish=resolve;});await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).click();assert.equal(await input.isDisabled(),true);assert.equal(await page.getByLabel('Relationship review notes',{exact:true}).isDisabled(),true);releasePublish();publishGate=null;await page.locator('#relationship-status').filter({hasText:'stale_relationship_target'}).waitFor();assert.equal(await page.getByLabel('Relationship review notes',{exact:true}).inputValue(),'Inspected synthetic source only.');
  failPublish=false;await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).click();await page.getByText('Published exact relationship version.',{exact:true}).waitFor();assert.equal(publishWrites,2);
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.locator('#medical-relationships').scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'relationship-review-'+name+'.png')});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const learner=await context.newPage();await learner.goto(origin+'/web/library.html?view=graph&concept=alpha&perspective=medical');await learner.locator('.cw-graph-list li').first().waitFor();assert.match(await learner.locator('.cw-graph-list').textContent(),/synthetic-evidence@1/);assert.doesNotMatch(await learner.locator('#library-app').textContent(),/PRIVATE REVIEW NOTE|Synthetic section A/);
  await page.getByRole('button',{name:'Prepare relationship correction',exact:true}).click();const correction=JSON.parse(await input.inputValue());assert.equal(correction.version,2);assert.equal(correction.previousVersionId,'synthetic@1');assert.equal(correction.previousDigest,digest);
  await page.getByRole('button',{name:'Stage relationship draft',exact:true}).click();await page.getByRole('heading',{name:'Inspect synthetic@2',exact:true}).waitFor();await learner.reload();await learner.getByText('Select a published concept in Explore to inspect its connections.',{exact:true}).waitFor();assert.equal(await learner.locator('.cw-graph-list li').count(),0);assert.doesNotMatch(await learner.locator('#library-app').textContent(),/Synthetic assertion|Corrected synthetic assertion/);
  // Live gates can disable approval, never optimistic browser authority.
  rightsReady=false;await page.getByRole('button',{name:'Refresh relationship inspection',exact:true}).click();await page.getByText('Source rights are unresolved for this exact version.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).count(),0);
  rightsReady=true;reviewKinds=['medical'];await page.getByRole('button',{name:'Refresh relationship inspection',exact:true}).click();await page.getByText('Publication requires current Medical, References and Rights reviewer grants.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).count(),0);
  reviewKinds=['medical','references','rights'];await page.getByRole('button',{name:'Refresh relationship inspection',exact:true}).click();await page.getByLabel('Relationship review notes',{exact:true}).fill('Inspected synthetic source only.');await page.getByLabel('I curated externally authored content and inspected this exact assertion, direction, source, evidence and reuse permission; I approve medical accuracy and references.').check();
  // Switching/refreshing cannot silently discard the human's unsaved review.
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Refresh relationship inspection',exact:true}).click();assert.equal(await page.getByLabel('Relationship review notes',{exact:true}).inputValue(),'Inspected synthetic source only.');
  await page.getByRole('button',{name:'Publish reviewed relationship',exact:true}).click();await page.getByText('Published exact relationship version.',{exact:true}).waitFor();
  await page.getByLabel('Relationship retirement reason',{exact:true}).fill('Synthetic correction.');await page.getByRole('button',{name:'Retire relationship version',exact:true}).click();await page.getByText('Retired exact relationship version.',{exact:true}).waitFor();await learner.reload();await learner.getByText('Select a published concept in Explore to inspect its connections.',{exact:true}).waitFor();assert.equal(await learner.locator('.cw-graph-list li').count(),0);assert.doesNotMatch(await learner.locator('#library-app').textContent(),/Synthetic assertion|Corrected synthetic assertion/);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Relationship human review/graph/correction/retirement, fail-closed gates, error preservation, escaping and responsive flows passed. Synthetic fixtures only.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(output,{recursive:true,force:true});}
