import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';
import { cloudConfig } from '../web/cloud-config.js';
import { profile, curriculum, library } from '../tests/fixtures/preparation-fixture.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const output=await mkdtemp(join(tmpdir(),'mlos-preparation-'));
await buildPages({outputDirectory:output});
const headers=Object.fromEntries((await readFile(join(output,'_headers'),'utf8')).split('\n').filter(l=>/^\s+[^:]+:/.test(l)).map(l=>{const i=l.indexOf(':');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!publicFileSet.has(path)){res.writeHead(404);return res.end();}
  try{res.writeHead(200,{...headers,'Content-Type':path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(join(output,path)));}
  catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
const errors=[];
try{
  browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
  for(const [name,width,height] of [['phone',390,844],['split',768,1024],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['desktop',1600,1000]]){
    console.log('Preparation viewport:',name);
    const context=await browser.newContext({viewport:{width,height}});
    await context.addInitScript(()=>{localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user:{id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',providers:['email']}}));});
    let saved=null,failSave=false,empty=false,updates=0;
    const metadata=()=>({id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid',app_metadata:{providers:['email']},user_metadata:{mlos_preparation_profile:saved,unrelated:'keep'}});
    const routeApi=async route=>{
      const request=route.request(),path=new URL(request.url()).pathname;
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/auth/v1/user'){
        if(request.method()==='PUT'){
          if(failSave)return reply({error:'temporarily_unavailable'},503);
          const body=request.postDataJSON();assert.deepEqual(Object.keys(body),['data']);assert.deepEqual(Object.keys(body.data),['mlos_preparation_profile']);saved=body.data.mlos_preparation_profile;updates++;
        }
        return reply(metadata());
      }
      if(path.endsWith('/study-api/progress'))return reply({attempts:7,correct:4});
      if(path.endsWith('/study-api/questions'))return reply({questions:[]});
      if(path.endsWith('/study-api/retention-probe/consent'))return reply({optedIn:false,protocol:{}});
      if(path.endsWith('/review-api/me'))return reply({isAdmin:false,reviewKinds:[]});
      if(path.endsWith('/content-library-api/library')){
        const c=curriculum();if(empty)c.mappings=[];
        return reply({...library(),preparation:{profile:saved,curriculum:c}});
      }
      if(request.method()!=='GET')throw Error('Unexpected write '+path);
      return reply({});
    };
    await context.route(cloudConfig.projectUrl+'/**',routeApi);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/web/account.html');
    await page.getByRole('button',{name:'Save preparation goals',exact:true}).waitFor({state:'visible'});
    await page.locator('#preparation-profile-form select[name="preparationGoal"]').selectOption('both');
    await page.locator('#preparation-profile-form select[name="primaryGoal"]').selectOption('ini-cet');
    await page.getByRole('button',{name:'Save preparation goals',exact:true}).click();
    await page.getByText('Saved goals: NEET-PG + INI-CET.',{exact:true}).waitFor();
    assert.deepEqual(saved,{...profile,primaryPathwayId:'ini-cet'});assert.equal(updates,1);
    await page.reload();await page.getByText('Saved goals: NEET-PG + INI-CET.',{exact:true}).waitFor();
    assert.equal(await page.locator('[name="primaryGoal"]').inputValue(),'ini-cet');
    failSave=true;await page.locator('[name="preparationGoal"]').selectOption('neet-pg');await page.getByRole('button',{name:'Save preparation goals',exact:true}).click();
    await page.getByRole('button',{name:'Retry goals',exact:true}).waitFor();assert.equal(saved.pathwayIds.length,2);failSave=false;
    await page.getByRole('button',{name:'Retry goals',exact:true}).click();await page.getByText('Saved goals: NEET-PG + INI-CET.',{exact:true}).waitFor();
    await page.goto(origin+'/web/library.html?view=questions&scope=goals');
    await page.locator('[data-question-card]').first().waitFor();assert.equal(await page.locator('[data-question-card]').count(),4);
    await page.getByLabel('Content scope',{exact:true}).selectOption('foundations');assert.equal(await page.locator('[data-question-card]').count(),1);
    await page.getByLabel('Content scope',{exact:true}).selectOption('all');assert.equal(await page.locator('[data-question-card]').count(),5);
    await page.goBack();assert.equal(await page.getByLabel('Content scope',{exact:true}).inputValue(),'foundations');assert.equal(await page.locator('[data-question-card]').count(),1);
    await page.goForward();assert.equal(await page.getByLabel('Content scope',{exact:true}).inputValue(),'all');
    await page.reload();await page.getByLabel('Content scope',{exact:true}).waitFor();assert.equal(await page.locator('[data-question-card]').count(),5);
    await page.goto(origin+'/web/library.html?view=overview&concept=shared&scope=all');
    await page.getByText('Unbound shared note',{exact:true}).first().waitFor();
    empty=true;await page.goto(origin+'/web/library.html?view=questions&scope=goals');await page.getByLabel('Content scope',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-question-card]').count(),0);
    await page.locator('.preparation-focus summary').click();assert.equal(await page.getByText(/Not mapped yet/).count(),2);
    await page.getByLabel('Content scope',{exact:true}).selectOption('all');assert.equal(await page.locator('[data-question-card]').count(),5);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,name+' horizontal overflow');
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('Preparation account save/reload/retry and goal/foundation/all scope, dossier, Back/Forward and empty curriculum passed at five widths.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(output,{recursive:true,force:true});}
