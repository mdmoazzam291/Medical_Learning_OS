"""Freeze/verify an unreviewed metadata package. No approval importer or runtime authority."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, METHOD, canonical, digest

FILES = ('nmc-row-region-inventory-v1.json', 'nmc-source-adjudication-packet.json',
         'nmc-source-page-dispositions.json', 'nmc-empty-region-selection-diagnostic-v1.json')
INPUT_FLAGS = (set(ELIGIBILITY), {'completeCoverageClaim', 'clinicalApproval', 'rightsApproval',
                                'examScopeApproval', 'learnerActivation'},
               {'completeCoverageClaim', 'examScopeApproval', 'learnerActivation'}, set(ELIGIBILITY))


def require(condition):
    if not condition:
        raise ValueError('invalid_unreviewed_package_evidence')


def sha(value):
    return isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value) is not None


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result)
        result[key] = value
    return result


def build_package(inputs):
    require(isinstance(inputs, dict) and set(inputs) == set(FILES))
    values, artifacts = {}, []
    for name in FILES:
        data = inputs[name]
        require(type(data) is bytes and 0 < len(data) <= 2 * 1024 * 1024)
        value = json.loads(data, object_pairs_hook=no_duplicates,
                           parse_constant=lambda _: require(False))
        require(isinstance(value, dict) and value.get('sourceRights') == 'citation_only')
        require(isinstance(value.get('eligibility'), dict) and
                set(value['eligibility']) == INPUT_FLAGS[FILES.index(name)] and
                all(v is False for v in value['eligibility'].values()))
        values[name] = value
        artifacts.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    inventory, cases, pages, diagnostic = (values[name] for name in FILES)
    require(inventory.get('kind') == 'nmc-defining-column-region-inventory' and inventory.get('method') == METHOD)
    require(cases.get('kind') == 'nmc-source-adjudication-packet' and cases.get('status') == 'prepared_not_reviewed')
    require(pages.get('kind') == 'nmc-source-page-disposition-checklist')
    require(diagnostic.get('kind') == 'nmc-empty-region-selection-diagnostic')
    documents, source_by_hash, page_total = [], {}, 0
    for document in pages['documents']:
        source_hash, count = document['sha256'], document['pageCount']
        require(sha(source_hash) and source_hash not in source_by_hash and
                type(count) is int and 0 < count <= 2000)
        require([p['pdfPage'] for p in document['pages']] == list(range(1, count + 1)))
        require(all(type(p['pdfPage']) is int and p['reviewStatus'] == 'pending' and
                    p['exclusionApproved'] is False for p in document['pages']))
        require(document['id'] not in {d['id'] for d in documents})
        source_by_hash[source_hash] = document
        documents.append({'id': document['id'], 'sha256': source_hash, 'pageCount': count,
                          'pageChecklistDigest': digest(canonical(document['pages']))})
        page_total += count
    require(len(documents) == pages['retrievedDocumentCount'] and page_total == pages['retrievedPageCount'])
    require(inventory['sourceSha256'] in source_by_hash)
    source_document = source_by_hash[inventory['sourceSha256']]
    require(source_document['pageCount'] == inventory['pdfPageCount'])
    region_ids, region_pages, region_rows = set(), set(), {}
    for region in inventory['regions']:
        page = region['pdfPage']
        require(type(page) is int and 1 <= page <= inventory['pdfPageCount'])
        identity = {'method': METHOD, 'sourceSha256': inventory['sourceSha256'],
                    'pdfPage': page, 'bbox': region['bbox'], 'rawCellSha256': region['rawCellSha256']}
        require(sha(region['rawCellSha256']) and region['regionId'] == digest(canonical(identity)))
        require(region['regionId'] not in region_ids)
        region_ids.add(region['regionId']); region_pages.add(page)
        region_rows.setdefault(page, []).append(region)
    require(len(region_ids) == inventory['totals']['regions'])
    require([p['pdfPage'] for p in inventory['pages']] == sorted(region_pages))
    for page in inventory['pages']:
        require(page['regionSequenceSha256'] == digest(canonical(region_rows[page['pdfPage']])))
    artifact_hashes = {a['path']: a['sha256'] for a in artifacts}
    require(diagnostic['inventorySha256'] == artifact_hashes[FILES[0]] and
            diagnostic['sourceSha256'] == inventory['sourceSha256'] and diagnostic['inventoryUnchanged'] is True)
    empty = {r['regionId']: r for r in inventory['regions'] if r['kind'] == 'empty'}
    require(len(diagnostic['regions']) == len(empty) and
            {r['regionId'] for r in diagnostic['regions']} == set(empty))
    require(all(r['decision'] is None and r['bbox'] == empty[r['regionId']]['bbox'] and
                r['pdfPage'] == empty[r['regionId']]['pdfPage'] for r in diagnostic['regions']))
    case_refs, seen = [], set()
    for case in cases['cases']:
        require(case['id'] not in seen and case['decision'] is None and case['status'] == 'pending')
        seen.add(case['id'])
        require(case['source'] in cases['sources'])
        source = cases['sources'][case['source']]
        require(source['sha256'] in source_by_hash)
        document = source_by_hash[source['sha256']]
        require(source['pages'] == document['pageCount'])
        require(case['pdfPages'] and case['pdfPages'] == sorted(set(case['pdfPages'])) and
                all(type(p) is int and 1 <= p <= document['pageCount'] for p in case['pdfPages']))
        case_refs.append({'caseId': case['id'], 'caseDigest': digest(canonical(case)),
                          'sourceSha256': source['sha256'], 'pdfPages': case['pdfPages'],
                          'regionEvidencePages': [p for p in case['pdfPages'] if
                              source['sha256'] == inventory['sourceSha256'] and p in region_pages],
                          'decision': None})
    payload = {'schemaVersion': 1, 'kind': 'nmc-unreviewed-metadata-review-package',
               'status': 'prepared_not_reviewed', 'sourceRights': 'citation_only',
               'artifacts': artifacts, 'documents': documents, 'cases': case_refs,
               'counts': {'documents': len(documents), 'pendingPages': page_total,
                          'regions': len(region_ids), 'pendingCases': len(case_refs)},
               'coverageExhaustive': False, 'trustedAttestationsImplemented': False,
               'eligibility': dict(ELIGIBILITY)}
    return dict(payload, packageDigest=digest(canonical(payload)))


def verify_package(package, inputs):
    if canonical(package) != canonical(build_package(inputs)):
        raise ValueError('stale_or_modified_package')
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['build', 'verify'])
    parser.add_argument('package', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    inputs = {name: (root / name).read_bytes() for name in FILES}
    if args.action == 'verify':
        verify_package(json.loads(args.package.read_bytes(), object_pairs_hook=no_duplicates), inputs)
    else:
        package = build_package(inputs)
        with args.package.open('x', encoding='utf-8') as output:
            output.write(canonical(package) + '\n')
    print(json.dumps({'action': args.action, 'verified': True, 'learnerActivation': False}))


if __name__ == '__main__': main()
