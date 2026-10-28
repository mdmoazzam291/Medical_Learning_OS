import test from 'node:test';import assert from 'node:assert/strict';
import {syllabusBaselineForm} from '../web/syllabus-baseline-editor.js';
import {createCloudOwner} from '../src/adapters/cloud-owner.js';
test('Admin checklist view is source-explicit, escaped and never implies approval',()=>{
 const html=syllabusBaselineForm({loaded:true,document:{label:'<script>inject</script>',
 pathwayVersionId:'neet-pg:preparation@1',sourceKind:'historical',sourceLocator:'Synthetic source locator',
 sourceVersion:'v1',scopeDeclaration:'partial',conceptIds:['one'],changeReason:'Test intentional change'}});
 assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<script>|Publish syllabus|Approve syllabus/);
 assert.match(html,/Private, versioned scope proposal/);
});
test('owner baseline adapter uses authenticated owner API only',async()=>{
 const requests=[];const owner=createCloudOwner({projectUrl:'https://synthetic.supabase.co',
 publishableKey:'sb_publishable_synthetic',auth:{async getSession(){return{accessToken:'synthetic'};}},
 fetchFn:async(url,options)=>{requests.push({url,options});return new Response('{}');}});
 await owner.saveSyllabusBaselineDraft({schemaVersion:1});await owner.syllabusBaselineDrafts({baselineId:'synthetic',revision:2});
 assert.equal(requests[0].options.method,'POST');assert.match(requests[0].url,/syllabus-baseline-drafts$/);
 assert.match(requests[1].url,/syllabus-baseline-drafts\/synthetic\?revision=2/);
 assert.equal(requests[0].options.headers.Authorization,'Bearer synthetic');
});
