export const profile = {schemaVersion:1,pathwayIds:['neet-pg','ini-cet'],primaryPathwayId:'neet-pg'};
export function curriculum() {
  const requirement = (id,path,objective,status='approved') => ({mappingId:id,pathwayVersionId:path+'@1',objectiveVersionId:objective,status,evidence:{kind:'expert',sourceId:'synthetic-source',sourceVersion:'1'},reviewedBy:status==='approved'?'synthetic-reviewer':null});
  const objective = (name,prerequisites=[]) => ({objectiveId:name,objectiveVersionId:name+'@1',conceptId:name,task:'interpret',depth:'foundation',context:{jurisdiction:'IN',population:'synthetic',setting:'synthetic'},prerequisites});
  const artifact = (kind,id,objective,role) => ({artifactKind:kind,artifactVersionId:id,objectiveVersionIds:[objective+'@1'],role,status:'approved',reviewedBy:'synthetic-reviewer',familyId:kind==='question'?'family-'+id:null});
  return {schemaVersion:1,registryVersion:'synthetic@1',pathways:[
    {pathwayId:'neet-pg',pathwayVersionId:'neet-pg@1',label:'NEET-PG',status:'active'},
    {pathwayId:'ini-cet',pathwayVersionId:'ini-cet@1',label:'INI-CET',status:'active'},
    {pathwayId:'future',pathwayVersionId:'future@1',label:'Future exam',status:'planned'}],
    objectives:[objective('shared',['foundation@1']),objective('foundation'),objective('neet-only'),objective('ini-only')],
    mappings:[requirement('n-shared','neet-pg','shared@1'),requirement('i-shared','ini-cet','shared@1'),requirement('n-only','neet-pg','neet-only@1'),requirement('i-only','ini-cet','ini-only@1')],
    artifacts:[artifact('question','shared-q@1','shared','assessment'),artifact('question','n-q@1','neet-only','assessment'),artifact('question','i-q@1','ini-only','assessment'),artifact('question','f-q@1','foundation','assessment'),artifact('note','shared-note@1','shared','teaching')]};
}
export function library() {
  return {concepts:['shared','foundation','neet-only','ini-only','other'].map(conceptId=>({conceptId,label:conceptId,classification:{subjects:['medicine'],systems:[],organs:[],domains:[],tasks:[]}})),
    questions:['shared-q','n-q','i-q','f-q','other-q'].map((questionId,i)=>({questionId,questionVersionId:questionId+'@1',stem:questionId,options:[],classification:{subjects:['medicine'],systems:[],organs:[],domains:[],tasks:[]},observed:{attempts:0,wrong:0,state:'unattempted'},conceptLinks:[{conceptId:['shared','neet-only','ini-only','foundation','other'][i],role:'primary'}],origins:[],home:{kind:'pyq',exams:['unrelated-exam'],platforms:[]}})),
    notes:[{noteVersionId:'shared-note@1',conceptId:'shared',title:'Shared note',bodyMarkdown:'Synthetic teaching only.'},{noteVersionId:'unbound-note@1',conceptId:'shared',title:'Unbound shared note',bodyMarkdown:'Synthetic unbound content.'}],sources:[],links:[]};
}
