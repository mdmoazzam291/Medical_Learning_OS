import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261120130000_question_rights_owner_waiver.sql',import.meta.url),'utf8');
const web=readFileSync(new URL('../web/content-import.js',import.meta.url),'utf8');

test('migration adds owner_waived and patches each gate with an exact-match guard',()=>{
 assert.match(sql,/check \(rights_status in \('owned', 'licensed', 'public_domain', 'citation_only', 'restricted', 'owner_waived'\)\)/);
 for(const fn of ['resolve_source_rights(text,uuid,text,text)','record_content_review(text,text,uuid,text,text)','publish_verified_content(text)','content_library_review_publish_legacy_v1(text,uuid,text,jsonb,text,boolean)'])assert.ok(sql.includes(fn),fn);
 assert.equal((sql.match(/owner_waiver_patch_mismatch/g)||[]).length,3);
 // The automatic waiver covers question sources only, is recorded through the audited resolver, and never claims a licence.
 assert.match(sql,/jsonb_array_elements\(v_m->''questions''\)/);assert.doesNotMatch(sql,/v_m->''notes''/);
 assert.match(sql,/resolve_source_rights\(src,p_reviewer,''owner_waived''/);assert.match(sql,/Not a licence or permission/);
 assert.match(sql,/revoke all on function public\.content_library_review_publish_legacy_v1[^;]*from public, anon, authenticated/);
});

test('import screen defaults to the owner waiver and keeps a real decision when one exists',()=>{
 const opts=web.match(/function rightsOptions[\s\S]*?\n/)[0];
 assert.match(web,/\['owner_waived','Not reviewed \(owner waiver\)'\]/);
 assert.match(opts,/reviewed\(s\)\?s\.rights\.status:'owner_waived'/);
 assert.doesNotMatch(web,/Choose verified permission/);
});
