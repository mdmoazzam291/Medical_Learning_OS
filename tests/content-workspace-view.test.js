import test from 'node:test';
import assert from 'node:assert/strict';
const v=await import('../web/content-workspace-view.js').catch(()=>({}));
const facets={subjects:[],systems:[],organs:[],domains:[],tasks:[]};
const library={concepts:[{conceptId:'c',label:'<Topic>',aliases:['Alias'],classification:facets}],notes:[],questions:[],links:[]};
test('workspace has four groups, concept tabs, shared selection and honest empty sections',()=>{
 assert.equal(typeof v.workspaceFrame,'function');
 const html=v.workspaceFrame({library,filters:{concept:'c'},view:'overview',options:{}},'<p>Existing tools</p>',{search:'?concept=c'});
 for(const label of ['Explore','Content Collections','Connections','My Library','Overview','Notes','Questions','Graph','No published note'])assert.ok(html.includes(label),label);
 assert.match(html,/&lt;Topic&gt;/);assert.doesNotMatch(html,/<Topic>/);assert.match(html,/concept=c/);assert.match(html,/data-workspace-pane="explorer"/);assert.match(html,/data-workspace-pane="context"/);
});
test('unavailable concept does not show another concept dossier',()=>{
 const html=v.workspaceFrame({library,filters:{concept:'missing'},view:'overview',options:{}},'',{search:'?concept=missing'});
 assert.match(html,/Concept unavailable/);assert.doesNotMatch(html,/data-dossier-id="c"/);
});
test('neighborhood supplies equivalent exact-version list and no unsupported medical edges',()=>{
 assert.equal(typeof v.neighborhoodMarkup,'function');
 const html=v.neighborhoodMarkup(library,'c',{perspective:'medical'});
 assert.match(html,/No published medical relationships/);assert.match(html,/Graph connections/);assert.match(html,/aria-label="Graph perspective"/);assert.doesNotMatch(html,/causes|mastery score/);
});

 test('Library actually loads the workspace shell and builds every imported public module', async()=>{
 const {readFile}=await import('node:fs/promises');
 const {publicFileSet}=await import('../scripts/public-surface.js');
 const js=await readFile(new URL('../web/library-enhancements.js',import.meta.url),'utf8');
 assert.match(js,/workspaceFrame/);
 for(const path of ['web/content-workspace-view.js','web/content-workspace.css','web/content-workspace-controls.js','web/canonical-note-reader.js','web/canonical-note-reader.css','src/domain/content-workspace.js'])assert.ok(publicFileSet.has(path),path);
 const html=await readFile(new URL('../web/library.html',import.meta.url),'utf8');assert.match(html,/content-workspace.css/);assert.match(html,/canonical-note-reader.css/);
 });
test('overview retains the shared feedback region for a study request completed after a view switch',()=>{
 const html=v.workspaceFrame({library,filters:{concept:'c'},view:'overview',options:{}},'',{search:'?concept=c'});
 assert.match(html,/id="library-status"[^>]*role="status"/);assert.match(html,/data-save-view/);
});

test('overview shows source-grounded, escaped note sections and distinguishes drafts',()=>{
 const rich={...library,notes:[{noteVersionId:'note@3',conceptId:'c',title:'Reviewed note',sourceIds:['source@2'],bodyMarkdown:'## Diagnosis\n<synthetic-assertion> and source text'}],sources:[{sourceId:'source@2',title:'Reviewed reference',version:'v2'}]};
 const state={library:rich,filters:{concept:'c'},view:'overview',options:{}};
 const published=v.workspaceFrame(state,'',{search:'?concept=c'});
 assert.match(published,/data-dossier-section="diagnosis"/);
 assert.match(published,/&lt;synthetic-assertion&gt;/);
 assert.doesNotMatch(published,/<synthetic-assertion>/);
 assert.match(published,/Reviewed reference/);
 assert.match(published,/note@3/);
 assert.match(published,/Recall before rereading/);
 const draft=v.workspaceFrame(state,'',{search:'?concept=c',draft:true});
 assert.match(draft,/Draft note sections/);
 assert.doesNotMatch(draft,/Reviewed clinical content/);
 assert.doesNotMatch(draft,/Recall before rereading/);
});
