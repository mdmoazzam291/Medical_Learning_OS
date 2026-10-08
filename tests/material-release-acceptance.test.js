import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {runConverter} from '../scripts/convert-material-release.js';
import {validateImport} from '../src/domain/content-library.js';
import {makeRelease,makeQuestion,refreshRelease,writeFixtureRelease} from './helpers/material-release.js';
async function fixture(t,r){const d=await mkdtemp(join(tmpdir(),'mlos-acceptance-'));t.after(()=>rm(d,{recursive:true,force:true}));await writeFixtureRelease(join(d,'release'),r);return d;}
test('synthetic_release_to_valid_chunks',async t=>{const r=makeRelease();const d=await fixture(t,r);const original=await readFile(join(d,'release','manifest.json'),'utf8');const a=await runConverter({releaseDir:join(d,'release'),outDir:join(d,'handoff'),targetFile:null});const b=await runConverter({releaseDir:join(d,'release'),outDir:join(d,'handoff'),targetFile:null});assert.equal(a.chunks.length,1);assert.equal(b.output.reused,true);assert.deepEqual(a.chunks,b.chunks);for(const c of a.chunks){assert.doesNotThrow(()=>validateImport(JSON.parse(c.bytes)));assert.equal(createHash('sha256').update(c.bytes).digest('hex'),c.sha256);}assert.equal(await readFile(join(d,'release','manifest.json'),'utf8'),original);assert.equal(a.persistence,'persistence_pending');});
test('incomplete_or_mixed_release_reports_subset',async t=>{const r=makeRelease();const q=makeQuestion('image-q');q.app.classification.tasks=['image'];r.records.questions.push(q);r.manifest.eligibility.includedIds.push(q.recordId);refreshRelease(r);const d=await fixture(t,r);const out=await runConverter({releaseDir:join(d,'release'),outDir:null,targetFile:null});assert.equal(out.chunks.length,1);assert.equal(out.chunks[0].manifest.questions.length,1);assert.equal(out.routes.length,1);assert.equal(out.routes[0].recordId,'image-q');assert.equal(out.state,'delivery_blocked');assert.equal(r.records.questions[1].app.classification.tasks[0],'image');});
