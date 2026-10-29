import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from './build-pages.js';
import {publicFileSet} from './public-surface.js';
import {coveragePage,parseCoverageFilters} from '../src/domain/content-coverage.js';
import {alignSyllabusReviewPacket} from '../src/domain/syllabus-review-preflight.js';
import registry from '../data/preparation-curriculum.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const output=await mkdtemp(join(tmpdir(),'mlos-coverage-'));await buildPages({outputDirectory:output});
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname.slice(1);if(!publicFileSet.has(p)){res.writeHead(404);return res.end();}try{res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(join(output,p)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const classification={subjects:['medicine'],systems:['nervous'],organs:[],domains:[],tasks:[]};
const snapshot={snapshotId:'11111111-1111-4111-8111-111111111111',asOf:'2026-10-29T00:00:00Z',expiresAt:'2026-10-29T00:05:00Z',catalogVersion:446,registryVersion:'foundation@1',concepts:[{conceptId:'a',label:'Alpha synthetic',aliases:[],classification},{conceptId:'empty',label:'Empty synthetic <script>window.injected=true</script>',aliases:[],classification}],questions:[{questionId:'one',questionVersionId:'one@1',version:1,status:'published',conceptLinks:[{conceptId:'a',role:'primary'}],classification,origins:[]}],notes:[],candidates:[]};
const user={id:snapshot.snapshotId,email:'fixture@example.invalid'};
let browser;const errors=[];
try{
 browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
 for(const [name,width,height] of [['phone',390,844],['tablet',820,1180],['desktop',1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}});await context.addInitScript(user=>localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user})),user);
  let failure=0,slow=false,reads=0,failSave=false,failRead=false,conflict=false,denySave=false;const writes=[],requestIds=[],versions=[],receipts=new Map(),acceptRequests=[];let accepted=null;
  const proposal='22222222-2222-4222-8222-222222222222',conceptId='C-33333333-3333-4333-8333-333333333333';

  const syllabusId='44444444-4444-4444-8444-444444444444',syllabusVersions=[],syllabusReceipts=new Map(),syllabusRequests=[];let syllabusFailSave=true;

  await context.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(req.method()!=='GET')writes.push(path);
   if(path.endsWith('/auth/v1/user'))return reply(user);
   if(path.endsWith('/review-api/me'))return reply({isAdmin:true,reviewKinds:['medical','references','rights']});
   if(path.endsWith('/review-api/transfer-pairs'))return reply({pairs:[]});
   if(path.endsWith('/owner-api/dashboard'))return reply({contractId:'owner-admin-dashboard-v1',owner:{singleton:true,email:user.email},generatedAt:snapshot.asOf,users:{total:0,recent:[]},learning:{},content:{concepts:2,questions:1,sources:0},learnerAdministration:{auditEvents:0},reviewAuthority:{temporary:true,grants:[]},ai:{telemetryAvailable:false},infrastructure:{database:'healthy',cloudflare:{status:'healthy'}}});
   if(path.endsWith('/owner-api/concept-draft-accept')){
    const input=req.postDataJSON();acceptRequests.push(input.requestId);
    if(!accepted)accepted={status:'concept_accepted',proposalId:input.proposalId,revision:input.revision,draftDigest:input.digest,conceptId,identityDigest:'b'.repeat(64),catalogVersionAtAcceptance:446,learnerPublished:false};
    return reply(accepted);
   }
   if(path.endsWith('/owner-api/concept-drafts')){
    if(req.method()==='GET')return reply({contractId:'admin-concept-drafts-v1',concepts:[{conceptId:'existing',label:'Existing synthetic',aliases:[],classification,digest:'a'.repeat(64)}],drafts:versions.length?[{proposalId:proposal,conceptId,revision:versions.length,label:versions.at(-1).document.label}]:[],offset:0,nextOffset:null});
    const input=req.postDataJSON();requestIds.push(input.requestId);if(denySave)return reply({error:'synthetic_access_denial'},403);if(conflict)return reply({error:'concept_draft_stale'},409);
    if(!receipts.has(input.requestId)){const version={proposalId:proposal,conceptId,revision:versions.length+1,digest:String(versions.length+1).padStart(64,'0'),baseDigest:null,operation:'create',document:input.document,recordedAt:snapshot.asOf};versions.push(version);receipts.set(input.requestId,{proposalId:proposal,conceptId,revision:version.revision,digest:version.digest});}
    if(failSave)return reply({error:'synthetic_uncertain_save'},503);return reply(receipts.get(input.requestId));
   }
   if(path.includes('/owner-api/concept-drafts/')){if(failRead)return reply({error:'synthetic_readback_failure'},Number(failRead)||503);const revision=Number(url.searchParams.get('revision')||versions.length);return reply({contractId:'admin-concept-drafts-v1',version:versions[revision-1],isLatest:revision===versions.length,history:versions.map(v=>({revision:v.revision,digest:v.digest,recordedAt:v.recordedAt})).reverse(),historyTruncated:false,acceptance:accepted?{status:'concept_accepted',revision:accepted.revision,identityDigest:accepted.identityDigest,catalogVersionAtAcceptance:446,learnerPublished:false}:null});}
   if(path.includes('/owner-api/syllabus-review-preflight/')){
     const v=syllabusVersions.at(-1);
     if(!v)return reply({error:'no_draft'},404);
     return reply(alignSyllabusReviewPacket({contractId:'admin-syllabus-review-preflight-v1',baselineId:syllabusId,
      revision:v.revision,digest:v.digest,
      authoredCatalogVersion:v.catalogVersion,currentCatalogVersion:v.catalogVersion,
      registryVersion:'pg-preparation:foundation@1',pathwayVersionId:v.document.pathwayVersionId,
      scopeDeclaration:v.document.scopeDeclaration,sourceKind:v.document.sourceKind,
      sourceLocator:v.document.sourceLocator,sourceVersion:v.document.sourceVersion,
      isLatest:true,members:v.document.conceptIds.map(conceptId=>({conceptId,label:'Synthetic canonical concept',kind:'canonical',identityDigest:null,bindingMatches:true}))},registry));
   }
   if(path.endsWith('/owner-api/syllabus-baseline-drafts')){
     if(req.method()==='GET')return reply({contractId:'admin-syllabus-baseline-drafts-v1',status:'draft-only',
       baselines:syllabusVersions.length?[{baselineId:syllabusId,label:syllabusVersions.at(-1).document.label,
        pathwayVersionId:'neet-pg:preparation@1',revision:syllabusVersions.length,conceptCount:syllabusVersions.at(-1).document.conceptIds.length}]:[],
       offset:0,nextOffset:null,total:syllabusVersions.length?1:0});
     const input=req.postDataJSON();syllabusRequests.push(input.requestId);
     if(!syllabusReceipts.has(input.requestId)){
       const v={baselineId:syllabusId,revision:syllabusVersions.length+1,
         digest:String(syllabusVersions.length+1).padStart(64,'b'),catalogVersion:446,
         registryVersion:'pg-preparation:foundation@1',document:input.document,recordedAt:snapshot.asOf};
       syllabusVersions.push(v);syllabusReceipts.set(input.requestId,{baselineId:syllabusId,revision:v.revision,digest:v.digest,
        catalogVersion:446,registryVersion:v.registryVersion,status:'draft'});
     }
     if(syllabusFailSave)return reply({error:'synthetic_unconfirmed'},503);
     return reply(syllabusReceipts.get(input.requestId));
   }
   if(path.includes('/owner-api/syllabus-baseline-drafts/')){
     const revision=Number(url.searchParams.get('revision')||syllabusVersions.length);
     return reply({contractId:'admin-syllabus-baseline-drafts-v1',status:'draft',
      version:syllabusVersions[revision-1],isLatest:revision===syllabusVersions.length,
      history:syllabusVersions.map(v=>({revision:v.revision,digest:v.digest,recordedAt:v.recordedAt})).reverse()});
   }
   if(path.endsWith('/owner-api/content-coverage')){reads++;if(failure)return reply({error:'synthetic_failure'},failure);if(slow&&url.searchParams.get('search')==='Alpha')await new Promise(resolve=>setTimeout(resolve,400));return reply(coveragePage(snapshot,parseCoverageFilters(url.searchParams)));}
   if(path.includes('/owner-api/'))return reply({flags:[],alerts:[]});
   return reply({});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let dialogs=0;page.on('dialog',async d=>{dialogs++;await d.dismiss();});
  await page.goto(origin+'/web/admin.html#owner-coverage');const root=page.locator('#owner-concept-editor');await root.getByText('Drafts loaded. Saved drafts do not change accepted coverage.',{exact:true}).waitFor();
  await root.getByLabel('Canonical target',{exact:true}).selectOption('existing');assert.equal(await root.getByLabel('Concept name',{exact:true}).inputValue(),'Existing synthetic');assert.equal(dialogs,0);
  await root.getByRole('button',{name:'New proposal',exact:true}).click();
  await root.getByLabel('Concept name',{exact:true}).fill('Synthetic <img src=x onerror="window.injected=true">');await root.getByLabel('Source evidence or locator',{exact:true}).fill('Synthetic locator only; review pending');await root.getByLabel('Reason for this revision',{exact:true}).fill('Add missing concept without a question');
  failSave=true;await root.getByRole('button',{name:'Save concept draft',exact:true}).click();await root.locator('[data-concept-status]').filter({hasText:'Save not confirmed'}).waitFor();assert.equal(versions.length,1);assert.match(await root.getByLabel('Concept name',{exact:true}).inputValue(),/Synthetic/);
  await root.getByLabel('Concept name',{exact:true}).fill('Newer local label');failSave=false;failRead=403;await root.getByRole('button',{name:'Retry pending save',exact:true}).click();await root.locator('[data-concept-status]').filter({hasText:'Save not confirmed'}).waitFor();assert.equal(versions.length,1);assert.equal(await root.getByLabel('Concept name',{exact:true}).inputValue(),'Newer local label');
  assert.equal(await root.getByRole('button',{name:'Retry pending save',exact:true}).count(),1,'readback403 must retain the committed request identity');
  await root.getByLabel('Concept name',{exact:true}).fill('');denySave=true;const callsBeforeDenied=requestIds.length;await root.getByRole('button',{name:'Retry pending save',exact:true}).click();
  for(let tries=0;tries<100&&requestIds.length===callsBeforeDenied;tries++)await page.waitForTimeout(20);
  assert.equal(requestIds.length,callsBeforeDenied+1,'pending retry must bypass validation of incomplete newer input');await root.locator('[data-concept-status]').filter({hasText:'Save not confirmed'}).waitFor();assert.equal(await root.getByRole('button',{name:'Retry pending save',exact:true}).count(),1,'a denied retry cannot erase an earlier uncertain write');denySave=false;
  failRead=404;await root.getByRole('button',{name:'Retry pending save',exact:true}).click();await root.locator('[data-concept-status]').filter({hasText:'Save not confirmed'}).waitFor();assert.equal(await root.getByRole('button',{name:'Retry pending save',exact:true}).count(),1,'readback404 must retain the committed request');
  failRead=false;await root.getByRole('button',{name:'Retry pending save',exact:true}).click();await root.getByText('Prior revision confirmed. Your newer changes remain unsaved.',{exact:true}).waitFor();assert.equal(new Set(requestIds).size,1);assert.equal(await root.getByLabel('Concept name',{exact:true}).inputValue(),'');const confirmedCalls=requestIds.length;await root.getByRole('button',{name:'Save concept draft',exact:true}).click();await page.waitForTimeout(50);assert.equal(requestIds.length,confirmedCalls,'new incomplete saves still require native validation');await root.getByLabel('Concept name',{exact:true}).fill('Newer local label');
  await root.getByRole('button',{name:'Save concept draft',exact:true}).click();await root.getByText('Saved and confirmed revision 2. Accepted coverage is unchanged.',{exact:true}).waitFor();assert.equal(versions.length,2);assert.equal(await root.locator('img').count(),0);assert.equal(await page.evaluate(()=>window.injected===true),false);
  await root.getByRole('button',{name:'Revision 1',exact:true}).click();await root.getByText('Historical revision: read-only. Open the latest revision to continue editing.',{exact:true}).waitFor();assert.equal(await root.getByRole('button',{name:'Save concept draft',exact:true}).isDisabled(),true);
  await root.getByRole('button',{name:'Open latest revision',exact:true}).click();await root.getByText('Loaded saved revision 2.',{exact:true}).waitFor();await root.getByLabel('Concept name',{exact:true}).fill('Conflict-preserved input');conflict=true;await root.getByRole('button',{name:'Save concept draft',exact:true}).click();await root.locator('[data-concept-status]').filter({hasText:'Conflict:'}).waitFor();assert.equal(await root.getByLabel('Concept name',{exact:true}).inputValue(),'Conflict-preserved input');assert.equal(versions.length,2);
  await page.locator('#owner-coverage-body').getByLabel('Concept name or ID',{exact:true}).fill('empty');await page.locator('#owner-coverage-body').getByRole('button',{name:'Apply filters',exact:true}).click();await page.locator('#owner-coverage-body').getByRole('heading',{name:/Empty synthetic/}).waitFor();assert.equal(await root.getByLabel('Concept name',{exact:true}).inputValue(),'Conflict-preserved input');
  page.removeAllListeners('dialog');page.once('dialog',async d=>d.accept());await root.getByRole('button',{name:'New proposal',exact:true}).click();versions.length=0;receipts.clear();requestIds.length=0;conflict=false;failSave=false;failRead=403;
  await root.getByLabel('Concept name',{exact:true}).fill('Direct successful write with denied readback');await root.getByLabel('Source evidence or locator',{exact:true}).fill('Synthetic locator');await root.getByLabel('Reason for this revision',{exact:true}).fill('Direct write retry regression');
  await root.getByRole('button',{name:'Save concept draft',exact:true}).click();await root.locator('[data-concept-status]').filter({hasText:'Save not confirmed'}).waitFor();assert.equal(await root.getByRole('button',{name:'Retry pending save',exact:true}).count(),1);assert.equal(versions.length,1);
  failRead=false;await root.getByRole('button',{name:'Retry pending save',exact:true}).click();await root.getByText('Saved and confirmed revision 1. Accepted coverage is unchanged.',{exact:true}).waitFor();assert.equal(new Set(requestIds).size,1);assert.equal(versions.length,1);
  // Explicit human review cannot silently publish; ambiguous POST/readback must preserve retry identity.
  await root.getByText('Accept reviewed identity into private registry',{exact:true}).click();
  await root.locator('[data-concept-accept-form] textarea[name="reviewNotes"]').fill('Owner reviewed this synthetic identity and classification with source context.');
  await root.locator('[data-concept-accept-form] input[name="attested"]').check();
  failRead=403;
  await root.getByRole('button',{name:'Accept concept identity (not publish)',exact:true}).click();
  await root.locator('[data-concept-status]').filter({hasText:'Acceptance not confirmed'}).waitFor();
  assert.equal(acceptRequests.length,1);
  failRead=false;
  await root.getByText('Accept reviewed identity into private registry',{exact:true}).click();
  await root.getByRole('button',{name:'Accept concept identity (not publish)',exact:true}).click();
  await root.locator('[data-concept-status]').filter({hasText:'Identity accepted into the private Admin registry'}).waitFor();
  assert.equal(acceptRequests.length,2);assert.equal(new Set(acceptRequests).size,1);
  assert.equal(await root.getByRole('button',{name:'Save concept draft',exact:true}).isDisabled(),true);
  assert.match(await root.textContent(),/This does not approve medical claims, rights, questions or learner release/);
  // Independent private syllabus draft editor must survive an uncertain write and retry exactly once.
  const syllabus=page.locator('#owner-syllabus-baselines');
  await syllabus.getByText('Draft list loaded. No active syllabus baseline.',{exact:true}).waitFor();
  await syllabus.locator('input[name="label"]').fill('Synthetic proposed partial scope');
  await syllabus.locator('textarea[name="sourceLocator"]').fill('Synthetic source, chapter 1');
  await syllabus.locator('input[name="sourceVersion"]').fill('fixture@1');
  await syllabus.locator('textarea[name="conceptIds"]').fill('existing');
  await syllabus.locator('textarea[name="changeReason"]').fill('Review synthetic scope identity');
  await syllabus.getByRole('button',{name:'Save checklist draft',exact:true}).click();
  await syllabus.locator('[data-syllabus-status]').filter({hasText:'Draft save not confirmed'}).waitFor();
  assert.equal(syllabusVersions.length,1);
  syllabusFailSave=false;
  await syllabus.getByRole('button',{name:'Retry pending draft save',exact:true}).click();
  await syllabus.locator('[data-syllabus-status]').filter({hasText:'Saved immutable checklist draft revision 1'}).waitFor();
  assert.equal(new Set(syllabusRequests).size,1,'uncertain syllabus save must reuse request ID');
  await syllabus.getByRole('button',{name:'Check scope and objective alignment',exact:true}).click();
  await syllabus.locator('[data-syllabus-status]').filter({hasText:/Preflight is a private review packet|Review preflight unavailable/}).waitFor({timeout:10000});
  const observed=await syllabus.locator('[data-syllabus-status]').textContent();
  assert.match(observed,/Preflight is a private review packet/, 'Preflight status was: '+observed);
  await syllabus.locator('[data-syllabus-review-packet]').getByText('Review required. This is not an accepted or official syllabus.',{exact:true}).waitFor();
  assert.match(await syllabus.locator('[data-syllabus-review-packet]').textContent(),/Exact reviewed curriculum-mapped concepts: 0/);
  assert.match(await syllabus.locator('[data-syllabus-review-packet]').textContent(),/Independent source review/);
  assert.match(await syllabus.textContent(),/No medical review, objective mapping/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.ok(writes.every(x=>x.endsWith('/concept-drafts')||x.endsWith('/concept-draft-accept')||x.endsWith('/syllabus-baseline-drafts')));
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'concept-drafts-'+name+'-'+(process.env.BROWSER_ENGINE||'chromium')+'.png'),fullPage:true});}
  console.log('Concept draft browser passed:',name,process.env.BROWSER_ENGINE||'chromium');await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(output,{recursive:true,force:true});}
