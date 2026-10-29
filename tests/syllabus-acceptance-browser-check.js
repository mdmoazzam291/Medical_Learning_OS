import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from '../scripts/build-pages.js';
import {publicFileSet} from '../scripts/public-surface.js';

const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const preview='https://feat-admin-syllabus-baseline-drafts-202-medical-learning-os-web.medicalos.workers.dev';
const legacy='https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev';
const api='https://iyapppmeieqhflnzslao.supabase.co';
const tmp=await mkdtemp(join(tmpdir(),'mlos-syllabus-acceptance-'));
await buildPages({outputDirectory:tmp});
let browser;
let total=0;
try {
 browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
 for(const suite of ['syllabus','preflight']) for(const role of ['admin','learner','signed-out','legacy-origin']){
  const expectedOrigin=role==='legacy-origin'?legacy:suite==='preflight'?'https://feat-admin-syllabus-review-preflight-20-medical-learning-os-web.medicalos.workers.dev':preview;
  const token='synthetic-'+role+'-never-a-valid-token';
  const user={id:role==='learner'?'22222222-2222-4222-8222-222222222222':'11111111-1111-4111-8111-111111111111',email:'test@example.invalid'};
  const context=await browser.newContext({viewport:{width:390,height:844}});
  if(role==='admin'||role==='learner')await context.addInitScript(({user,token})=>{
   localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:token,
    refreshToken:token,expiresAt:4102444800,user}));
  },{user,token});
  let malformedPosts=0,ownerCalls=0,roleChecks=0;
  const errors=[],records=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===expectedOrigin){
    const path=decodeURIComponent(url.pathname.slice(1));
    if(!publicFileSet.has(path)){await route.fulfill({status:404,body:'not found'});return;}
    const content=await readFile(join(tmp,path));
    await route.fulfill({status:200,body:content,contentType:path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript'});
    return;
   }
   if(url.origin!==api){await route.abort();return;}
   const path=url.pathname,method=request.method();
   const auth=request.headers()['authorization'];
   records.push({path,method,signed:Boolean(auth)});
   const reply=(payload,status=200)=>route.fulfill({status,contentType:'application/json',
    headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':expectedOrigin,'Vary':'Origin'},
    body:JSON.stringify(payload)});
   if(path==='/functions/v1/review-api/me'){
    roleChecks++;
    assert.equal(method,'GET');
    assert.equal(auth,'Bearer '+token,'review role must use current synthetic session');
    return reply({isAdmin:role==='admin',reviewKinds:[]});
   }
   if(path==='/functions/v1/owner-api/syllabus-baseline-drafts'||path==='/functions/v1/owner-api/syllabus-review-preflight/00000000-0000-4000-8000-000000000000'){
    ownerCalls++;
    if(method==='POST'){
      assert.equal(request.postData(),'{}','never submit a valid syllabus proposal');
      malformedPosts++;
    }
    if(!auth)return reply({error:'unauthorized'},401);
    assert.equal(auth,'Bearer '+token,'owner check must use current synthetic session');
    if(role==='learner')return reply({error:'content_admin_required'},403);
    if(suite==='preflight')return reply({error:method==='POST'?'method_not_allowed':url.search==='?revision=0'?'syllabus_review_preflight_invalid':'syllabus_baseline_not_found'},method==='POST'?405:url.search==='?revision=0'?400:404);
    if(method==='POST')return reply({error:'syllabus_baseline_invalid'},400);
    return reply({contractId:'admin-syllabus-baseline-drafts-v1',status:'draft-only',baselines:[]});
   }
   await route.fulfill({status:404,body:'unexpected path'});
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(expectedOrigin+'/web/concept-http-check.html');
  await page.locator('#results').filter({hasText:role==='legacy-origin'?'Sign in using Account':'Sign in using Account'}).waitFor();
  if(role==='legacy-origin'){
   assert.equal(await page.locator('#'+suite+'-admin').isDisabled(),true);
   assert.equal(await page.locator('#'+suite+'-learner').isDisabled(),true);
   assert.equal(ownerCalls,0);total++;
  }else if(role==='signed-out'){
   await page.locator('#'+suite+'-admin').click();
   await page.locator('#results').filter({hasText:'FAIL: Sign in first.'}).waitFor();
   assert.equal(ownerCalls,0);
   assert.equal(roleChecks,0);total++;
  }else{
   const button=role==='admin'?'#'+suite+'-admin':'#'+suite+'-learner';
   await page.locator(button).click();
   await page.locator('#results').filter({hasText:'All selected hosted checks passed.'}).waitFor();
   const output=await page.locator('#results').textContent();
   assert.match(output,/PASS anonymous GET: HTTP 401/);
   assert.match(output,/PASS anonymous invalid POST: HTTP 401/);
   assert.match(output,role==='admin'?(suite==='preflight'?/PASS Admin missing preflight: HTTP 404/:/PASS Admin private syllabus inventory: HTTP 200/):/PASS learner GET: HTTP 403/);
   assert.match(output,role==='admin'?(suite==='preflight'?/PASS Admin preflight write refused: HTTP 405/:/PASS Admin invalid syllabus POST: HTTP 400/):/PASS learner invalid POST: HTTP 403/);
   assert.ok(!output.includes(token)&&!output.includes(user.id),'no token or identity in report');
   assert.equal(ownerCalls,suite==='preflight'&&role==='admin'?5:4);assert.equal(malformedPosts,2);assert.equal(roleChecks,1);
   assert.deepEqual(records.filter(r=>r.path.includes(suite==='preflight'?'syllabus-review-preflight':'syllabus-baseline-drafts')).map(r=>[r.method,r.signed]),suite==='preflight'&&role==='admin'?[['GET',false],['POST',false],['GET',true],['GET',true],['POST',true]]:[['GET',false],['POST',false],['GET',true],['POST',true]]);
   const before=ownerCalls;
   await page.locator(role==='admin'?'#'+suite+'-learner':'#'+suite+'-admin').click();
   await page.locator('#results').filter({hasText:'FAIL: The signed-in account does not match the selected role.'}).waitFor();
   assert.equal(ownerCalls,before,'role mismatch must stop before endpoint calls');
   total+=2;
  }
  assert.deepEqual(errors,[],'no uncaught browser errors');
  await context.close();
 }
 console.log('PASS: '+total+' synthetic browser UI checks; role-bound HTTP, no valid writes, real authentication NOT tested');
}finally{
 await browser?.close();
 await rm(tmp,{recursive:true,force:true});
}
