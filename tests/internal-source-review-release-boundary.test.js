import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicFiles,publicFileSet} from '../scripts/public-surface.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const protectedPaths=Object.freeze([
 'src/domain/source-row-review.js',
 'src/domain/source-row-evidence.js',
 'src/domain/internal-source-row-review.js',
 'src/domain/internal-source-row-eligibility.js',
 'src/domain/internal-source-row-server-preflight.js',
 'ops/prototypes/source-evidence/internal-review.sql',
 'ops/prototypes/source-evidence/internal-review-bound-identity.sql',
 'scripts/internal-source-review-sql-check.js',
 'scripts/internal-source-review-native-races.js',
 'scripts/internal-source-review-bound-identity-check.js'
]);
const forbidden=/internal-source-row|internal_source_row|evidence_internal|record_review_bound|read_review_bound|revoke_bound_grant/;

test('internal source-review contracts, SQL and tests are not learner Pages assets',async()=>{
 for(const path of protectedPaths){
  assert.equal(publicFileSet.has(path),false,`private source-review artifact included in Pages: ${path}`);
 }
 assert.equal(publicFiles.some(p=>p.startsWith('ops/prototypes/source-evidence/')),false);
 for(const path of publicFiles.filter(p=>p.endsWith('.js'))){
  const source=await readFile(join(root,path),'utf8');
  assert.doesNotMatch(source,forbidden,`public browser JS references restricted review prototype: ${path}`);
 }
});

test('internal review decisions are not wired to deployed API routes or migrations',async()=>{
 const files=[
  'supabase/functions/review-api/index.ts',
  'supabase/functions/study-api/index.ts'
 ];
 for(const path of files){
  const source=await readFile(join(root,path),'utf8');
  assert.doesNotMatch(source,forbidden,`deployed Edge function contains private source review: ${path}`);
 }
 const migrationRoot=join(root,'supabase/migrations');
 const migrations=(await readdir(migrationRoot)).filter(p=>p.endsWith('.sql'));
 assert.ok(migrations.length>0,'expected deployed migration inventory');
 for(const filename of migrations){
  const source=await readFile(join(migrationRoot,filename),'utf8');
  assert.doesNotMatch(source,
   /evidence_internal|record_review_bound|read_review_bound|revoke_bound_grant/,
   `prototype reviewer grant or decision authority leaked into deployed migration: ${filename}`);
 }
});
