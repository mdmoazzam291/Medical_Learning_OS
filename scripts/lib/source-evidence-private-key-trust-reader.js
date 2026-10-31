// TEST-ONLY READ BOUNDARY for a separate restricted PostgreSQL key-reader.
// No generic SQL, no credentials, no provider registration or network fallback.
const identifier=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const hex=/^[a-f0-9]{64}$/;
const statement='select evidence_private.key_state($1,$2,$3) as r';
function capture(value,keys){
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
     Reflect.ownKeys(value).length!==keys.length)return null;
  const result=Object.create(null);
  for(const key of keys){
   const desc=Object.getOwnPropertyDescriptor(value,key);
   if(!desc?.enumerable||!Object.hasOwn(desc,'value'))return null;
   result[key]=desc.value;
  }
  return result;
 }catch{return null;}
}
export function createSourceEvidencePrivateKeyTrustReader({query}){
 if(typeof query!=='function')throw new TypeError('private_key_reader_configuration_invalid');
 return async function getTrustState(input){
  const requested=capture(input,['providerId','recipientId','keySha256']);
  if(!requested||typeof requested.providerId!=='string'||!identifier.test(requested.providerId)||
     typeof requested.recipientId!=='string'||!identifier.test(requested.recipientId)||
     typeof requested.keySha256!=='string'||!hex.test(requested.keySha256))return null;
  let record;
  try{
   record=(await query(statement,[
    requested.providerId,requested.recipientId,requested.keySha256
   ]))?.rows?.[0]?.r;
  }catch{return null;}
  const state=capture(record,['providerId','recipientId','keySha256','epoch','enabled']);
  if(!state||state.providerId!==requested.providerId||
     state.recipientId!==requested.recipientId||state.keySha256!==requested.keySha256||
     !Number.isSafeInteger(state.epoch)||state.epoch<1||typeof state.enabled!=='boolean')
   return null;
  return Object.freeze({
   providerId:state.providerId,recipientId:state.recipientId,
   keySha256:state.keySha256,epoch:state.epoch,enabled:state.enabled
  });
 };
}
