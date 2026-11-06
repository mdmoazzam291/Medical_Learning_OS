import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from './build-pages.js';
import {publicFileSet} from './public-surface.js';
const directory=await mkdtemp(join(tmpdir(),'nmc-browser-'));
await buildPages({outputDirectory:directory});
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname.slice(1);
 if(!publicFileSet.has(path)){res.writeHead(404);return res.end();}
 try{const bytes=await readFile(join(directory,path));const extension=path.split('.').pop();res.setHeader('Content-Type',({js:'text/javascript',html:'text/html',css:'text/css',json:'application/json',svg:'image/svg+xml',png:'image/png'})[extension]||'text/plain');res.end(bytes);}catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const screenshots=process.env.SCREENSHOT_DIR||join(tmpdir(),'nmc-catalogue-screenshots');await mkdir(screenshots,{recursive:true});
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const engine=process.env.BROWSER_ENGINE||'chromium';
const browser=await engines[engine].launch({headless:true});
try{
 for(const [name,width,height] of [['phone',390,844],['tablet',1024,768],['desktop',1440,1000]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/web/nmc-catalogue.html');
  await page.getByRole('status').filter({hasText:'2634 source reference appearances'}).waitFor();
  assert.equal(await page.locator('.nmc-topic').count(),20);
  assert.ok(await page.getByRole('navigation',{name:'Workspace',exact:true}).evaluate(el=>el.getBoundingClientRect().height<70),name+' workspace links waste vertical reading space');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' horizontal overflow');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.match(page.url(),/page=2/);
  await page.locator('#nmc-search').fill('GM9.8');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('status').filter({hasText:'2 source reference appearances'}).waitFor();
  assert.ok(!page.url().includes('page='));
  await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByRole('link',{name:'Sign in to find learning material',exact:true}).waitFor();
  let libraryMode='normal',libraryCalls=0;
  const fixture={concepts:[{conceptId:'existing-anemia',label:'Anemia',aliases:[],classification:{subjects:['medicine','pediatrics'],systems:['hematology'],organs:['blood']}}],questions:[{questionId:'q1',conceptLinks:[{conceptId:'existing-anemia',role:'primary'}]}],notes:[{noteVersionId:'n1',conceptId:'existing-anemia'}]};
  await page.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/content-library-api/library')){
    assert.equal(route.request().method(),'GET');libraryCalls++;
    if(libraryMode==='slow')await new Promise(resolve=>setTimeout(resolve,300));
    return route.fulfill({status:libraryMode==='outage'?503:200,contentType:'application/json',body:JSON.stringify(libraryMode==='outage'?{error:'unavailable'}:libraryMode==='empty'?{concepts:[],questions:[],notes:[]}:fixture)});
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({isAdmin:false})});
  });
  await page.evaluate(()=>localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}})));
  await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByRole('link',{name:'Open concept',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Open concept',exact:true}).getAttribute('href'),'/web/library.html?view=overview&concept=existing-anemia');
  await page.getByText('1 published questions · 1 published notes',{exact:false}).waitFor();
  assert.equal(libraryCalls,1);
  libraryMode='outage';await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByText('Learning material could not be loaded.',{exact:false}).waitFor();
  libraryMode='empty';await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByText('No published concepts match this topic',{exact:false}).waitFor();
  libraryMode='normal';
  await page.locator('#nmc-search').fill('Acute Myocardial Infarction');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByText('No published concepts match this topic',{exact:false}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Browse Medicine concepts (1)',exact:true}).getAttribute('href'),'/web/library.html?view=overview&subject=medicine');
  await page.getByRole('link',{name:'Browse all published concepts (1)',exact:true}).waitFor();
  await page.locator('#nmc-search').fill('GM9.8');await page.getByRole('button',{name:'Search',exact:true}).click();
  libraryMode='slow';await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.nmc-concept').count(),0,'late result must not enter a new topic view');
  await page.locator('#nmc-search').fill('GM9.8');await page.getByRole('button',{name:'Search',exact:true}).click();
  libraryMode='normal';await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByRole('link',{name:'Open concept',exact:true}).waitFor();
  libraryMode='slow';
  const accountRead=page.waitForRequest(r=>new URL(r.url()).pathname.endsWith('/content-library-api/library'));
  await page.getByRole('button',{name:'Find learning material',exact:true}).click();await accountRead;
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('mlos-supabase-auth-v1'));s.user.id='22222222-2222-4222-8222-222222222222';localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify(s));});
  await page.getByText('Your account changed. Find learning material again.',{exact:true}).waitFor();
  assert.equal(await page.locator('.nmc-concept').count(),0,'in-flight account switch discards results');
  libraryMode='normal';await page.getByRole('button',{name:'Find learning material',exact:true}).click();
  await page.getByRole('link',{name:'Open concept',exact:true}).waitFor();
  await page.evaluate(()=>{localStorage.removeItem('mlos-supabase-auth-v1');window.dispatchEvent(new StorageEvent('storage',{key:'mlos-supabase-auth-v1'}));});
  assert.equal(await page.locator('.nmc-concept').count(),0,'logout clears discovery panels');

  await page.getByRole('link',{name:'Integrated',exact:true}).click();
  await page.getByRole('link',{name:'Sign in to browse published concepts',exact:true}).waitFor();
  await page.evaluate(()=>{
   localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}}));
   window.dispatchEvent(new StorageEvent('storage',{key:'mlos-supabase-auth-v1'}));
  });
  await page.getByLabel('System',{exact:true}).selectOption('hematology');
  await page.getByLabel('Organ',{exact:true}).selectOption('blood');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  const integratedConcept=page.getByRole('link',{name:'Anemia',exact:true});
  await integratedConcept.waitFor();
  assert.equal(await integratedConcept.getAttribute('href'),'/web/library.html?view=overview&concept=existing-anemia');
  assert.equal(await integratedConcept.count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' integrated overflow');
  await page.evaluate(()=>{localStorage.removeItem('mlos-supabase-auth-v1');window.dispatchEvent(new StorageEvent('storage',{key:'mlos-supabase-auth-v1'}));});
  await page.getByRole('link',{name:'Sign in to browse published concepts',exact:true}).waitFor();
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await page.getByRole('status').filter({hasText:'2 source reference appearances'}).waitFor();
  await page.locator('.nmc-topic summary').click();
  assert.equal(await page.locator('.nmc-references li').count(),2);
  assert.equal(await page.locator('.nmc-references a').first().getAttribute('href').then(h=>h.startsWith('https://nmc.org.in/')),true);
  await page.reload();await page.getByRole('status').filter({hasText:'2 source reference appearances'}).waitFor();
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.locator('#nmc-subject').selectOption('anatomy');await page.getByRole('status').filter({hasText:'413 source reference appearances'}).waitFor();
  await page.locator('#nmc-search').fill('no-such-reference');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByText('No matching topics or codes.',{exact:false}).waitFor();
  await page.goBack();await page.getByRole('status').filter({hasText:'413 source reference appearances'}).waitFor();
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.locator('#nmc-search').fill('PY9.1');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.locator('.nmc-topic summary').click();await page.getByRole('link',{name:'Read October clarification',exact:true}).waitFor();
  assert.deepEqual(errors,[],name+' browser errors');
  await page.screenshot({path:join(screenshots,'nmc-catalogue-'+name+'.png'),fullPage:true});
  await page.close();console.log(name+': search/filter/pagination/reload/history/source/amendment/overflow passed');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
