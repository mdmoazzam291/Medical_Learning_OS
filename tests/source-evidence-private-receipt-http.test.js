import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSourceEvidencePrivateReceiptHttpLookup} from '../scripts/lib/source-evidence-private-receipt-http.js';
import {createSourceEvidenceSignedAckLookup} from '../scripts/lib/source-evidence-private-signed-ack.js';
import {createSourceEvidencePrivateAckReconciler} from '../scripts/lib/source-evidence-private-authority-prototype.js';

const requestId='44444444-4444-4444-8444-444444444444';
const attemptId='55555555-5555-4555-8555-555555555555';
const digest='a'.repeat(64);
const task={requestId,attemptId,digest};
const providerId='receipt-provider.fixture';
const recipientId='source-review.queue';
const endpoint='https://receipts.example.test/v1/receipts/lookup';
const token='server-private-fixture-credential-012345';
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const raw={
 protocol:'mlos.delivery.ack.v1',providerId,recipientId,...task,
 providerReceiptId:'receipt-0001',status:'durable',occurredAt:'2026-11-01T00:00:00.000Z'
};
const toSign=r=>Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
 r.protocol,r.providerId,r.recipientId,r.requestId,r.attemptId,r.digest,
 r.providerReceiptId,r.status,r.occurredAt
]),'utf8');
const receipt={...raw,signature:sign(null,toSign(raw),privateKey).toString('base64url')};
const json=(data,options={})=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json'},...options
});
const create=(fetchImpl,overrides={})=>createSourceEvidencePrivateReceiptHttpLookup({
 endpoint,getCredential:async()=>token,fetchImpl,...overrides
});
const verified=transport=>createSourceEvidenceSignedAckLookup({
 fetchSignedReceipt:transport,trustedPublicKey:publicKey,providerId,recipientId
});

test('private HTTP lookup uses exact one-shot read-only protocol and signed proof',async()=>{
 let networkCalls=0,credentialCalls=0;
 const transport=create(async (url,request)=>{
  networkCalls++;
  assert.equal(url,endpoint);
  assert.equal(request.method,'POST');
  assert.equal(request.redirect,'error');
  assert.equal(request.cache,'no-store');
  assert.equal(request.credentials,'omit');
  assert.equal(request.referrerPolicy,'no-referrer');
  assert.equal(request.headers.authorization,`Bearer ${token}`);
  assert.equal(request.headers['content-type'],'application/json');
  assert.deepEqual(JSON.parse(request.body),task);
  assert.equal(request.signal.aborted,false);
  return json(receipt);
 },{getCredential:async()=>{credentialCalls++;return token;}});
 const proof=await verified(transport)(task);
 assert.equal(proof?.status,'durable');
 assert.match(proof.ackDigest,/^[0-9a-f]{64}$/);
 assert.equal(networkCalls,1);
 assert.equal(credentialCalls,1);
});

test('invalid URL configuration or untrusted input fails closed before reading secrets',async()=>{
 for(const bad of [
  'http://receipts.example.test/v1/receipts/lookup',
  'https://localhost/v1/receipts/lookup',
  'https://127.0.0.1/v1/receipts/lookup',
  'https://receipts.example.test:8443/v1/receipts/lookup',
  'https://receipts.example.test/v1/receipts/lookup?forward=evil',
  'https://attacker@receipts.example.test/v1/receipts/lookup',
  'https://receipts.example.test/dispatch',
  'https://receipts.local/v1/receipts/lookup'
 ])assert.throws(()=>create(async()=>json(receipt),{endpoint:bad}),
  /private_receipt_http_configuration_invalid/);
 let credentials=0,network=0;
 const transport=create(async()=>{network++;return json(receipt);},
  {getCredential:async()=>{credentials++;return token;}});
 const getter={requestId,attemptId};
 Object.defineProperty(getter,'digest',{enumerable:true,get(){
  throw Error('must not invoke caller-controlled accessor');
 }});
 for(const invalid of [getter,{...task,extra:'anything'},
  {...task,attemptId:'invalid'},null]){
  assert.equal(await transport(invalid),null);
 }
 assert.equal(credentials,0);assert.equal(network,0);
});

test('outage, redirect, invalid responses and overlarge bodies never become durable acknowledgements',async()=>{
 let networkCalls=0;
 const bad=[
  new Response(JSON.stringify(receipt),{status:302,headers:{
   location:'https://evil.example/v1/receipts/lookup',
   'content-type':'application/json'}}),
  new Response(null,{status:204}),
  new Response(JSON.stringify(receipt),{status:200,headers:{'content-type':'text/plain'}}),
  new Response('x'.repeat(9000),{status:200,headers:{'content-type':'application/json'}}),
  new Response(new Uint8Array([255]),{status:200,headers:{'content-type':'application/json'}}),
  new Response('not-json',{status:200,headers:{'content-type':'application/json'}})
 ];
 for(const response of bad){
  const lookup=verified(create(async()=>{networkCalls++;return response;}));
  assert.equal(await lookup(task),null);
 }
 assert.equal(networkCalls,bad.length);
 const lost=verified(create(async()=>{networkCalls++;throw Error('connection dropped');}));
 assert.equal(await lost(task),null);
 assert.equal(networkCalls,bad.length+1);
 let reads=0,requests=0;
 const noSecret=verified(create(async()=>{requests++;return json(receipt);},
  {getCredential:async()=>{reads++;throw Error('vault offline');}}));
 assert.equal(await noSecret(task),null);
 assert.equal(reads,1);assert.equal(requests,0);
 const weak=verified(create(async()=>{requests++;return json(receipt);},
  {getCredential:async()=>'short'}));
 assert.equal(await weak(task),null);
 assert.equal(requests,0);
});

test('simulated lost commit response: new reconciler verifies same signed receipt without redispatch',async()=>{
 let receiptLookups=0,acks=0,inspections=0;
 let persistedDigest=null,loseCommitReply=true;
 const transport=create(async(url,request)=>{
  assert.equal(url,endpoint);
  assert.deepEqual(JSON.parse(request.body),task);
  receiptLookups++;
  return json(receipt);
 });
 const query=async(sql,args)=>{
  if(sql.includes('inspect_intent(')){
   inspections++;
   assert.deepEqual(args,[requestId,digest]);
   return {rows:[{r:{status:'intent-found',attemptId,state:'uncertain'}}]};
  }
  assert.ok(sql.includes('record_ack('));
  acks++;
  assert.deepEqual(args.slice(0,3),[requestId,attemptId,digest]);
  if(persistedDigest!==null)assert.equal(args[3],persistedDigest);
  persistedDigest=args[3];
  if(loseCommitReply){loseCommitReply=false;throw Error('response lost after commit');}
  return {rows:[{r:{status:'acknowledgement-recorded'}}]};
 };
 const first=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:verified(transport),query
 });
 assert.deepEqual(await first.reconcile(task),{status:'uncertain'});
 assert.match(persistedDigest,/^[0-9a-f]{64}$/);
 // A new instance gets only the original durable attempt ID from readback.
 const restarted=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:verified(transport),query
 });
 assert.deepEqual(await restarted.recover({requestId,digest}),{status:'acknowledgement-recorded'});
 assert.equal(receiptLookups,2);assert.equal(inspections,1);assert.equal(acks,2);
});

test('deadline bounds credential retrieval even when credential store ignores abort',async()=>{
 let network=0,reads=0;
 const transport=create(async()=>{network++;return json(receipt);},{
  timeoutMs:500,getCredential:async()=>{
   reads++;return new Promise(()=>{});
  }
 });
 const started=Date.now();
 assert.equal(await transport(task),null);
 assert.ok(Date.now()-started>=400);
 assert.ok(Date.now()-started<3000);
 assert.equal(reads,1);assert.equal(network,0);
});

test('deadline bounds a fetch implementation that ignores cancellation and never retries',async()=>{
 let fetches=0;
 const transport=create(async(url,request)=>{
  fetches++;assert.equal(request.redirect,'error');assert.equal(request.signal.aborted,false);
  return new Promise(()=>{});
 },{timeoutMs:500});
 const started=Date.now();
 assert.equal(await transport(task),null);
 assert.ok(Date.now()-started>=400);
 assert.ok(Date.now()-started<3000);
 assert.equal(fetches,1);
});

test('deadline bounds a hung streaming body read and uncooperative stream cancellation',async()=>{
 let fetches=0,reads=0,cancels=0;
 const transport=create(async()=>{
  fetches++;
  return {
   status:200,headers:{get:()=> 'application/json'},
   body:{getReader:()=>({
    read:()=>{reads++;return new Promise(()=>{});},
    cancel:()=>{cancels++;return new Promise(()=>{});}
   })}
  };
 },{timeoutMs:500});
 const started=Date.now();
 assert.equal(await transport(task),null);
 assert.ok(Date.now()-started>=400);
 assert.ok(Date.now()-started<3000);
 assert.equal(fetches,1);assert.equal(reads,1);assert.equal(cancels,1);
});

test('a late credential result after deadline cannot start a request',async()=>{
 let release,network=0;
 const tokenPromise=new Promise(resolve=>{release=resolve;});
 const transport=create(async()=>{network++;return json(receipt);},{
  timeoutMs:500,getCredential:()=>tokenPromise
 });
 assert.equal(await transport(task),null);
 release(token);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(network,0);
});
