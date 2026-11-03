"""Rebuild a planning/readiness snapshot from exact repository evidence.

This pre-acceptance register is not a clinical approval system or release gate.
Closing a package requires actual acceptance evidence and a reviewed successor
contract; editing a status to complete cannot certify the foundation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

from amendment_projection import SOURCES, validate_metadata
from codecell_inventory import canonical
from review_package import no_duplicates

TASK_IDS={'source-row-reconciliation','global-supplement-scope','current-cohort-applicability',
          'qualified-source-clinical-review','reuse-rights','canonical-concept-bindings',
          'exam-overlay-review','registry-integration','admin-acceptance','learner-acceptance',
          'stack-staging','production-release'}


def load(path):
    def reject(value):raise ValueError('nonfinite_json')
    return json.loads(path.read_bytes(),object_pairs_hook=no_duplicates,parse_constant=reject)


def validate_register(value):
    if not isinstance(value,dict) or value.get('kind')!='nmc-foundation-completion-work-packages':raise ValueError('register_kind')
    if type(value.get('schemaVersion')) is not int or value['schemaVersion']!=1:raise ValueError('register_version')
    for key in ['completeCoverageClaim','learnerActivation']:
        if value.get(key) is not False:raise ValueError('unapproved_register')
    if value.get('atomicRemainingTaskCount') is not None or value.get('countingUnit')!='major_work_package_not_atomic_task_or_competency':raise ValueError('counting_unit')
    tasks=value.get('tasks')
    if not isinstance(tasks,list) or len(tasks)!=12 or any(not isinstance(t,dict) for t in tasks):raise ValueError('task_count')
    ids=[t.get('id') for t in tasks]
    if any(not isinstance(i,str) for i in ids) or set(ids)!=TASK_IDS or len(set(ids))!=12:raise ValueError('task_identity')
    graph={}
    for task in tasks:
        if task.get('status') not in ['open','in_progress','blocked']:raise ValueError('unsupported_completion')
        dependencies=task.get('dependsOn')
        if not isinstance(dependencies,list) or any(not isinstance(d,str) or d not in TASK_IDS for d in dependencies) or len(set(dependencies))!=len(dependencies):raise ValueError('task_dependencies')
        for key in ['title','ownerClass','acceptanceCriteria']:
            if not isinstance(task.get(key),str) or not task[key].strip():raise ValueError('missing_task_context')
        graph[task['id']]=dependencies
    def walk(node,path):
        if node in path:raise ValueError('cyclic_dependencies')
        for dependency in graph[node]:walk(dependency,path|{node})
    for node in graph:walk(node,set())
    return True


def registry_counts(js):
    match=re.fullmatch(r'\s*export default\s+(\{.*\})\s*;\s*',js,re.S)
    if not match:raise ValueError('registry_format_changed')
    registry=json.loads(match.group(1),object_pairs_hook=no_duplicates)
    keys={'schemaVersion','registryVersion','pathways','objectives','mappings','artifacts'}
    if not isinstance(registry,dict) or set(registry)!=keys or type(registry['schemaVersion']) is not int or registry['schemaVersion']!=1:
        raise ValueError('registry_shape')
    if not isinstance(registry['registryVersion'],str) or not registry['registryVersion'].strip():raise ValueError('registry_version')
    for key in ['pathways','objectives','mappings','artifacts']:
        if not isinstance(registry[key],list) or any(not isinstance(row,dict) for row in registry[key]):raise ValueError('registry_row_collection')
    return {key:len(registry[key]) for key in ['objectives','mappings','artifacts']}


def build_report(root):
    root=Path(root);e=root/'docs/evidence'
    register=load(e/'nmc-foundation-completion-register-v1.json');validate_register(register)
    cases=load(e/'nmc-source-adjudication-packet.json')['cases']
    pages=load(e/'nmc-source-page-dispositions.json')['documents']
    freshness=load(e/'nmc-source-freshness-2026-11-03.json')
    overlay=load(e/'nmc-october-clarification-projection-v1.json');validate_metadata(overlay)
    screen_path=e/freshness['archiveScreen']['path']
    if hashlib.sha256(screen_path.read_bytes()).hexdigest()!=freshness['archiveScreen']['sha256']:raise ValueError('stale_archive_binding')
    for source in freshness['primaryDownloads']:
        if source['sha256']!=SOURCES[source['id']]['sha256'] or source['matchesPinnedSource'] is not True:raise ValueError('changed_primary_source')
    if freshness['allCompetenciesLatestCertified'] is not False or freshness['fullCurrentRuleApplicabilityReconciled'] is not False or freshness['learnerActivation'] is not False:raise ValueError('unapproved_freshness')
    js=(root/'data/preparation-curriculum.js').read_text()
    counts=registry_counts(js)
    paths=['docs/evidence/nmc-foundation-completion-register-v1.json',
           'docs/evidence/nmc-source-adjudication-packet.json','docs/evidence/nmc-source-page-dispositions.json',
           'docs/evidence/nmc-source-freshness-2026-11-03.json','docs/evidence/nmc-official-archive-screen-2026-11-03.json',
           'docs/evidence/nmc-october-clarification-projection-v1.json','data/preparation-curriculum.js']
    return {'schemaVersion':1,'kind':'nmc-foundation-preacceptance-readiness-snapshot',
            'checkedAt':freshness['checkedAt'],'remainingMajorWorkPackages':len(register['tasks']),
            'countingUnit':register['countingUnit'],'atomicRemainingTaskCount':None,
            'pendingSourceCases':sum(c['status']=='pending' for c in cases),
            'pendingPageDispositions':sum(p['reviewStatus']=='pending' for d in pages for p in d['pages']),
            'registryRows':counts,
            'latestIndexedCurriculumDate':freshness['regulationsIndex']['listedCurriculumDate'],
            'knownAmendmentClausesLocated':len(overlay['clauses']),
            'allCompetenciesLatestCertified':False,'foundationComplete':False,'learnerActivation':False,
            'bindings':[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in paths]}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2])
    p.add_argument('--verify',type=Path);p.add_argument('--out',type=Path);args=p.parse_args();report=build_report(args.root)
    if args.verify and canonical(load(args.verify))!=canonical(report):raise ValueError('stale_readiness_snapshot')
    if args.out:
        with args.out.open('x') as f:f.write(canonical(report)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='bindings'}))


if __name__=='__main__':main()
