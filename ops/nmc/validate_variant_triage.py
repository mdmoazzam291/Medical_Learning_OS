"""Validate AI triage evidence bindings; never an approval importer."""
import hashlib
import json
from pathlib import Path
import sys

from codecell_inventory import ELIGIBILITY, canonical, digest

FILES = ('nmc-aetcom-module-appendix-comparison-v1.json',
         'nmc-aetcom-appendix-locators-v1.json', 'nmc-aetcom-list-marker-comparison-v1.json')
KINDS = {'orthographic_variant', 'punctuation_variant', 'conjunction_variant',
         'grammatical_variant', 'terminology_conflict', 'scope_action_difference'}


def require(value):
    if not value: raise ValueError('invalid_or_stale_ai_variant_triage')


def validate(packet, inputs):
    require(set(inputs) == set(FILES))
    require(set(packet) == {'schemaVersion', 'kind', 'authorRole', 'sourceRights', 'sourceTextStored', 'artifactBindings', 'cases', 'eligibility'})
    require(type(packet['schemaVersion']) is int and packet['schemaVersion'] == 1)
    require(packet['kind'] == 'aetcom-unmatched-variant-triage' and packet['authorRole'] == 'AI_source_investigation')
    require(packet['sourceRights'] == 'citation_only' and packet['sourceTextStored'] is False)
    require(canonical(packet['eligibility']) == canonical(ELIGIBILITY))
    expected = [{'path': n, 'sha256': hashlib.sha256(inputs[n]).hexdigest()} for n in FILES]
    require(canonical(packet['artifactBindings']) == canonical(expected))
    modules, appendix, formatting = [json.loads(inputs[n]) for n in FILES]
    sources = {r['appearanceId']: r for r in modules['rows']}
    targets = {r['appearanceId']: r for r in appendix['numbered']}
    unmatched = {r['moduleAppearanceId'] for r in formatting['rows'] if not r['formattingMatches']}
    seen, case_ids = set(), set()
    for case in packet['cases']:
        require(set(case) == {'caseId', 'source', 'candidateAppendixAppearances', 'proposalKind', 'status', 'decision', 'semanticEquivalenceApproved', 'canonicalMappingApproved', 'caseDigest'})
        payload = {k: v for k, v in case.items() if k != 'caseDigest'}
        require(case['caseDigest'] == digest(canonical(payload)))
        require(case['status'] == 'AI_proposal_pending' and case['decision'] is None)
        require(case['semanticEquivalenceApproved'] is False and case['canonicalMappingApproved'] is False)
        require(case['proposalKind'] in KINDS)
        ref = case['source']; identity = ref['appearanceId']
        require(identity in unmatched and identity not in seen)
        require(case['caseId'] == 'aetcom-variant:' + identity[:16] and case['caseId'] not in case_ids)
        seen.add(identity); case_ids.add(case['caseId'])
        source = sources[identity]
        require(canonical(ref) == canonical({k: source[k] for k in ['appearanceId', 'pdfPage', 'bodySha256', 'moduleId']}))
        candidates, target_ids = case['candidateAppendixAppearances'], set()
        require(isinstance(candidates, list) and 1 <= len(candidates) <= 3)
        for candidate in candidates:
            target_id = candidate['appearanceId']
            require(target_id in targets and target_id not in target_ids); target_ids.add(target_id)
            target = targets[target_id]
            require(canonical(candidate) == canonical({k: target[k] for k in ['appearanceId', 'pdfPage', 'bodySha256', 'sourceNumber']}))
    require(seen == unmatched and len(packet['cases']) == len(unmatched))
    return True


def main():
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    packet_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'nmc-aetcom-variant-triage-v1.json'
    packet = json.loads(packet_path.read_bytes())
    validate(packet, {name: (root / name).read_bytes() for name in FILES})
    print(json.dumps({'aiProposalsValidated': len(packet['cases']), 'approvedDecisions': 0, 'learnerActivation': False}))


if __name__ == '__main__': main()
