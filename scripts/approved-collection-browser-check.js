import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from './build-pages.js';
import {publicFileSet} from './public-surface.js';
import {approvedCollectionPage,parseApprovedCollectionFilters} from '../src/domain/approved-collection.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const output=await mkdtemp(join(tmpdir(),'mlos-coverage-'));await buildPages({outputDirectory:output});
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname.slice(1);if(!publicFileSet.has(p)){res.writeHead(404);return res.end();}try{res.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(join(output,p)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const snapshot={contractId:'approved-collection-snapshot-v1',catalogVersion:446,asOf:'2026-10-29T00:00:00Z',rows:Array.from({length:53},(_,i)=>({kind:i===0?'note':'question',canonicalId:i===0?'Alpha <script>window.injected=true</script>':'synthetic-'+String(i).padStart(3,'0'),versionId:'synthetic@'+i,version:1,status:i===1?'published':'verified',sourceCount:1,rightsCurrent:i!==0,openIssues:0,gates:{medical:i===0?'missing':'current',references:'current',rights:'current'}}))};
const user={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'};
let browser;const errors=[];
try{
 browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
 for(const [name,width,height] of [['phone',390,844],['tablet',1180,820],['desktop',1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}});await context.addInitScript(user=>localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user})),user);
  let failure=0,slow=false;const writes=[];
  await context.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(req.method()!=='GET')writes.push(path);
   if(path.endsWith('/auth/v1/user'))return reply(user);
   if(path.endsWith('/review-api/me'))return reply({isAdmin:true,reviewKinds:['medical','references','rights']});
   if(path.endsWith('/review-api/transfer-pairs'))return reply({pairs:[]});
   if(path.endsWith('/owner-api/dashboard'))return reply({contractId:'owner-admin-dashboard-v1',owner:{singleton:true,email:user.email},generatedAt:snapshot.asOf,users:{total:0,recent:[]},learning:{},content:{concepts:0,questions:52,sources:1},learnerAdministration:{auditEvents:0},reviewAuthority:{temporary:true,grants:[]},ai:{telemetryAvailable:false},infrastructure:{database:'healthy',cloudflare:{status:'healthy'}}});
   if(path.endsWith('/owner-api/approved-collection')){if(failure)return reply({error:'synthetic'},failure);if(slow&&url.searchParams.get('search')==='synthetic')await new Promise(r=>setTimeout(r,400));return reply(approvedCollectionPage(snapshot,parseApprovedCollectionFilters(url.searchParams)));}
   return reply({flags:[],alerts:[]});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/web/admin.html#owner-approved-collection');
  const root=page.locator('#owner-approved-collection-body');await root.getByRole('heading',{name:/Alpha/}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Approved Collection',exact:true}).count(),1);
  assert.equal(await root.locator('.coverage-row').count(),50);assert.equal(await page.evaluate(()=>window.injected===true),false);
  await root.getByRole('button',{name:'Next collection page',exact:true}).click();await root.getByText('synthetic-052',{exact:true}).waitFor();assert.equal(await root.locator('.coverage-row').count(),3);
  await root.getByRole('button',{name:'Previous collection page',exact:true}).click();await root.getByRole('heading',{name:/Alpha/}).waitFor();
  await root.getByLabel('Evidence / stored state').selectOption('stored-published');await root.getByRole('button',{name:'Apply collection filters',exact:true}).click();await root.getByRole('heading',{name:'synthetic-001',exact:true}).waitFor();assert.equal(await root.locator('.coverage-row').count(),1);
  await page.reload();await root.getByRole('heading',{name:'synthetic-001',exact:true}).waitFor();assert.equal(await root.getByLabel('Evidence / stored state').inputValue(),'stored-published');
  await page.goBack();await root.getByRole('heading',{name:/Alpha/}).waitFor();
  await root.getByLabel('Content type').selectOption('note');await root.getByRole('button',{name:'Apply collection filters',exact:true}).click();await root.getByRole('heading',{name:/Alpha/}).waitFor();assert.equal(await root.locator('.coverage-row').count(),1);
  await root.getByLabel('Canonical or version ID').fill('no-such-id');await root.getByRole('button',{name:'Apply collection filters',exact:true}).click();await root.getByText('No versions match these filters.',{exact:true}).waitFor();
  for(const status of [503,403]){failure=status;await root.getByRole('button',{name:'Refresh evidence',exact:true}).click();await root.getByRole('heading',{name:status===403?'Admin access required':'Collection unavailable',exact:true}).waitFor();assert.equal(await root.locator('.coverage-row').count(),0);}
  failure=0;await root.getByLabel('Canonical or version ID').fill('');await root.getByRole('button',{name:'Apply collection filters',exact:true}).click();await root.getByRole('heading',{name:/Alpha/}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(writes.length,0);assert.equal(await root.locator('[data-publish],[data-approve]').count(),0);
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'approved-collection-'+name+'-'+(process.env.BROWSER_ENGINE||'chromium')+'.png'),fullPage:true});}
  console.log('Approved collection browser passed:',name,process.env.BROWSER_ENGINE||'chromium');await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(output,{recursive:true,force:true});}
