import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRelease,readJsonFile,writeHandoff} from './lib/material-release-files.js';
import {mapRelease} from '../src/domain/material-release/mapping.js';
import {safeRelativePath} from '../src/domain/material-release/contract.js';
import {buildCorrectionProposals} from '../src/domain/material-release/corrections.js';
import {prepareMediaPackage} from '../src/domain/material-release/media-package.js';
import {mergeRoutedPackages} from '../src/domain/material-release/capabilities.js';
import {inspectImageFile} from './lib/material-media-files.js';
import {packMapped} from '../src/domain/material-release/packing.js';
export async function runConverter({releaseDir,outDir=null,targetFile=null}){
  const release=await readRelease(releaseDir),target=targetFile?await readJsonFile(targetFile):null;
  const mapped=mapRelease(release,{target}),base=packMapped(mapped);let media=null;
  if(release.assetsManifest){
    const assetFacts={};
    for(const f of release.assetsManifest.assetFiles??[]){safeRelativePath(f.path);const declared=release.manifest.files.find(x=>x.path===f.path&&x.kind==='asset');if(!declared||declared.sha256!==f.sha256||declared.bytes!==f.bytes)throw new TypeError('missing_media_asset');assetFacts[f.path]=await inspectImageFile(join(releaseDir,f.path));}
    media=prepareMediaPackage(release,{target,assetFacts,privacyEvidence:release.assetsManifest.privacyEvidence});
  }else if(mapped.routes.some(r=>r.kind==='media'))base.diagnostics.push({code:'missing_media_asset',recordId:null,path:null});
  const handoff=mergeRoutedPackages(base,{corrections:buildCorrectionProposals(release,mapped,target),media});
  handoff.sourceFiles=release.sourceFiles;
  if(outDir!==null)handoff.output=await writeHandoff(outDir,handoff);
  return handoff;
}
function args(values){
  const options={releaseDir:null,outDir:null,targetFile:null},seen=new Set();let dry=false;
  for(let i=0;i<values.length;i++){const key=values[i];if(seen.has(key))throw new TypeError('invalid_arguments');seen.add(key);if(key==='--dry-run'){dry=true;continue;}const prop={'--release':'releaseDir','--out':'outDir','--target':'targetFile'}[key];if(!prop||!values[i+1]||values[i+1].startsWith('--'))throw new TypeError('invalid_arguments');options[prop]=values[++i];}
  if(!options.releaseDir||dry&&options.outDir||!dry&&!options.outDir)throw new TypeError('invalid_arguments');return options;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let options;try{options=args(process.argv.slice(2));}catch{console.error('invalid_arguments');process.exitCode=2;}
  if(options)try{const r=await runConverter(options);console.log(JSON.stringify({state:r.state,persistence:r.persistence,chunks:r.chunks.length,routed:r.routes.length,excluded:r.excluded.length,reused:r.output?.reused??null}));}catch(e){console.error(e instanceof TypeError&&/^[a-z][a-z0-9_]+$/.test(e.message)?e.message:'conversion_failed');process.exitCode=1;}
}
