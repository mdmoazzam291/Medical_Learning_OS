"""Create a metadata-only review queue from the pinned NMC source and inventory."""
import argparse
import hashlib
import json
from pathlib import Path

from build_reference_catalogue import ROOT, build, raw_cell


def build_queue(pdf, inventory_path):
    import fitz

    catalogue = json.loads((ROOT / 'data/nmc-reference-catalogue.json').read_text())
    if build(pdf, inventory_path) != catalogue:
        raise ValueError('catalogue_reconstruction_mismatch')
    pack = json.loads((ROOT / 'data/nmc-learning-foundation-drafts.json').read_text())
    if (pack['sourceEdition'], pack['sourceSha256']) != (catalogue['edition'], catalogue['sourceSha256']):
        raise ValueError('draft_source_mismatch')
    inventory = json.loads(inventory_path.read_text())
    regions = {r['regionId']: r for r in inventory['regions']}
    if len(regions) != len(inventory['regions']):
        raise ValueError('duplicate_region_id')
    bindings = {}
    for link in pack['sourceBindings']:
        bindings.setdefault(link['referenceId'], []).append(link)
    if not bindings.keys() <= {r['referenceId'] for r in catalogue['references']}:
        raise ValueError('unknown_proposal_reference')

    rows, pages = [], {}
    with fitz.open(pdf) as document:
        for ref in catalogue['references']:
            region = regions[ref['referenceId'].rsplit(':', 1)[1]]
            page_number = ref['pdfPage']
            if region['pdfPage'] != page_number:
                raise ValueError('region_page_mismatch')
            if page_number not in pages:
                page = document[page_number - 1]
                pages[page_number] = [
                    list(fitz.Rect(w[:4]) * page.rotation_matrix) + [w[4]]
                    for w in page.get_text('words')
                ]
            bounds = region['bbox']
            row = raw_cell([w for w in pages[page_number] if bounds[1] <= (w[1]+w[3])/2 < bounds[3]])
            if not row:
                raise ValueError('empty_source_row')
            digest = hashlib.sha256(row.encode()).hexdigest()
            proposals = bindings.get(ref['referenceId'], [])
            if any((p['sourcePage'], p['rowBBox'], p['sourceBodySha256']) != (page_number, bounds, digest) for p in proposals):
                raise ValueError('proposal_evidence_mismatch')
            reasons = []
            if ref['identifierState'] != 'standard':
                reasons.append('unresolved-identifier')
            if ref['amendmentNotice']:
                reasons.append('amendment-review')
            if ref['topicId'] is None:
                reasons.append('unresolved-topic')
            if reasons and proposals:
                raise ValueError('proposal_on_unresolved_source')
            rows.append({
                'referenceId': ref['referenceId'],
                'subjectId': ref['subjectId'],
                'code': ref['searchCode'],
                'page': page_number,
                'rowBBox': bounds,
                'sourceBodySha256': digest,
                'state': 'source-resolution' if reasons else 'proposal-review' if proposals else 'needs-objectives',
                'sourceResolutionReasons': reasons,
                'proposedObjectiveVersionIds': [p['objectiveVersionId'] for p in proposals],
            })
    return {'schemaVersion': 1, 'sourceEdition': catalogue['edition'],
            'sourceSha256': catalogue['sourceSha256'], 'draftVersion': pack['draftVersion'],
            'scope': catalogue['scope'], 'rows': rows}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    queue = build_queue(args.pdf, args.inventory)
    args.output.write_text(json.dumps(queue, separators=(',', ':')) + '\n')
    print(json.dumps({'rows': len(queue['rows']), 'subjects': len({r['subjectId'] for r in queue['rows']}),
                      'states': {s: sum(r['state'] == s for r in queue['rows']) for s in
                                 ('source-resolution', 'proposal-review', 'needs-objectives')}}))
