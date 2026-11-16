"""Build a canonical-concept batch (drafts for batch acceptance) from a subject spec.
Usage: python3 ops/nmc/build_concept_batch.py physiology_concepts_v1 docs/evidence/<out>.json
No official description text is written; objectives are repository drafts. Concept IDs are
assigned by the database on acceptance; objectives bind to them later via receipts."""
import json,sys,hashlib,importlib,glob,re,uuid
from pathlib import Path
R=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(R/'ops/nmc/specs'))
spec=importlib.import_module(sys.argv[1]); OUT=R/sys.argv[2]
cat=json.load(open(R/'data/nmc-reference-catalogue.json'))
meta={r['referenceId']:r for r in json.load(open(R/'data/nmc-competency-source-metadata.json'))['rows']}
byCode={}
for r in meta.values(): byCode.setdefault(r['printedCode'],[]).append(r)
draft={}
for f in sorted(glob.glob(str(R/'docs/evidence/*-draft-tasks.json'))):
    for x in json.load(open(f))['rows']: draft[x['referenceId']]=(x['draftLearningTask'],x['mode'],str(Path(f).relative_to(R)))
review={x['referenceId']:x for x in json.load(open(R/'docs/evidence/2026-11-16-nmc-interim-ai-review.json'))['rows']}
link_plan={}
for o in json.load(open(R/'docs/evidence/2026-11-04-nmc-spinal-cord-link-plan.json'))['objectiveLinks']:
    link_plan.setdefault(o['code'],[]).append(o['objective']['wording'])
rowsha={}
def _walk(x):
    if isinstance(x,dict):
        if x.get('referenceId') and isinstance(x.get('sourceBodySha256'),str) and len(x['sourceBodySha256'])==64: rowsha.setdefault(x['referenceId'],x['sourceBodySha256'])
        for v in x.values(): _walk(v)
    elif isinstance(x,list):
        for v in x: _walk(v)
for f in sorted(glob.glob(str(R/'docs/evidence/*.json')))+sorted(glob.glob(str(R/'data/*.json'))):
    try: _walk(json.load(open(f)))
    except Exception: pass
DEPTH={'K':'knows','KH':'knows-how','SH':'shows-how','P':'performs'}
TESTS=re.compile(r'(test|count|rate$|indices|haematocrit|sedimentation|electrocardiogram|electroencephalogram|cystometry|function tests)',re.I)
DISEASE={'Anaemia','Polycythaemia','Jaundice','Peptic ulcer disease','Gastro-oesophageal reflux disease','Vomiting','Diarrhoea','Constipation','Adynamic ileus','Hirschsprung disease','Shock','Syncope','Heart failure','Dyspnoea','Hypoxia','Cyanosis','Asphyxia','Drowning','Periodic breathing','Neuromuscular junction disorders','Myopathies','Peripheral nerve injury','Cardiac arrhythmias','Upper and lower motor neuron lesions','Spinal cord transection patterns','Deafness','Refractive errors','Fever','Cold injury','Heat stroke','Obesity','Metabolic syndrome','Infertility','Brain death'}
def level_code(lv):
    toks=re.findall(r'KH|SH|P|K',lv or '')
    order=['K','KH','SH','P']
    return max(toks,key=order.index) if toks else 'KH'
VERSION=getattr(spec,'VERSION','v1')
SUBJECT=getattr(spec,'SUBJECT','physiology'); SUBJECT_NAME=getattr(spec,'SUBJECT_NAME','Physiology'); BATCH_KIND=getattr(spec,'BATCH_KIND','pilot batch')
TESTS=re.compile(TESTS.pattern[:-1]+getattr(spec,'EXTRA_TEST_LABELS','')+')',re.I)
code_count={}
for c0 in spec.C:
    for k,_ in c0['links']: code_count[k]=code_count.get(k,0)+1
def review_flags(c,links,existing):
    f=[]
    if existing: f.append('reuses-accepted-identity')
    if any(code_count[k]>1 for k in links): f.append('split-source-row')
    if len(dict.fromkeys(links))>1: f.append('merges-source-rows')
    if c.get('umbrella'): f.append('umbrella')
    if c['label'] in getattr(spec,'RENAMED_TO',set()): f.append('renamed-from-v1')
    if c['label'] in getattr(spec,'ADDED',set()): f.append('new-split-in-v2')
    return f
concepts=[];objectives=[]
for c in spec.C:
    key='nmc-concept:'+hashlib.sha256((SUBJECT+'|'+c['label']).encode()).hexdigest()[:16]
    existing=spec.EXISTING.get(c['label'])
    links=[]
    for code,scope in c['links']:
        rs=byCode[code]; assert len(rs)==1,code; r=rs[0]; rid=r['referenceId']
        lv=level_code(r['level']); procedural=lv in('SH','P')
        if r.get('identifierState')=='standard' and 'amendment-notice' in r.get('uncertainty',[]) and scope is not None: wordings=[(scope,'official-replacement')]
        elif scope is not None: wordings=[(scope,'scoped-task-in-source-row')]
        elif code in link_plan: wordings=[(w,'scoped-task-in-source-row') for w in link_plan[code]]
        else:
            w=review[rid]['finalValue']['draftTask'] if rid in review else draft[rid][0]
            wordings=[(w,'literal-name-in-source-row')]
        mode=('performance-and-knowledge' if procedural else 'knowledge')
        if rid in review: mode=review[rid]['finalValue']['mode']
        elif rid in draft and scope is None: mode=draft[rid][1]
        task=c.get('task') or ('procedural-skill' if mode!='knowledge' and procedural else ('interpretation' if TESTS.search(c['label']) else 'mechanism'))
        for i,(w,basis) in enumerate(wordings):
            ov='lo:'+key.split(':')[1]+':'+task+':'+hashlib.sha256((rid+w).encode()).hexdigest()[:8]+'@1'
            objectives.append({'objectiveVersionId':ov,'conceptKey':key,'existingConceptId':existing,'referenceId':rid,'code':code,'task':task,'depth':DEPTH[lv],'mode':mode,'wording':w,'basis':basis,
              'sourcePage':r['pdfPages'][0],'sourceBodySha256':rowsha.get(rid),'descriptionSha256':r['descriptionSha256'],'status':'draft','authorship':'ai_generated_original'})
            links.append(code)
    subjects=[SUBJECT]+[s for s in c['extraSubjects'] if s!=SUBJECT]
    expected=None
    if getattr(spec,'EVIDENCED_SUBJECTS_ONLY',False):
        evidenced=list(dict.fromkeys(byCode[k][0]['subjectId'] for k,_ in c['links']))
        expected=[x for x in subjects if x not in evidenced]; subjects=evidenced
    legacy_domain='clinical-skill' if all(level_code(byCode[k][0]['level']) in('SH','P') for k,_ in c['links']) and not TESTS.search(c['label']) else ('pathophysiology' if c['label'] in DISEASE else ('laboratory-method' if TESTS.search(c['label']) else 'normal-function'))
    domains=[c['conceptType']]+(['umbrella'] if c.get('umbrella') else []) if 'conceptType' in c else [legacy_domain]
    tasks=sorted({o['task'] for o in objectives if o['conceptKey']==key})
    ev='; '.join(f"{code} p.{byCode[code][0]['pdfPages'][0]} {byCode[code][0]['referenceId']}" for code in dict.fromkeys(links))
    doc={'label':c['label'],'aliases':c['aliases'],'classification':{'subjects':subjects,'systems':[c['system']],'organs':list(c.get('organs',[])),'domains':domains,'tasks':tasks},
         'sourceEvidence':('NMC CBME 2024-09-12 (sha256 '+cat['sourceSha256'][:12]+'): '+ev)[:4000],
         'changeReason':SUBJECT_NAME+' '+BATCH_KIND+' '+VERSION+': canonical concept for NMC '+SUBJECT_NAME+' source rows; objectives bind after acceptance.'}
    item={'conceptKey':key,'existingConceptId':existing,'document':doc,'linkedCodes':list(dict.fromkeys(links))}
    if 'conceptType' in c: item.update({'conceptType':c['conceptType'],'umbrella':bool(c.get('umbrella')),'scoringUnit':not c.get('umbrella'),'reviewFlags':review_flags(c,links,existing)})
    if expected is not None: item['expectedSubjects']=expected
    concepts.append(item)
new=[c for c in concepts if not c['existingConceptId']]
batch={'schemaVersion':1,'batchId':'nmc-'+SUBJECT+'-concepts-'+VERSION+'-20261116','subjectId':SUBJECT,'sourceEdition':cat['edition'],'sourceSha256':cat['sourceSha256'],
 'status':'draft-batch-awaiting-admin-acceptance','attestation':'identity-and-classification-reviewed-not-medical-or-learner-release',
 'counts':{'concepts':len(concepts),'newConcepts':len(new),'reusedAcceptedIdentities':len(concepts)-len(new),'objectives':len(objectives),'sourceRows':len({o['referenceId'] for o in objectives})},
 'learnerActivation':False,'clinicalApproval':False,**({**({'supersedes':spec.SUPERSEDES} if hasattr(spec,'SUPERSEDES') else {}),'conceptTypes':list(spec.CONCEPT_TYPES),'counts':{**{'concepts':len(concepts),'newConcepts':len(new),'reusedAcceptedIdentities':len(concepts)-len(new),'objectives':len(objectives),'sourceRows':len({o['referenceId'] for o in objectives})},'umbrellas':sum(1 for c in concepts if c.get('umbrella')),'flagged':sum(1 for c in concepts if c.get('reviewFlags'))}} if hasattr(spec,'CONCEPT_TYPES') else {}),'concepts':concepts,'objectives':objectives}
OUT.write_text(json.dumps(batch,ensure_ascii=False,indent=1)+'\n')
print(batch['counts'])
