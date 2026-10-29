import {approvedCollectionPage,parseApprovedCollectionFilters} from '../../../../src/domain/approved-collection.js';
const fail=(status,code)=>{const e=new Error(code);e.status=status;e.code=code;throw e;};
export async function readApprovedCollection({admin,actor,params=new URLSearchParams()}) {
 let filters;try{filters=parseApprovedCollectionFilters(params);}catch{fail(400,'approved_collection_filters_invalid');}
 const {data,error}=await admin.rpc('owner_approved_collection_preflight_v1',{p_actor:actor});
 if(error)fail(String(error.message).includes('content_admin_required')?403:503,'approved_collection_unavailable');
 try{return approvedCollectionPage(data,filters);}catch{fail(503,'approved_collection_unavailable');}
}
