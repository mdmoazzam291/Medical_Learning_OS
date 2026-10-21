import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp,readFile,rm,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';
const engines=await import(process.env.PLAYWRIGHT_MODULE_URL||'playwright');
const output=await mkdtemp(join(tmpdir(),'mlos-content-workspace-'));await buildPages({outputDirectory:output});
const headers=Object.fromEntries((await readFile(join(output,'_headers'),'utf8')).split('\n').filter(l=>/^\s+[^:]+:/.test(l)).map(l=>{const i=l.indexOf(':');return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname.slice(1);if(!publicFileSet.has(p)){res.writeHead(404);return res.end();}try{res.writeHead(200,{...headers,'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/javascript'});res.end(await readFile(join(output,p)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const facets={subjects:['medicine'],systems:['synthetic-system'],organs:[],domains:[],tasks:['diagnosis']};
const c=id=>({conceptId:id,label:id==='a'?'Synthetic Alpha':id==='b'?'Synthetic Beta':'Long synthetic label '+id+' repeated '.repeat(12),aliases:id==='a'?['Alias Alpha']:[],classification:facets});
const q=(id,home='original')=>({questionId:id,questionVersionId:id+'@2',stem:'Synthetic prompt '+id,options:[{optionId:'a',text:'Alpha'},{optionId:'b',text:'Beta'}],conceptLinks:[{conceptId:'a',role:'primary'},{conceptId:'b',role:'prerequisite'}],classification:facets,home:{kind:home,exams:home==='pyq'?['test-exam']:[],platforms:home==='platform'?['marrow']:[]},origins:home==='pyq'?[{kind:'pyq',examId:'test-exam',year:2025,session:'test'}]:[],observed:{state:'unattempted',attempts:0,wrong:0},sourceIds:['s'],intelligence:{presentation:['image'],qualifiers:[],responseFormat:'single-best-answer'}});
const library={concepts:['a','b',...Array.from({length:120},(_,i)=>'c'+i)].map(c),questions:[q('pyq','pyq'),q('platform','platform'),...Array.from({length:120},(_,i)=>q('q'+i))],notes:[{noteVersionId:'n@3',conceptId:'a',title:'Synthetic note',bodyMarkdown:'Engineering fixture only. <script>window.injected=true</script>',sourceIds:['s']}],sources:[{sourceId:'s',title:'Synthetic reference',url:'https://example.invalid',version:'edition-2'}],links:[],masteryInference:false};
const manifest={schemaVersion:1,importId:'workspace-fixture',concepts:[{...c('a'),subjectTags:['medicine']}],sources:[{sourceId:'s',title:'Synthetic reference',url:null,version:'edition-2',evidence:'PRIVATE REVIEW EVIDENCE'}],questions:[{...q('draft','pyq'),answerOptionId:'a',explanation:'SECRET ANSWER TEXT'}].map(({questionVersionId,home,observed,...q})=>q),notes:[{noteId:'n',conceptId:'a',title:'Synthetic draft note',bodyMarkdown:'Synthetic draft body',sourceIds:['s'],provenance:{kind:'ai_generated_original',evidence:'Synthetic only'}}],noteQuestionLinks:[{noteId:'n',questionId:'draft',relation:'explains',section:''}]};
const browser=await engines[process.env.BROWSER_ENGINE||'chromium'].launch({headless:true});const errors=[];
try{
 for(const [name,width,height] of [['phone',390,844],['split',768,1024],['ipad-portrait',820,1180],['ipad-landscape',1180,820],['desktop',1600,1000]]){
  const context=await browser.newContext({viewport:{width,height}});await context.addInitScript(()=>{if(window!==window.top)return;localStorage.setItem('mlos-supabase-auth-v1',JSON.stringify({accessToken:'synthetic',refreshToken:'synthetic',expiresAt:2100000000,user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid'}}));});
  console.log('Workspace viewport:',name);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const writes=[];let empty=false;
  await page.route('https://iyapppmeieqhflnzslao.supabase.co/**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;const reply=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});if(request.method()!=='GET')writes.push(path);
   if(path.endsWith('/content-library-api/library'))return reply(empty?{concepts:[],notes:[],questions:[],links:[]}:library);
   if(path.endsWith('/review-api/me'))return reply({isAdmin:true,reviewKinds:['medical','references','rights']});
   if(path.endsWith('/content-library-api/imports'))return reply({imports:[{import_id:'workspace-fixture',status:'draft'}]});
   if(path.endsWith('/content-library-api/imports/workspace-fixture'))return reply({import_id:'workspace-fixture',status:'draft',digest:'a'.repeat(64),manifest,sources:[],duplicateTargets:[]});
   throw new Error('Unexpected API '+request.method()+' '+path);
  });
  await page.goto(origin+'/web/library.html?concept=a');await page.getByRole('tab',{name:'Overview',exact:true}).waitFor();
  assert.equal(await page.locator('[data-dossier-id=a]').count(),1);
  assert.equal(await page.locator('#cw-explorer').isVisible(),width>=1000);assert.equal(await page.locator('#cw-context').isVisible(),width>=1400);
  assert.equal(await page.locator('[data-cw-toggle=context]').getAttribute('aria-expanded'),String(width>=1400));
  if(width<1400){await page.locator('[data-cw-toggle=context]').click();await page.getByRole('dialog',{name:'Library panel'}).waitFor();assert.equal(await page.locator('[data-cw-toggle=context]').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#cw-pane-dialog').isVisible(),false);assert.equal(await page.locator('[data-cw-toggle=context]').evaluate(e=>e===document.activeElement),true);}
  if(width<1000){await page.locator('[data-cw-toggle=explorer]').click();await page.getByRole('dialog',{name:'Library panel'}).waitFor();}
  await page.getByLabel('Concept name or alias',{exact:true}).fill('Alias Alpha');await page.getByRole('button',{name:'Find concept',exact:true}).click();
  // Search keeps the narrow-window Explorer open and its results usable.
  if(width<1000)assert.equal(await page.getByRole('dialog',{name:'Library panel'}).isVisible(),true);
  assert.equal(await page.locator('.cw-concept').count(),1);await page.locator('.cw-concept').click();
  await page.getByRole('tab',{name:'Questions',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('concept'),'a');assert.equal(await page.locator('[data-question-card]').count(),50);
  await page.getByRole('button',{name:'Show more content',exact:true}).click();assert.equal(await page.locator('[data-question-card]').count(),100);
  await page.getByRole('tab',{name:'Graph',exact:true}).click();await page.getByRole('img',{name:'Connected question graph'}).waitFor();assert.ok(await page.locator('.graph-node').count()<=30);assert.ok(await page.getByRole('region',{name:'Graph connections'}).count());
  await page.getByLabel('Graph perspective',{exact:true}).selectOption('learning');assert.match(await page.locator('.cw-graph-list').textContent(),/q.*@2/);
  await page.getByLabel('Graph perspective',{exact:true}).selectOption('medical');await page.getByText('No published medical relationships are available in the current contract.',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('concept'),'a');await page.goBack();assert.equal(new URL(page.url()).searchParams.get('view'),'graph');await page.reload();await page.getByLabel('Graph perspective',{exact:true}).waitFor();assert.equal(await page.getByLabel('Graph perspective',{exact:true}).inputValue(),'medical');
  if(width<1000){
   // Browser history must dismiss an on-demand Explorer rather than keep a
   // modal over the global search control after the reader view changes.
   await page.locator('[data-cw-toggle=explorer]').click();
   await page.getByRole('dialog',{name:'Library panel'}).waitFor();
   await page.goBack();
   await page.waitForFunction(()=>!document.querySelector('#cw-pane-dialog')?.open);
   assert.equal(await page.locator('#cw-pane-dialog').isVisible(),false,'History navigation must dismiss the Explorer modal');
   await page.getByRole('button',{name:'Search all published content',exact:true}).click();
   await page.keyboard.press('Escape');
  }
  await page.goto(origin+'/web/library.html?view=questions&concept=a&collection=pyq');await page.locator('[data-question-card=pyq]').waitFor();assert.equal(await page.locator('[data-question-card]').count(),1);await page.getByRole('tab',{name:'Notes',exact:true}).click();assert.equal(new URL(page.url()).searchParams.has('collection'),false);await page.getByRole('heading',{name:'Synthetic note',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.injected===true),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(writes,[]);
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'content-workspace-'+name+'.png'),fullPage:true});}
  await page.goto(origin+'/web/library.html?view=media&concept=a');await page.locator('[data-media]').first().waitFor();assert.equal(await page.locator('[data-media]').count(),50);await page.getByRole('button',{name:'Show more content',exact:true}).click();assert.equal(await page.locator('[data-media]').count(),100);
  await page.goto(origin+'/web/library.html?view=compare&concept=a');await page.locator('[data-compare="1"]').waitFor();assert.ok(await page.locator('[data-compare="1"] option[value=b]').count());await page.locator('[data-compare="1"]').selectOption('b');await page.getByRole('heading',{name:'Synthetic Beta',exact:true}).waitFor();
  await page.goto(origin+'/web/library.html?concept=missing');await page.getByRole('heading',{name:'Concept unavailable',exact:true}).waitFor();assert.equal(await page.locator('[data-dossier-id]').count(),0);
  empty=true;await page.goto(origin+'/web/library.html');await page.getByText(/Your content homes are ready/).waitFor();assert.equal(await page.locator('[data-question-card]').count(),0);
  await page.goto(origin+'/web/content-import.html');await page.getByRole('button',{name:'workspace-fixture',exact:true}).click();await page.getByRole('heading',{name:'Content Placement Inspector',exact:true}).waitFor();await page.getByRole('button',{name:'Preview draft as learner',exact:true}).click();
  const preview=page.getByRole('dialog',{name:'Draft learner preview'}),canvas=page.frameLocator('#draft-preview iframe');await preview.waitFor();await page.locator('[data-draft-canvas][data-preview-ready=true]').waitFor();assert.equal(await page.locator('[data-draft-canvas]').getAttribute('sandbox'),'allow-scripts');assert.equal(await canvas.locator('body').evaluate(()=>window.origin),'null','Draft must have an opaque origin, not the admin origin.');assert.equal(await canvas.locator('body').evaluate(()=>{try{return !!parent.localStorage;}catch{return false;}}),false,'Draft cannot inspect parent authentication storage.');await canvas.getByRole('tab',{name:'Overview',exact:true}).waitFor();assert.doesNotMatch(await canvas.locator('body').textContent(),/SECRET ANSWER TEXT|PRIVATE REVIEW EVIDENCE|answerOptionId/);
  await preview.getByRole('button',{name:'Desktop · 1440 px',exact:true}).click();await page.locator('[data-draft-canvas][data-preview-ready=true]').waitFor();assert.equal(await page.locator('[data-draft-canvas]').evaluate(e=>e.getBoundingClientRect().width),1440);await canvas.locator('#cw-context').waitFor({state:'visible'});assert.equal(await canvas.locator('#cw-context').isVisible(),true,'Desktop preview must show its right inspector even on an iPad/phone host.');
  await canvas.getByRole('tab',{name:'Questions',exact:true}).click();await page.locator('[data-draft-canvas][data-preview-ready=true]').waitFor();await canvas.getByRole('heading',{name:'Synthetic prompt draft',exact:true}).waitFor({timeout:10000}).catch(async error=>{console.log('Draft interaction diagnostics',JSON.stringify(await page.locator('[data-draft-canvas]').evaluate(f=>({ready:f.dataset.previewReady,url:f.contentDocument?.URL,selected:f.contentDocument?.querySelector('[role=tab][aria-selected=true]')?.textContent,text:f.contentDocument?.body?.innerText}))), await canvas.getByRole('tab',{name:'Questions',exact:true}).boundingBox());throw error;});
  await preview.getByRole('button',{name:'iPad · 1024 px',exact:true}).click();await page.locator('[data-draft-canvas][data-preview-ready=true]').waitFor();assert.equal(await page.locator('[data-draft-canvas]').evaluate(e=>e.getBoundingClientRect().width),1024);
  await canvas.getByRole('tab',{name:'Questions',exact:true}).waitFor();assert.equal(await canvas.locator('#cw-context').isVisible(),false);await page.keyboard.press('Escape');assert.equal(await preview.isVisible(),false);assert.deepEqual(writes,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Unified content workspace: five viewport sizes, concept continuity, bounded catalogs/graph, Back/reload, dialogs/focus, draft isolation and zero browse writes passed. Synthetic fixtures only.');
}finally{await browser.close();await new Promise(r=>server.close(r));await rm(output,{recursive:true,force:true});}
