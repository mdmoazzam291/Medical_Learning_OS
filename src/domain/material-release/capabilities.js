import {stableJson,digestBytes} from './packing.js';
import {canonicalJson,fail} from './contract.js';
export function deliveryCapabilities(){return Object.freeze({textDraftStage:true,correctionStage:false,provenanceUpdate:false,mediaStage:false,publication:false});}
export function mergeRoutedPackages(handoff,{corrections=[],media=null}={}){
  const out=structuredClone(handoff);
  const add=(path,bytes)=>{if(out.files.some(f=>f.path===path))fail('duplicate_package_file');out.files.push({path,bytes,sha256:digestBytes(bytes)});};
  for(const kind of ['correction','provenance']){const proposals=corrections.filter(p=>p.kind===kind);if(proposals.some(p=>!['conflict',`${kind}_delivery_blocked`].includes(p.status)))fail('invalid_correction_package');if(proposals.length)add(`proposals/${kind==='correction'?'corrections':'provenance'}.jsonl`,proposals.map(canonicalJson).join('\n')+'\n');}
  if(media){if(media.status!=='media_delivery_blocked'||!Array.isArray(media.questionBindings)||!Array.isArray(media.diagnostics))fail('invalid_media_package');add('media/package.json',stableJson(media));}
  if(corrections.length||media||out.routes.length)out.state='delivery_blocked';
  out.capabilities=deliveryCapabilities();return out;
}
