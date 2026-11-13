#!/usr/bin/env python3
"""Reproduce editorial evidence accounting; never accepts clinical/canonical scope."""
import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
E = 'docs/evidence/'
PREFIX = E + '2026-11-13-nmc-'
INPUT_HEAD = '5252e41e94e8dada7db7f66d00fcf522899cfd72'
inputs = {}


def read(path):
    raw = (ROOT / path).read_bytes()
    inputs[path] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def ref(row):
    return row.get('referenceId', row.get('sourceReferenceId'))


def key(row):
    return (row['nameKey'], row.get('paediatricsReference') or row['paediatrics']['referenceId'],
            row.get('otherReference') or row['other']['referenceId'])


def build():
    index = read(E + '2026-11-08-nmc-foundation-names-only-index.json')
    by_ref = {}
    for name in index['names']:
        for appearance in name['appearances']:
            rid = ref(appearance)
            if rid in by_ref:
                require(by_ref[rid]['code'] == appearance['code'], 'Conflicting index code')
            by_ref[rid] = appearance
    proposals = read(PREFIX + 'paediatrics-cross-subject-relationship-proposals.json')['rows']
    paths = [PREFIX + 'paediatrics-provisional-reuse-decisions.json',
             PREFIX + 'paediatrics-unmatched-relationship-decisions.json']
    decisions = {}
    for path in paths:
        for row in read(path)['rows']:
            require(key(row) not in decisions, 'Duplicate decision pair')
            require(row['mappingAccepted'] is False, 'Unexpected accepted mapping')
            decisions[key(row)] = (path, row)
    require(len(proposals) == 22 and len({key(r) for r in proposals}) == 22, 'Proposal count/duplicates')
    require(set(decisions) == {key(r) for r in proposals}, 'Missing or extra decision pairs')
    holds = read(PREFIX + 'held-correction-source-verification-inventory.json')['rows']
    held_by_ref = {ref(r): r for r in holds}
    require(len(held_by_ref) == 154, 'Held inventory changed')
    rows = []
    for proposal in proposals:
        path, decision = decisions[key(proposal)]
        for endpoint in ('paediatrics', 'other'):
            item = proposal[endpoint]
            require(item['referenceId'] in by_ref, 'Unknown source reference')
            require(by_ref[item['referenceId']]['code'] == item['code'], 'Source code mismatch')
        if 'paediatrics' in decision:
            require(decision['paediatrics'] == proposal['paediatrics'] and
                    decision['other'] == proposal['other'], 'Decision endpoints changed')
        rows.append({**proposal, 'decisionEvidence': path,
                     'disposition': decision['disposition'],
                     'decisionRationale': decision['rationale'],
                     'provisionalCandidates': decision.get('candidates', []),
                     'openSourceScopeHolds': [held_by_ref[proposal[e]['referenceId']]
                                             for e in ('paediatrics', 'other')
                                             if proposal[e]['referenceId'] in held_by_ref],
                     'linkHeld': decision['disposition'] == 'hold-narrow-link',
                     'correctionAccepted': False, 'learnerActivation': False})
    reconciled = {'schemaVersion': 1, 'checkedHead': INPUT_HEAD, 'status': 'draft',
                  'method': 'Exact name and endpoint-reference join; no new semantic acceptance.',
                  'counts': dict(Counter(r['disposition'] for r in rows)),
                  'appearances': len(rows), 'rows': rows}

    packet_paths = sorted(set(
        str(p.relative_to(ROOT))
        for pattern in ('2026-11-12-nmc-*-source-scope-verification-batch-*.json',
                        '2026-11-13-nmc-*-source-scope-review-batch-*.json',
                        '2026-11-13-nmc-medicine-additional-appearance-review-*.json',
                        '2026-11-13-nmc-cross-subject-additional-appearance-review.json',
                        '2026-11-13-nmc-paediatrics-source-scope-review-*.json',
                        '2026-11-13-nmc-paediatrics-cross-subject-source-check.json')
        for p in (ROOT / E).glob(pattern)))
    evidence = defaultdict(list)
    for path in packet_paths + [PREFIX + 'source-alias-and-paediatrics-opening-review.json']:
        data = read(path)
        source_rows = data.get('rows', data.get('paediatricsOpening', []))
        for row in source_rows:
            rid = ref(row)
            require(rid in by_ref, f'Unindexed review reference: {path} {rid}')
            require(row['code'] == by_ref[rid]['code'], f'Review code mismatch: {path}')
            require(row.get('mappingAccepted', False) is False, 'Unexpected acceptance')
            evidence[rid].append(path)
    subjects = []
    pending_rows = []
    for subject in sorted({a['subjectId'] for a in by_ref.values()}):
        refs = {rid for rid, a in by_ref.items() if a['subjectId'] == subject}
        missing = refs - set(evidence)
        subjects.append({'subject': subject, 'indexedReferences': len(refs),
                         'referencesWithReviewEvidence': len(refs - missing),
                         'referencesWithoutSelectedReviewEvidence': len(missing),
                         'originalHeldReferences': len(refs & set(held_by_ref))})
        for rid in sorted(missing, key=lambda r: by_ref[r]['code']):
            pending_rows.append({**by_ref[rid], 'status': 'needs-review-evidence-reconciliation'})
    cohort = read(PREFIX + 'paediatrics-review-reconciliation.json')
    require(len(cohort['rows']) == cohort['indexedNames'] == 249, 'Paediatrics name count')
    pe_refs = {a['referenceId'] for row in cohort['rows'] for a in row['appearances']
               if a['subject'] == 'pediatrics'}
    require(len(pe_refs) == 252 and pe_refs <= set(evidence), 'Paediatrics evidence coverage')
    am = read(E + '2026-11-12-nmc-anatomy-medicine-expansion-queue.json')
    am_keys = {key for values in am['reviewGroups'].values() for key in values}
    am_refs = {a['referenceId'] for n in index['names'] if n['nameKey'] in am_keys
               for a in n['appearances']}
    require(len(am_keys) == 797 and len(am_refs) == 944, 'Anatomy/Medicine queue drift')
    require(am_refs <= set(evidence), 'Original Anatomy/Medicine queue lacks review evidence')
    historical = read(E + '2026-11-12-nmc-full-index-coverage-and-canonical-candidates.json')
    summary = {'schemaVersion': 1, 'checkedHead': INPUT_HEAD,
               'scope': 'Indexed source references linked to explicitly selected editorial review packets. Missing links are a reconciliation queue, not proof no older review exists. Review evidence is not acceptance.',
               'allSubjectsReviewed': all(s['referencesWithoutSelectedReviewEvidence'] == 0 for s in subjects),
               'indexedNames': len(index['names']), 'indexedReferences': len(by_ref),
               'referencesWithReviewEvidence': len(evidence),
               'originalHoldsStillOpen': len(held_by_ref),
               'originalAnatomyMedicineQueue': {'names': len(am_keys), 'references': len(am_refs),
                                               'referencesWithReviewEvidence': len(am_refs & set(evidence))},
               'historicalExactLabelNonmatches': historical['remainingNames'],
               'canonicalCandidateTrack': len(historical['previewCanonicalCandidates']),
               'subjects': subjects, 'pendingReferences': pending_rows,
               'reviewEvidence': dict(sorted(evidence.items())),
               'inputSha256': dict(sorted(inputs.items())),
               'verificationLimits': ['No fresh PDF-byte or visual source verification.',
                                      'No clinical, source-rights or canonical acceptance.',
                                      'No production, staging or learner publication changes.']}
    return {PREFIX + 'paediatrics-relationship-reconciliation.json': reconciled,
            PREFIX + 'provider-handoff-review-audit.json': summary}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    for path, value in build().items():
        content = json.dumps(value, indent=2, ensure_ascii=False) + '\n'
        if args.write:
            (ROOT / path).write_text(content)
        else:
            require((ROOT / path).read_text() == content, f'Stale audit: {path}; inspect inputs before --write')
        print(('Wrote ' if args.write else 'Verified ') + path)
