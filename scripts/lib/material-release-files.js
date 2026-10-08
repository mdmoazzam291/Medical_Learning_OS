import {readFile,lstat,realpath,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,sep,dirname} from 'node:path';
import {stableJson,digestBytes} from '../../src/domain/material-release/packing.js';
import {DATASETS,fail,safeRelativePath,canonicalJson,validateRelease} from '../../src/domain/material-release/contract.js';

export function parseStrictJson(input){
  if(typeof input!=='string')fail('invalid_json');let at=0;
  const ws=()=>{while(/[\t\n\r ]/.test(input[at]??'x'))at++;};
  function string(){const start=at++;let escaped=false;while(at<input.length){const ch=input[at++];if(!escaped&&ch==='"'){try{return JSON.parse(input.slice(start,at));}catch{fail('invalid_json');}}if(!escaped&&ch==='\\')escaped=true;else escaped=false;}fail('invalid_json');}
  function value(depth=0){
    if(depth>128)fail('json_depth_exceeded');ws();const ch=input[at];
    if(ch==='"')return string();
    if(ch==='{'){at++;const obj={},keys=new Set();ws();if(input[at]==='}'){at++;return obj;}while(true){ws();if(input[at]!=='"')fail('invalid_json');const key=string();if(keys.has(key))fail('duplicate_json_key');keys.add(key);ws();if(input[at++]!==':')fail('invalid_json');const v=value(depth+1);Object.defineProperty(obj,key,{value:v,writable:true,enumerable:true,configurable:true});ws();const end=input[at++];if(end==='}')return obj;if(end!==',')fail('invalid_json');}}
    if(ch==='['){at++;const a=[];ws();if(input[at]===']'){at++;return a;}while(true){a.push(value(depth+1));ws();const end=input[at++];if(end===']')return a;if(end!==',')fail('invalid_json');}}
    for(const [token,v] of [['true',true],['false',false],['null',null]])if(input.startsWith(token,at)){at+=token.length;return v;}
    const m=input.slice(at).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(m){at+=m[0].length;const n=Number(m[0]);if(!Number.isFinite(n))fail('invalid_json');return n;}fail('invalid_json');
  }
  const out=value();ws();if(at!==input.length)fail('invalid_json');return out;
}
function decode(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('encoding_invalid');}}
async function safeFile(root,path){
  safeRelativePath(path);const absolute=join(root,path);let check=root;
  for(const part of path.split('/')){check=join(check,part);let s;try{s=await lstat(check);}catch{fail('manifest_incomplete');}if(s.isSymbolicLink())fail('unsafe_release_path');}
  const s=await lstat(absolute);if(!s.isFile())fail('unsafe_release_path');const actual=await realpath(absolute);const r=relative(root,actual);if(r.startsWith('..'+sep)||r==='..'||r.startsWith(sep))fail('unsafe_release_path');return{absolute,size:s.size};
}
async function allFiles(root,prefix=''){const out=[];for(const entry of await readdir(join(root,prefix),{withFileTypes:true})){const p=prefix?prefix+'/'+entry.name:entry.name;if(entry.isSymbolicLink())fail('unsafe_release_path');if(entry.isDirectory())out.push(...await allFiles(root,p));else if(entry.isFile())out.push(p);else fail('unsafe_release_path');}return out;}
async function fileHash(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export async function readRelease(directory){
  let root;try{if((await lstat(resolve(directory))).isSymbolicLink())fail('unsafe_release_path');root=await realpath(resolve(directory));}catch(error){if(error instanceof TypeError)throw error;fail('release_directory_unavailable');}
  const mf=await safeFile(root,'manifest.json');if(mf.size>1048576)fail('manifest_too_large');
  const manifestBytes=await readFile(mf.absolute),manifest=parseStrictJson(decode(manifestBytes));
  if(manifest.releaseSchemaVersion!==1)fail('release_schema_unsupported');
  if(!Array.isArray(manifest.files))fail('manifest_incomplete');
  const paths=manifest.files.map(f=>safeRelativePath(f.path));if(new Set(paths).size!==paths.length||paths.includes('manifest.json'))fail('manifest_file_invalid');
  for(const path of ['schema.json','changes.jsonl','validation.md','INGESTION.md'])if(!paths.includes(path))fail('manifest_incomplete');
  const actual=await allFiles(root);if(actual.some(p=>p!=='manifest.json'&&!paths.includes(p)))fail('undeclared_file');
  const text={};let total=0;
  for(const f of manifest.files){const info=await safeFile(root,f.path);if(info.size!==f.bytes||await fileHash(info.absolute)!==f.sha256)fail('file_hash_mismatch');if(f.kind!=='asset'){total+=info.size;if(info.size>16777216||total>67108864)fail('release_metadata_too_large');text[f.path]=decode(await readFile(info.absolute));}}
  const expectedSchema=parseStrictJson(await readFile(new URL('../../docs/material-release-schema-v1.json',import.meta.url),'utf8'));
  if(canonicalJson(parseStrictJson(text['schema.json']))!==canonicalJson(expectedSchema))fail('release_schema_definition_mismatch');
  parseJsonl(text['changes.jsonl']);
  const records={};for(const k of DATASETS){const p=`records/${k}.jsonl`;if(!Object.hasOwn(text,p)&&manifest.counts?.[k]!==0)fail('manifest_incomplete');records[k]=Object.hasOwn(text,p)?parseJsonl(text[p]):[];}
  const release={manifest,records,markdown:Object.fromEntries(Object.entries(text).filter(([p])=>p.endsWith('.md'))),assetsManifest:Object.hasOwn(text,'assets-manifest.json')?parseStrictJson(text['assets-manifest.json']):null};
  validateRelease(release);Object.defineProperty(release,'sourceFiles',{value:[{path:'manifest.json',sha256:digestBytes(manifestBytes),bytes:manifestBytes.length},...manifest.files.map(({path,sha256,bytes})=>({path,sha256,bytes}))]});return release;
}
function parseJsonl(text){if(typeof text!=='string')fail('manifest_incomplete');if(text==='')return [];return text.replace(/\r?\n$/,'').split(/\r?\n/).map(line=>{if(!line.trim())fail('invalid_jsonl');const row=parseStrictJson(line);if(!row||typeof row!=='object'||Array.isArray(row))fail('invalid_jsonl');return row;});}
export async function readJsonFile(path){const stat=await lstat(path);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>16777216)fail('input_file_invalid');return parseStrictJson(decode(await readFile(path)));}
export function handoffManifest(handoff){return {contractId:'mlos-material-handoff-v1',releaseId:handoff.releaseId,releaseDigest:handoff.releaseDigest,adapterVersion:handoff.adapterVersion,state:handoff.state,persistence:'persistence_pending',...(handoff.sourceFiles?{sourceFiles:handoff.sourceFiles}:{}),chunks:handoff.chunks.map(c=>({importId:c.importId,path:`imports/${c.importId}.json`,sha256:c.sha256,recordIds:c.recordIds})),files:handoff.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.bytes),sha256:f.sha256}))};}
export async function verifyHandoffDirectory(directory){
  const root=await realpath(resolve(directory));if((await lstat(resolve(directory))).isSymbolicLink())fail('unsafe_release_path');
  const mf=await safeFile(root,'handoff-manifest.json'),bytes=await readFile(mf.absolute),manifest=parseStrictJson(decode(bytes));
  if(manifest.contractId!=='mlos-material-handoff-v1'||!Array.isArray(manifest.files))fail('handoff_manifest_invalid');
  const complete=parseStrictJson(decode(await readFile((await safeFile(root,'COMPLETE.json')).absolute)));
  if(complete.manifestSha256!==digestBytes(bytes))fail('file_hash_mismatch');
  const paths=new Set(['handoff-manifest.json','COMPLETE.json']);
  for(const f of manifest.files){safeRelativePath(f.path);if(paths.has(f.path))fail('handoff_manifest_invalid');paths.add(f.path);const info=await safeFile(root,f.path);if(info.size!==f.bytes||await fileHash(info.absolute)!==f.sha256)fail('file_hash_mismatch');}
  if((await allFiles(root)).some(p=>!paths.has(p)))fail('undeclared_file');return manifest;
}
export async function writeHandoff(directory,handoff){
  const root=resolve(directory),paths=new Set(['handoff-manifest.json','COMPLETE.json']);
  for(const f of handoff.files){safeRelativePath(f.path);if(paths.has(f.path))fail('handoff_manifest_invalid');paths.add(f.path);if(typeof f.bytes!=='string'||digestBytes(f.bytes)!==f.sha256)fail('file_hash_mismatch');}
  const expected=handoffManifest(handoff);
  try{await mkdir(root);}catch(e){if(e.code!=='EEXIST')fail('output_write_failed');try{const existing=await verifyHandoffDirectory(root);if(canonicalJson(existing)!==canonicalJson(expected))fail('output_conflict');return{reused:true};}catch{fail('output_conflict');}}
  try{
    for(const f of handoff.files){await mkdir(dirname(join(root,f.path)),{recursive:true});await writeFile(join(root,f.path),f.bytes,{flag:'wx'});}
    const manifestBytes=stableJson(expected);await writeFile(join(root,'handoff-manifest.json'),manifestBytes,{flag:'wx'});
    await writeFile(join(root,'COMPLETE.json'),stableJson({manifestSha256:digestBytes(manifestBytes)}),{flag:'wx'});
    return{reused:false};
  }catch{fail('output_write_failed');}
}
