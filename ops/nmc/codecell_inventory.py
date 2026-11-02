"""Local, metadata-only NMC geometry scanner. Never an approval/coverage gate.

Pure helpers use synthetic geometry in CI. Only the CLI imports PyMuPDF, reads a
local pinned PDF and writes an exclusive JSON file. No source words are emitted.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re

KINDS = ('standard', 'nonstandard', 'empty', 'header')
ELIGIBILITY = {'noOmissionCertified': False, 'clinicalApproval': False,
               'completeCoverageClaim': False, 'learnerActivation': False}
METHOD = 'nmc-column-regions-v1'
PAGE_FIELDS = ['pdfPage', 'prefix', 'standardCellCount', 'nonstandardCellCount',
               'emptyRegionCount', 'headerOrUnclassifiedRegionCount',
               'detailedCellReceiptSha256', 'firstColumnXBounds']


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def integer(value, lower, upper):
    return type(value) is int and lower <= value <= upper


def number(value):
    return type(value) in (int, float) and math.isfinite(value) and abs(value) <= 20000


def validate_manifest(manifest, source_sha, page_count):
    if (not isinstance(manifest, dict) or type(manifest.get('schemaVersion')) is not int or manifest.get('schemaVersion') != 1
        or manifest.get('kind') != 'geometry-codecell-extraction-receipts'
        or manifest.get('status') != 'candidate_extraction_not_no_omission_proof'
        or manifest.get('sourceRights') != 'citation_only'
        or manifest.get('pageTupleFields') != PAGE_FIELDS
        or not isinstance(source_sha, str) or not re.fullmatch('[0-9a-f]{64}', source_sha)
        or manifest.get('sourceSha256') != source_sha
        or not integer(page_count, 1, 2000)
        or manifest.get('eligibility') != ELIGIBILITY
        or any(type(v) is not bool for v in manifest['eligibility'].values())):
        raise ValueError('invalid_nmc_manifest_or_source')
    rows = manifest.get('pageReceipts')
    if not isinstance(rows, list) or not 1 <= len(rows) <= page_count:
        raise ValueError('invalid_nmc_page_scope')
    previous = 0
    for row in rows:
        if (not isinstance(row, list) or len(row) != 8
            or not integer(row[0], previous + 1, page_count)
            or not isinstance(row[1], str) or not re.fullmatch('[A-Z]{2,4}', row[1])
            or not all(integer(v, 0, 2000) for v in row[2:6])
            or not isinstance(row[6], str) or not re.fullmatch('[0-9a-f]{64}', row[6])
            or not isinstance(row[7], list) or len(row[7]) != 2
            or not all(number(v) for v in row[7]) or not 0 <= row[7][0] < row[7][1]):
            raise ValueError('invalid_nmc_page_scope')
        previous = row[0]
    return rows


def checked_boxes(geometry):
    if not isinstance(geometry, dict) or set(geometry) != {'rectangles', 'words'}:
        raise ValueError('invalid_nmc_geometry')
    for key, size in [('rectangles', 4), ('words', 5)]:
        values = geometry[key]
        if not isinstance(values, list) or len(values) > 50000:
            raise ValueError('invalid_nmc_geometry')
        for box in values:
            if (not isinstance(box, list) or len(box) != size
                or not all(number(v) for v in box[:4]) or box[0] > box[2] or box[1] > box[3]
                or (key == 'words' and (box[0] == box[2] or box[1] == box[3]
                    or not isinstance(box[4], str) or len(box[4]) > 2000))):
                raise ValueError('invalid_nmc_geometry')


def raw_cell(words):
    # Preserve multi-line cells; whitespace reconstruction is method-specific,
    # never claimed to be original PDF bytes or normalized competency identity.
    lines = []
    for word in sorted(words, key=lambda w: (w[1], w[0], w[4])):
        if not lines or word[1] - lines[-1][0][1] > 5:
            lines.append([word])
        else:
            lines[-1].append(word)
    return '\n'.join(' '.join(w[4] for w in sorted(line, key=lambda w: (w[0], w[4]))) for line in lines)


def classify(text):
    if not text:
        return 'empty'
    compact = re.sub(r'\s', '', text)
    if '\n' not in text and re.fullmatch(r'[A-Z]{2,4}\d{1,3}\.\d{1,3}\*?', compact):
        return 'standard'
    if re.fullmatch(r'(?:[A-Z]{1,4}[\s\d.:*]+|\d[\s\d.:*]+)', text):
        return 'nonstandard'
    return 'header'


def scan_page(row, geometry, source_sha):
    checked_boxes(geometry)
    page, prefix = row[:2]
    left, right = row[7]
    borders = []
    for x0, y0, x1, y1 in geometry['rectangles']:
        if y1 - y0 <= 2 and x1 - x0 >= right - left - 2 and x0 <= left + 1 and x1 >= right - 1:
            borders.append((y0 + y1) / 2)
    clusters = []
    for y in sorted(borders):
        if not clusters or y - clusters[-1][-1] > 1:
            clusters.append([y])
        else:
            clusters[-1].append(y)
    ys = [sum(group) / len(group) for group in clusters]
    if len(ys) < 2:
        raise ValueError('nmc_column_boundaries_missing')
    words = [w for w in geometry['words'] if left - 1 <= (w[0] + w[2]) / 2 <= right + 1]
    regions = []
    for index, (top, bottom) in enumerate(zip(ys, ys[1:]), 1):
        text = raw_cell([w for w in words if top <= (w[1] + w[3]) / 2 < bottom])
        bounds = [round(float(v), 3) + 0.0 for v in [left, top, right, bottom]]  # Normalize int/float and signed zero.
        cell_sha = digest(text)
        identity = {'method': METHOD, 'sourceSha256': source_sha, 'pdfPage': page,
                    'bbox': bounds, 'rawCellSha256': cell_sha}
        regions.append({'regionId': digest(canonical(identity)), 'pdfPage': page,
                        'prefix': prefix, 'regionIndex': index, 'bbox': bounds,
                        'kind': classify(text), 'rawCellSha256': cell_sha})
    return regions


def build_inventory(manifest, source_sha, page_count, geometry):
    rows = validate_manifest(manifest, source_sha, page_count)
    if (not isinstance(geometry, dict) or any(type(k) is not int for k in geometry)
        or set(geometry) != {row[0] for row in rows}):
        raise ValueError('nmc_geometry_scope_mismatch')
    regions, differences, pages = [], [], []
    identifiers_match = True
    for row in rows:
        cells = scan_page(row, geometry[row[0]], source_sha)
        observed = {kind: sum(c['kind'] == kind for c in cells) for kind in KINDS}
        expected = dict(zip(KINDS, row[2:6]))
        pages.append({'pdfPage': row[0], 'prefix': row[1], 'observed': observed,
                      'regionSequenceSha256': digest(canonical(cells))})
        if observed != expected:
            differences.append({'pdfPage': row[0], 'legacyCounts': expected, 'observed': observed})
        identifiers_match &= sum(observed[k] for k in KINDS[:2]) == sum(expected[k] for k in KINDS[:2])
        regions.extend(cells)
    totals = {kind: sum(p['observed'][kind] for p in pages) for kind in KINDS}
    totals.update(regions=len(regions), identifierCandidates=totals['standard'] + totals['nonstandard'])
    return {'schemaVersion': 1, 'kind': 'nmc-defining-column-region-inventory', 'method': METHOD,
            'sourceSha256': source_sha, 'pdfPageCount': page_count,
            'candidateManifestSha256': digest(canonical(manifest)), 'sourceRights': 'citation_only',
            'sourceTextStored': False, 'identitiesNormalized': False,
            'pages': pages, 'regions': regions, 'totals': totals,
            'comparison': {'identifierCountsMatchAllSelectedPages': identifiers_match,
                           'allCategoryCountsMatch': not differences, 'pageDifferences': differences},
            'eligibility': dict(ELIGIBILITY)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-codecell-page-receipts.json')
    parser.add_argument('--expected-pages', type=int, default=467)
    args = parser.parse_args()
    if args.pdf.resolve() == args.output.resolve() or args.output.suffix != '.json' or args.pdf.stat().st_size > 80 * 1024 * 1024:
        raise ValueError('invalid_nmc_local_paths')
    data = args.pdf.read_bytes()
    if not data.startswith(b'%PDF-'):
        raise ValueError('invalid_nmc_pdf')
    source_sha = hashlib.sha256(data).hexdigest()
    manifest = json.loads(args.manifest.read_text())
    rows = validate_manifest(manifest, source_sha, args.expected_pages)
    import fitz  # Optional local extraction dependency; not an app/CI unit dependency.
    if fitz.VersionBind != '1.26.6':
        raise ValueError('nmc_pymupdf_version_must_be_1_26_6')
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != args.expected_pages:
            raise ValueError('nmc_pdf_page_count_mismatch')
        geometry = {}
        for row in rows:
            page = document[row[0] - 1]
            rectangles = [list(d['rect'] * page.rotation_matrix) for d in page.get_drawings()]
            words = [list(fitz.Rect(w[:4]) * page.rotation_matrix) + [w[4]] for w in page.get_text('words')]
            geometry[row[0]] = {'rectangles': rectangles, 'words': words}
    result = build_inventory(manifest, source_sha, args.expected_pages, geometry)
    result['engine'] = {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz}
    with args.output.open('x', encoding='utf-8') as output:
        output.write(json.dumps(result, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'pages': len(result['pages']), 'totals': result['totals'],
                      'categoryDifferencePages': len(result['comparison']['pageDifferences']),
                      'identifierCountsMatchAllSelectedPages': result['comparison']['identifierCountsMatchAllSelectedPages'],
                      'noOmissionCertified': False, 'learnerActivation': False}))


if __name__ == '__main__':
    main()
