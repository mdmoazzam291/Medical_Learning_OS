import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {buildPages} from './build-pages.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const directory=await mkdtemp(join(tmpdir(),'mlos-public-install-browser-'));
await buildPages({outputDirectory:directory,publicPreview:true});
const policy=(await readFile(join(directory,'_headers'),'utf8')).match(/Content-Security-Policy: (.+)/)[1];
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 let file=pathname==='/'?'index.html':pathname.slice(1);if(!file.includes('.'))file+='.html';
 const path=resolve(directory,file);if(!path.startsWith(directory+'/')){res.writeHead(404);return res.end();}
 try{const body=await readFile(path);const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':'image/svg+xml';res.writeHead(200,{'Content-Type':type,'Content-Security-Policy':policy,'Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});
try{
 for(const [width,height] of [[390,1000],[820,390],[820,1000],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}}),external=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push('external_request');return route.abort();}return route.continue();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/web/install.html','/web/account.html#access_token=synthetic-not-a-token','/web/workspace.html','/oauth/consent']){
   // The plain local server uses the same generated OAuth notice through its static path.
   await page.goto(origin+(path==='/oauth/consent'?'/web/oauth-consent.html':path));
   assert.ok(await page.getByText('Public preview',{exact:true}).first().isVisible());
   assert.ok(await page.getByRole('link',{name:'Installation guide →',exact:true}).first().isVisible());
   if(path==='/web/install.html'){
    assert.ok(await page.getByRole('heading',{name:'Install Medretica Preview',exact:true}).isVisible());
    assert.ok(await page.getByRole('heading',{name:'If installation is missing',exact:true}).isVisible());
    for(const link of await page.locator('.install-guide a').all())assert.ok((await link.boundingBox()).height>=44,'guide link touch height');
    await page.getByRole('navigation',{name:'Installation sections',exact:true}).getByRole('link',{name:'Android',exact:true}).click();
    assert.equal(new URL(page.url()).hash,'#install-android');
    assert.ok(await page.locator('#install-android').evaluate(node=>node.getBoundingClientRect().top>=0&&node.getBoundingClientRect().top<innerHeight));
    // Measure the top gap at the original scroll position, before navigating Home.
    await page.goto(origin+'/web/install.html');

   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'public page should not clip horizontally');
   assert.equal(await page.locator('a[href^="/web/account"]').count(),0,'preview must not advertise account entry');
   if(path==='/'||path==='/web/install.html'){
    const gap=await page.evaluate(()=>{
     const banner=document.querySelector('body>[aria-label="Public preview"]');
     const content=document.querySelector('.page-heading')||document.querySelector('main>.panel');
     return content.getBoundingClientRect().top-banner.getBoundingClientRect().bottom;
    });
    assert.ok(gap>=0&&gap<=32,'preview content gap: '+gap);
   }
   assert.equal(await page.locator('script').count(),0);assert.equal(await page.locator('form,input[type=password]').count(),0);
   assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/web/manifest.webmanifest');
   if(path==='/web/install.html'){
    await page.getByRole('link',{name:'Open the preview homepage →',exact:true}).click();
    assert.equal(new URL(page.url()).pathname,'/');
   }
  }
  const manifest=await context.request.get(origin+'/web/manifest.webmanifest');assert.equal(manifest.status(),200);const identity=await manifest.json();assert.equal(identity.start_url,'/');assert.equal(identity.name,'Medretica Preview');
  assert.equal((await context.request.get(origin+'/web/cloud-config.js')).status(),404);
  assert.equal((await context.request.get(origin+'/web/account.js')).status(),404);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Public install preview PASS:4viewports,static notices,no scripts/forms/cloudconfig or external browser requests; production profile separate.');
}finally{await browser.close();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
