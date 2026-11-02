"""Read-only diagnostic of v1 empty-region word selection; never an exclusion decision."""
import argparse
import hashlib
import json
from pathlib import Path

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell

INVENTORY_SHA = '3a8f4ead4e470e991512b10a54f3c5595913ec5e37a73176346dfd56466790c0'


def inspect_region(region, words):
    left, top, right, bottom = region['bbox']
    band = [w for w in words if top <= (w[1] + w[3]) / 2 < bottom]
    centre = [w for w in band if left - 1 <= (w[0] + w[2]) / 2 <= right + 1]
    if centre:
        raise ValueError('v1_empty_region_has_selected_words')
    touching = [w for w in band if w[0] < right and w[2] > left]
    return {'regionId': region['regionId'], 'pdfPage': region['pdfPage'],
            'bbox': region['bbox'], 'intersectionWordCount': len(touching),
            'intersectionTextSha256': digest(raw_cell(touching)),
            'rowBandWordCount': len(band), 'rowBandTextSha256': digest(raw_cell(band)),
            'observation': 'intersection_words_omitted_by_centre_rule' if touching else 'no_column_intersection_words',
            'decision': None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    inventory_path = Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-row-region-inventory-v1.json'
    data = inventory_path.read_bytes()
    if hashlib.sha256(data).hexdigest() != INVENTORY_SHA:
        raise ValueError('inventory_version_mismatch')
    inventory = json.loads(data)
    source = args.pdf.read_bytes()
    if hashlib.sha256(source).hexdigest() != inventory['sourceSha256']:
        raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json' or args.output.resolve() in (args.pdf.resolve(), inventory_path.resolve()):
        raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6':
        raise ValueError('pymupdf_version_mismatch')
    rows, cache = [], {}
    with fitz.open(stream=source, filetype='pdf') as document:
        if len(document) != inventory['pdfPageCount']:
            raise ValueError('source_page_count_mismatch')
        for region in inventory['regions']:
            if region['kind'] != 'empty':
                continue
            page_number = region['pdfPage']
            if page_number not in cache:
                page = document[page_number - 1]
                cache[page_number] = [list(fitz.Rect(w[:4]) * page.rotation_matrix) + [w[4]] for w in page.get_text('words')]
            rows.append(inspect_region(region, cache[page_number]))
    result = {'schemaVersion': 1, 'kind': 'nmc-empty-region-selection-diagnostic',
              'inventorySha256': INVENTORY_SHA, 'sourceSha256': inventory['sourceSha256'],
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'regions': rows, 'totals': {'emptyRegions': len(rows),
                  'withIntersectionWords': sum(bool(r['intersectionWordCount']) for r in rows),
                  'withoutIntersectionWords': sum(not r['intersectionWordCount'] for r in rows)},
              'inventoryUnchanged': True, 'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output:
        output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__':
    main()
