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
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' horizontal overflow');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.match(page.url(),/page=2/);
  await page.locator('#nmc-search').fill('GM9.8');await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('status').filter({hasText:'2 source reference appearances'}).waitFor();
  assert.ok(!page.url().includes('page='));
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
