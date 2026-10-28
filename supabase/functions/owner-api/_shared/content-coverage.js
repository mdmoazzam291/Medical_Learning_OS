import {coveragePage,parseCoverageFilters} from '../../../../src/domain/content-coverage.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
export async function readContentCoverage({admin,actor,params,registryVersion}) {
 let filters;try{filters=parseCoverageFilters(params);}catch{fail(400,'coverage_filter_invalid');}
 const {data,error}=await admin.rpc('owner_content_coverage_snapshot_v1',{p_actor:actor,p_snapshot_id:filters.snapshot||null,p_registry_version:registryVersion});
 if(error){const message=String(error.message||'');if(message.includes('content_admin_required'))fail(403,'content_admin_required');if(message.includes('coverage_snapshot_expired'))fail(410,'coverage_snapshot_expired');fail(503,'coverage_snapshot_unavailable');}
 if(data?.registryVersion!==registryVersion)fail(503,'coverage_snapshot_unavailable');
 try{return coveragePage(data,filters);}catch{fail(503,'coverage_snapshot_invalid');}
}
