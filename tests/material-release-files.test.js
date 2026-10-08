import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,symlink,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseStrictJson,readRelease} from '../scripts/lib/material-release-files.js';
import {makeRelease,writeFixtureRelease,sha} from './helpers/material-release.js';
async function fixture(t){const d=await mkdtemp(join(tmpdir(),'mlos-release-'));t.after(()=>rm(d,{recursive:true,force:true}));await writeFixtureRelease(d,makeRelease());return d;}
async function editManifest(d,fn){const p=join(d,'manifest.json');const m=JSON.parse(await readFile(p,'utf8'));fn(m);await writeFile(p,JSON.stringify(m));}
test('escaped_duplicate_keys',()=>assert.throws(()=>parseStrictJson(String.raw`{"id":1,"\u0069d":2}`,'manifest.json'),/duplicate_json_key/));
test('strict JSON supports nested data and prototype-like keys without pollution',()=>{const r=parseStrictJson('{"__proto__":{"safe":1},"array":[true,null,-1.25e2,"a\\n"]}');assert.equal(Object.hasOwn(r,'__proto__'),true);assert.equal({}.safe,undefined);assert.deepEqual(r.array,[true,null,-125,'a\n']);for(const raw of ['01','{"a":1,}','[1,]','{"a":Infinity}','true false'])assert.throws(()=>parseStrictJson(raw),/invalid_json/);});
test('safe valid release reads exact options and evidence',async t=>{const r=await readRelease(await fixture(t));assert.deepEqual(r.records.questions[0].app.options,[{optionId:'first',text:'Circle'},{optionId:'second',text:'Square'}]);});
test('unsafe_paths',async t=>{const d=await fixture(t);await editManifest(d,m=>m.files[0].path='../escape.json');await assert.rejects(readRelease(d),/unsafe_release_path/);});
test('symlink_escape',async t=>{const d=await fixture(t);const p=join(d,'validation.md');await unlink(p);await symlink('/etc/hosts',p);await assert.rejects(readRelease(d),/unsafe_release_path/);});
test('incomplete_manifest',async t=>{const d=await fixture(t);await editManifest(d,m=>m.files=m.files.filter(f=>f.path!=='INGESTION.md'));await assert.rejects(readRelease(d),/manifest_incomplete/);});
test('hash_mismatch',async t=>{const d=await fixture(t);await writeFile(join(d,'validation.md'),'changed bytes');await assert.rejects(readRelease(d),/file_hash_mismatch/);});
test('invalid_utf8',async t=>{const d=await fixture(t);const p='validation.md',bytes=Buffer.from([0xc3,0x28]);await writeFile(join(d,p),bytes);await editManifest(d,m=>{const f=m.files.find(f=>f.path===p);f.bytes=bytes.length;f.sha256=sha(bytes);});await assert.rejects(readRelease(d),/encoding_invalid/);});
test('undeclared executable and malformed JSONL rejected',async t=>{const d=await fixture(t);await writeFile(join(d,'run.js'),'throw new Error("never execute")');await assert.rejects(readRelease(d),/undeclared_file/);await unlink(join(d,'run.js'));const p='records/questions.jsonl',raw='{"recordId":"a","recordId":"b"}\n';await writeFile(join(d,p),raw);await editManifest(d,m=>{const f=m.files.find(f=>f.path===p);f.bytes=Buffer.byteLength(raw);f.sha256=sha(raw);});await assert.rejects(readRelease(d),/duplicate_json_key/);});
