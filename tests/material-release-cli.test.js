import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runConverter} from '../scripts/convert-material-release.js';
import {writeHandoff} from '../scripts/lib/material-release-files.js';
import {makeRelease,writeFixtureRelease} from './helpers/material-release.js';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'mlos-cli-'));t.after(()=>rm(root,{recursive:true,force:true}));const releaseDir=join(root,'release');await writeFixtureRelease(releaseDir,makeRelease());return{root,releaseDir};}
test('dry_run_zero_writes',async t=>{const {root,releaseDir}=await fixture(t),before=await readdir(root);const out=await runConverter({releaseDir,outDir:null,targetFile:null});assert.equal(out.state,'compatibility_pending');assert.equal(out.persistence,'persistence_pending');assert.deepEqual(await readdir(root),before);assert.equal((await readdir(join(releaseDir,'questions'))).length,1);});
test('dry_run_zero_network',async t=>{const {releaseDir}=await fixture(t);const old=globalThis.fetch;globalThis.fetch=()=>{throw new Error('unexpected network request');};t.after(()=>{globalThis.fetch=old;});assert.equal((await runConverter({releaseDir,outDir:null,targetFile:null})).chunks.length,1);});
test('unsupported_stage_flag',()=>{const p=spawnSync(process.execPath,['scripts/convert-material-release.js','--stage'],{encoding:'utf8'});assert.equal(p.status,2);assert.match(p.stderr,/invalid_arguments/);});
test('safe_console_codes',async t=>{const {releaseDir}=await fixture(t);await writeFile(join(releaseDir,'manifest.json'),'Private phrase SECRET_TOKEN not json');const p=spawnSync(process.execPath,['scripts/convert-material-release.js','--release',releaseDir,'--dry-run'],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(p.stderr.trim(),'invalid_json');assert.equal(p.stderr.includes('SECRET_TOKEN'),false);});
test('deterministic_output_reuse',async t=>{const {root,releaseDir}=await fixture(t),outDir=join(root,'out');const first=await runConverter({releaseDir,outDir,targetFile:null});assert.equal(first.output.reused,false);const manifest=await readFile(join(outDir,'handoff-manifest.json'),'utf8');const second=await runConverter({releaseDir,outDir,targetFile:null});assert.equal(second.output.reused,true);assert.equal(await readFile(join(outDir,'handoff-manifest.json'),'utf8'),manifest);assert.ok(await readFile(join(outDir,'COMPLETE.json'),'utf8'));});
test('interrupted_output_conflict',async t=>{const {root,releaseDir}=await fixture(t),outDir=join(root,'incomplete');await mkdir(outDir);await writeFile(join(outDir,'keep.txt'),'user data');await assert.rejects(runConverter({releaseDir,outDir,targetFile:null}),/output_conflict/);assert.equal(await readFile(join(outDir,'keep.txt'),'utf8'),'user data');});
test('failed output cannot get completion marker',async t=>{const {root,releaseDir}=await fixture(t);const handoff=await runConverter({releaseDir,outDir:null,targetFile:null});handoff.files.push({path:'../unsafe',bytes:'bad',sha256:'0'.repeat(64)});const outDir=join(root,'failed');await assert.rejects(writeHandoff(outDir,handoff),/unsafe_release_path/);await assert.rejects(readFile(join(outDir,'COMPLETE.json')),/ENOENT/);});
