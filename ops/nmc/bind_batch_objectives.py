"""Bind a concept batch's objectives to database-assigned concept IDs from acceptance receipts.
Usage: python3 ops/nmc/bind_batch_objectives.py <batch.json> <ids.txt> <pairs_sha256> <acceptedAt> <out.json>
ids.txt holds the receipt concept UUIDs in receipt order (the order of new concepts in the batch).
pairs_sha256 is computed in the database over 'conceptKey|conceptId' lines in receipt order; this
script recomputes it, so a wrong order or a mistyped ID fails. Identity digests stay in the database
receipt (content_concept_batch_acceptances). Binding is not clinical approval or learner release."""
import json,sys,hashlib,re
from pathlib import Path
R=Path(__file__).resolve().parents[2]
bp,ip,want,at,out=sys.argv[1:6]
raw=(R/bp).read_bytes(); b=json.loads(raw)
ids=['C-'+x for x in (R/ip).read_text().strip().split(',')]
new=[c for c in b['concepts'] if not c['existingConceptId']]
assert len(ids)==len(new)==len(set(ids)) and all(re.fullmatch(r'C-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}',i) for i in ids)
got=hashlib.sha256('\n'.join(c['conceptKey']+'|'+i for c,i in zip(new,ids)).encode()).hexdigest()
assert got==want,('receipt pairs digest mismatch',got)
cid={c['conceptKey']:i for c,i in zip(new,ids)}
for c in b['concepts']:
    if c['existingConceptId']: cid[c['conceptKey']]=c['existingConceptId']
concepts=[{'conceptKey':c['conceptKey'],'conceptId':cid[c['conceptKey']],'label':c['document']['label'],
 'identitySource':'existing-accepted-identity' if c['existingConceptId'] else 'batch-acceptance-receipt'} for c in b['concepts']]
objs=[{'objectiveVersionId':o['objectiveVersionId'],'conceptId':cid[o['conceptKey']],'conceptKey':o['conceptKey'],'referenceId':o['referenceId'],
 'code':o['code'],'task':o['task'],'depth':o['depth'],'mode':o['mode'],'status':'draft'} for o in b['objectives']]
doc={'schemaVersion':1,'bindingId':b['batchId']+':objective-bindings@1','batchId':b['batchId'],'batchSha256':hashlib.sha256(raw).hexdigest(),
 'acceptance':{'table':'content_concept_batch_acceptances','acceptedAt':at,'itemCount':len(ids),'receiptPairsSha256':want},
 'status':'bound-draft-not-in-objective-registry','learnerActivation':False,'clinicalApproval':False,
 'counts':{'concepts':len(concepts),'objectives':len(objs)},'concepts':concepts,'objectives':objs}
(R/out).write_text(json.dumps(doc,ensure_ascii=False,indent=1)+'\n'); print(doc['counts'],got)
