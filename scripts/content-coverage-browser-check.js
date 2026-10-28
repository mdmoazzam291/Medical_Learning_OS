import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from './build-pages.js';
import {publicFileSet} from './public-surface.js';
import {coveragePage,parseCoverageFilters} from '../src/domain/content-coverage.js';
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
  let failure=0,slow=false,reads=0;const writes=[];
  await context.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(req.method()!=='GET')writes.push(path);
   if(path.endsWith('/auth/v1/user'))return reply(user);
   if(path.endsWith('/review-api/me'))return reply({isAdmin:true,reviewKinds:['medical','references','rights']});
   if(path.endsWith('/review-api/transfer-pairs'))return reply({pairs:[]});
   if(path.endsWith('/owner-api/dashboard'))return reply({contractId:'owner-admin-dashboard-v1',owner:{singleton:true,email:user.email},generatedAt:snapshot.asOf,users:{total:0,recent:[]},learning:{},content:{concepts:2,questions:1,sources:0},learnerAdministration:{auditEvents:0},reviewAuthority:{temporary:true,grants:[]},ai:{telemetryAvailable:false},infrastructure:{database:'healthy',cloudflare:{status:'healthy'}}});
   if(path.endsWith('/owner-api/content-coverage')){reads++;if(failure)return reply({error:'synthetic_failure'},failure);if(slow&&url.searchParams.get('search')==='Alpha')await new Promise(resolve=>setTimeout(resolve,400));return reply(coveragePage(snapshot,parseCoverageFilters(url.searchParams)));}
   if(path.includes('/owner-api/'))return reply({flags:[],alerts:[]});
   return reply({});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/web/admin.html#owner-coverage');
  const root=page.locator('#owner-coverage-body');await root.getByText('Baseline incomplete',{exact:true}).waitFor();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();
  assert.equal(await root.locator('.coverage-row').count(),2);assert.equal(await root.getByLabel('Concept subject').locator('option').count(),21);assert.equal(await page.evaluate(()=>window.injected===true),false);
  await root.getByLabel('Question collection').selectOption('pyq');await root.getByRole('button',{name:'Apply filters',exact:true}).click();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();assert.equal(await root.locator('.coverage-row').count(),2);assert.match(await root.locator('.coverage-metrics').textContent(),/Unique assessed questions0/);assert.match(page.url(),/cv_home=pyq/);
  await page.reload();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();assert.equal(await root.getByLabel('Question collection').inputValue(),'pyq');
  await root.getByRole('button',{name:'Clear filters',exact:true}).click();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();await page.goBack();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();assert.equal(await root.getByLabel('Question collection').inputValue(),'pyq');
  await page.goto(origin+'/web/admin.html?cv_limit=1#owner-coverage');await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();
  await root.getByRole('button',{name:'Next page',exact:true}).click();await root.getByRole('heading',{name:/Empty synthetic/}).waitFor();assert.equal(await root.locator('.coverage-row').count(),1);
  await root.getByRole('button',{name:'Previous page',exact:true}).click();await root.getByRole('heading',{name:'Alpha synthetic',exact:true}).waitFor();
  slow=true;await root.getByLabel('Concept name or ID').fill('Alpha');await root.getByRole('button',{name:'Apply filters',exact:true}).click();await root.getByLabel('Concept name or ID').fill('Empty');await root.getByRole('button',{name:'Apply filters',exact:true}).click();await root.getByRole('heading',{name:/Empty synthetic/}).waitFor();await page.waitForTimeout(500);assert.equal(await root.locator('.coverage-row').count(),1);assert.equal(await root.getByLabel('Concept name or ID').inputValue(),'Empty');slow=false;
  for(const status of [503,410,403]){failure=status;await root.getByRole('button',{name:'Refresh inventory',exact:true}).click();await root.getByRole('heading',{name:status===410?'Snapshot expired':status===403?'Admin access required':'Inventory unavailable',exact:true}).waitFor();assert.equal(await root.locator('.coverage-row').count(),0);}
  failure=0;await root.getByRole('button',{name:'Refresh inventory',exact:true}).click();await root.getByRole('heading',{name:/Empty synthetic/}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(writes.length,0);assert.ok(reads>=8);
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'coverage-'+name+'-'+(process.env.BROWSER_ENGINE||'chromium')+'.png'),fullPage:true});}
  console.log('Coverage browser passed:',name,process.env.BROWSER_ENGINE||'chromium');await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(output,{recursive:true,force:true});}
