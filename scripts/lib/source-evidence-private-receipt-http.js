// INTERNAL OFFLINE-COMPATIBLE PROTOTYPE ONLY — NOT connected to a provider.
// A private server must supply the exact read-only provider API endpoint, a
// privileged server-side credential source and authenticated fetch transport.
// No browser input, request retries, alternate origins or dispatch supported.
import {isIP} from 'node:net';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hex=/^[a-f0-9]{64}$/;
const maxBytes=8192;

function snapshotRequest(value){
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
    Reflect.ownKeys(value).length!==3)return null;
  const out=Object.create(null);
  for(const key of ['requestId','attemptId','digest']){
   const desc=Object.getOwnPropertyDescriptor(value,key);
   if(!desc?.enumerable||!Object.hasOwn(desc,'value')||typeof desc.value!=='string')return null;
   out[key]=desc.value;
  }
  return uuid.test(out.requestId)&&uuid.test(out.attemptId)&&hex.test(out.digest)?out:null;
 }catch{return null;}
}
function pinnedEndpoint(value){
 if(typeof value!=='string')return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
     url.port||url.pathname!=='/v1/receipts/lookup'||!url.hostname||
     isIP(url.hostname)||url.hostname.startsWith('[')||
     /(^|\.)(localhost|local|internal)$/.test(url.hostname)||
     url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||
     url.hostname.endsWith('.internal')||!url.hostname.includes('.'))return null;
  return url.href;
 }catch{return null;}
}
async function readBoundedJson(response,signal){
 if(response?.status!==200||
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
     response?.headers?.get?.('content-type')??''))return null;
 const reader=response?.body?.getReader?.();
 if(!reader)return null;
 let size=0;const chunks=[];
 try{
  while(true){
   if(signal.aborted)return null;
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array)||value.byteLength===0)return null;
   size+=value.byteLength;
   if(size>maxBytes)return null;
   chunks.push(value);
  }
  if(size===0)return null;
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
 }catch{return null;}
 finally{try{await reader.cancel();}catch{}}
}
/**
 * Strict, one-shot read-only lookup protocol. POST is retrieval-only by
 * provider contract; it avoids logging identifiers in URL query strings.
 * The provider MUST independently guarantee this route has no side effects.
 * Never reuse this credential for dispatch or authorization of learners.
 */
export function createSourceEvidencePrivateReceiptHttpLookup({
 endpoint,getCredential,fetchImpl,timeoutMs=5000
}){
 const url=pinnedEndpoint(endpoint);
 if(!url||typeof getCredential!=='function'||typeof fetchImpl!=='function'||
    !Number.isInteger(timeoutMs)||timeoutMs<500||timeoutMs>10000)
  throw new TypeError('private_receipt_http_configuration_invalid');
 return async function fetchSignedReceipt(value){
  const req=snapshotRequest(value);
  if(!req)return null;
  let credential;
  try{credential=await getCredential();}
  catch{return null;}
  if(typeof credential!=='string'||credential.length<16||credential.length>4096||
     !/^[\x21-\x7e]+$/.test(credential))return null;
  const signal=AbortSignal.timeout(timeoutMs);
  try{
   const response=await fetchImpl(url,{
    method:'POST',redirect:'error',credentials:'omit',cache:'no-store',
    referrerPolicy:'no-referrer',signal,
    headers:Object.freeze({
     'authorization':`Bearer ${credential}`,
     'accept':'application/json','content-type':'application/json'
    }),
    body:JSON.stringify({requestId:req.requestId,attemptId:req.attemptId,digest:req.digest})
   });
   // One HTTP lookup; no retry after network, status or parse ambiguity.
   return await readBoundedJson(response,signal);
  }catch{return null;}
 };
}
