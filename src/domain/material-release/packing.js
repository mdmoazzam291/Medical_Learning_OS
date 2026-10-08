import {createHash} from 'node:crypto';
import {validateImport} from '../content-library.js';
import {canonicalJson,fail} from './contract.js';
export const stableJson=value=>JSON.stringify(JSON.parse(canonicalJson(value)),null,2)+'\n';
export const digestBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const limits={concepts:200,sources:200,questions:100,notes:100,noteQuestionLinks:500};
export function payloadWithinLimits(manifest){return Object.entries(limits).every(([key,max])=>Array.isArray(manifest[key])&&manifest[key].length<=max)&&Buffer.byteLength(stableJson(manifest),'utf8')<=1048576;}
function index(rows,key){const map=new Map();for(const row of rows){const id=row[key];if(map.has(id)&&canonicalJson(map.get(id))!==canonicalJson(row))fail('dependency_identity_conflict');map.set(id,row);}return map;}
export function packMapped(mapped){
  const concepts=index(mapped.concepts,'conceptId'),sources=index(mapped.sources,'sourceId'),questions=index(mapped.questions,'questionId'),notes=index(mapped.notes,'noteId');
  const links=mapped.noteQuestionLinks??[],parents=new Map([...questions.keys(),...notes.keys()].map(id=>[id,id]));
  const find=id=>{let at=id;while(parents.get(at)!==at)at=parents.get(at);return at;};
  for(const l of links){if(!notes.has(l.noteId))fail('note_link_invalid');if(!questions.has(l.questionId))fail('external_question_dependency_unsupported');const a=find(l.noteId),b=find(l.questionId);if(a!==b)parents.set(a,b);}
  const groups=new Map();for(const id of [...parents.keys()].sort()){const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);}
  const components=[...groups.values()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0),chunks=[],diagnostics=[...(mapped.diagnostics??[])],excluded=[...(mapped.excluded??[])];
  function manifestFor(ids){
    const qs=ids.filter(id=>questions.has(id)).map(id=>questions.get(id)),ns=ids.filter(id=>notes.has(id)).map(id=>notes.get(id));
    const cs=[...new Set([...qs.flatMap(q=>q.conceptLinks.map(l=>l.conceptId)),...ns.map(n=>n.conceptId)])].sort(),ss=[...new Set([...qs,...ns].flatMap(q=>q.sourceIds))].sort();
    if(cs.some(id=>!concepts.has(id)))fail('concept_unknown');if(ss.some(id=>!sources.has(id)))fail('source_unknown');
    const m={schemaVersion:qs.some(q=>q.intelligence)?2:1,importId:'mlos-'+digestBytes(canonicalJson([mapped.releaseDigest,mapped.adapterVersion,ids])),concepts:cs.map(id=>concepts.get(id)),sources:ss.map(id=>sources.get(id)),questions:qs,notes:ns,noteQuestionLinks:links.filter(l=>ids.includes(l.noteId)).sort((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1)};
    return structuredClone(m);
  }
  function finish(ids){if(!ids.length)return;const manifest=manifestFor(ids);validateImport(manifest);const bytes=stableJson(manifest);if(!payloadWithinLimits(manifest))fail('batch_size_invalid');chunks.push({importId:manifest.importId,manifest,bytes,sha256:digestBytes(bytes),recordIds:ids});}
  let current=[];
  for(const component of components){
    if(!payloadWithinLimits(manifestFor(component))){diagnostics.push({code:'component_too_large',recordId:component[0],path:null});excluded.push(...component.map(recordId=>({recordId,reason:'component_too_large'})));continue;}
    const next=[...current,...component].sort();if(current.length&&!payloadWithinLimits(manifestFor(next))){finish(current);current=[...component];}else current=next;
  }
  finish(current);if(!chunks.length)diagnostics.push({code:'empty_eligible_import',recordId:null,path:null});
  const routes=[...(mapped.routes??[])].sort((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1);
  const out={releaseId:mapped.releaseId,releaseDigest:mapped.releaseDigest,adapterVersion:mapped.adapterVersion,chunks,files:[],routes,excluded,diagnostics,state:routes.length||excluded.some(x=>x.reason!=='duplicate_to_canonical')||!chunks.length?'delivery_blocked':'compatibility_pending',persistence:'persistence_pending'};
  function add(path,bytes){out.files.push({path,bytes,sha256:digestBytes(bytes)});}
  for(const c of chunks)add(`imports/${c.importId}.json`,c.bytes);
  add('routes.jsonl',routes.map(canonicalJson).join('\n')+(routes.length?'\n':''));add('exclusions.jsonl',excluded.map(canonicalJson).join('\n')+(excluded.length?'\n':''));
  add('mapping.json',stableJson({releaseId:mapped.releaseId,records:mapped.recordMap??[],chunks:chunks.map(c=>({importId:c.importId,recordIds:c.recordIds}))}));
  add('validation.md',`# Structural validation\n\nState: ${out.state}\nPersistence: persistence_pending\nChunks: ${chunks.length}\nRouted: ${routes.length}\nExcluded: ${excluded.length}\n\n${diagnostics.map(d=>'- '+d.code).join('\n')}\n\nNo clinical, human-review, storage, staging or publication claim.\n`);
  add('INGESTION.md','# Handoff\n\nArchive this exact package and the original portable release before separately authorized delivery. imports/*.json are text drafts for the current content-library inbox; routes.jsonl is not an import manifest. Review corrections and media separately. A local validation is not a target dry run, stage or publication.\n');
  return out;
}
