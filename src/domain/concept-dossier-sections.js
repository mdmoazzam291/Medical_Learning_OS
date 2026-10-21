// Display only explicitly authored sections of a reviewed, versioned note.
// No medical inference, answer text or clinical assertion is generated here.
export const DOSSIER_SECTIONS = Object.freeze([
  {id:'understanding',label:'Essential understanding',pattern:/^(overview|definition|essentials?|key concepts?|summary)$/i},
  {id:'foundations',label:'Foundations & mechanisms',pattern:/^(foundations?|anatomy|physiology|pathology|pathophysiology|mechanisms?|etiology|aetiology|causes?|risk factors?|epidemiology)$/i},
  {id:'presentation',label:'Clinical presentation',pattern:/^(clinical presentation|presentation|symptoms?|signs?|clinical features?|history|physical examination|examination findings?)$/i},
  {id:'diagnosis',label:'Diagnostic reasoning',pattern:/^(diagnosis|diagnostic approach|diagnostic reasoning|investigations?|workup|evaluation|testing|test interpretation|interpretation)$/i},
  {id:'differentials',label:'Differential diagnosis',pattern:/^(differentials?|differential diagnosis|distinguishing features?|comparison)$/i},
  {id:'management',label:'Management',pattern:/^(management|treatment|therapy|therapeutics?|prevention|follow[- ]?up|prognosis|indications|contraindications)$/i},
  {id:'other',label:'Additional reviewed material',pattern:null}
]);
const validId = id => typeof id==='string' && id.length>0 && id.length<=160;
const heading = line => /^\s{0,3}#{1,4}\s+(.+?)\s*#*\s*$/.exec(line);
const normalizeHeading = s => String(s).replace(/[*_]/g,'').replace(/[:\s]+$/,'').trim();
const classify = s => DOSSIER_SECTIONS.find(g=>g.pattern?.test(normalizeHeading(s)))?.id || 'other';
export function groupReviewedNoteSections(notes=[],sources=[]) {
  const sourceMap=new Map((Array.isArray(sources)?sources:[]).filter(s=>validId(s?.sourceId)).map(s=>[s.sourceId,s]));
  const groups=DOSSIER_SECTIONS.map(({id,label})=>({id,label,items:[]}));
  const index=new Map(groups.map(g=>[g.id,g]));
  for(const note of Array.isArray(notes)?notes:[]){
    if(!validId(note?.noteVersionId)||typeof note.bodyMarkdown!=='string'||!note.bodyMarkdown.trim())continue;
    const sourceIds=[...new Set(Array.isArray(note.sourceIds)?note.sourceIds.filter(validId):[])];
    const sourceRecords=sourceIds.map(id=>sourceMap.get(id)).filter(Boolean).map(({sourceId,title,version})=>({sourceId,title,version}));
    let title='Unheaded reviewed content',groupId='other',lines=[];
    const emit=()=>{
      const body=lines.join('\n').trim();
      if(body)index.get(groupId).items.push({title,body,noteTitle:typeof note.title==='string'?note.title:'',noteVersionId:note.noteVersionId,sourceIds,sourceRecords,missingSourceIds:sourceIds.filter(id=>!sourceMap.has(id))});
      lines=[];
    };
    for(const line of note.bodyMarkdown.replace(/\r\n?/g,'\n').split('\n')){
      const m=heading(line);
      if(m && m[1].length<=120){emit();title=normalizeHeading(m[1]);groupId=classify(title);}
      else lines.push(line);
    }
    emit();
  }
  return groups.filter(g=>g.items.length);
}
