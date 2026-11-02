"""Locate candidate competency-table rows in the pinned legacy pandemic booklet."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell

METHOD = 'pandemic-level-anchored-rows-v1'


def scan_rows(words, rectangles, source_sha, module, page):
    borders = [r for r in rectangles if 0 <= r[3] - r[1] <= 2 and r[2] - r[0] >= 200]
    levels = [w for w in words if w[0] >= 400 and w[4] in {'K', 'KH', 'SH', 'S', 'P'}]
    result, seen, anchors = [], {}, set()
    for level in sorted(levels, key=lambda w: (w[1], w[0])):
        centre = (level[1] + level[3]) / 2
        eligible = [r for r in borders if r[2] <= level[0] and level[0] - r[2] < 100]
        above = [r for r in eligible if (r[1] + r[3]) / 2 < centre]
        below = [r for r in eligible if (r[1] + r[3]) / 2 > centre]
        if not above or not below:
            raise ValueError('competency_row_boundaries_missing')
        top = max(above, key=lambda r: (r[1] + r[3]) / 2)
        bottom = min(below, key=lambda r: (r[1] + r[3]) / 2)
        bbox = [round(float(x), 3) for x in [max(top[0], bottom[0]), (top[1] + top[3]) / 2,
                                           min(top[2], bottom[2]), (bottom[1] + bottom[3]) / 2]]
        anchor = tuple(level)
        if anchor in anchors:
            raise ValueError('duplicate_level_anchor')
        anchors.add(anchor)
        if tuple(bbox) in seen:
            row = seen[tuple(bbox)]
            row['displayedLevels'].append(level[4])
            row['levelAnchorBboxes'].append([round(float(v), 3) for v in level[:4]])
            continue
        text = raw_cell([w for w in words if bbox[0] <= (w[0] + w[2]) / 2 < bbox[2] and
                         bbox[1] <= (w[1] + w[3]) / 2 < bbox[3]])
        if not text:
            raise ValueError('competency_row_body_missing')
        row = {'moduleId': module, 'pdfPage': page, 'bbox': bbox,
               'bodySha256': digest(text), 'displayedLevels': [level[4]],
               'levelAnchorBboxes': [[round(float(v), 3) for v in level[:4]]]}
        seen[tuple(bbox)] = row
        result.append(row)
    if not result:
        raise ValueError('competency_rows_unlocated')
    for row in result:
        row['appearanceId'] = digest(canonical(dict(row, sourceSha256=source_sha, method=METHOD)))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    manifest_bytes = (root / 'nmc-global-support-review-queue.json').read_bytes()
    manifest = json.loads(manifest_bytes)['pandemic']
    data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest['sourceSha256']:
        raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json':
        raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6':
        raise ValueError('pymupdf_version_mismatch')
    modules, all_rows = [], []
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 113:
            raise ValueError('page_count_mismatch')
        for index, module in enumerate(manifest['moduleOpenings']):
            start = module['pdfPage']
            # Page 80 introduces the legal annexures; final learning module ends at 79.
            end = manifest['moduleOpenings'][index + 1]['pdfPage'] - 1 if index + 1 < len(manifest['moduleOpenings']) else 79
            rows, table_pages = [], []
            for number in range(start, end + 1):
                page = document[number - 1]
                if not re.search(r'Competenc(?:y|ies)\s+addressed', page.get_text(), re.I):
                    continue
                if page.rotation != 0:
                    raise ValueError('unsupported_rotated_page')
                words = [list(w[:5]) for w in page.get_text('words')]
                found = scan_rows(words, [list(d['rect']) for d in page.get_drawings()],
                                  manifest['sourceSha256'], module['moduleId'], number)
                rows.extend(found); table_pages.append(number)
            if not rows:
                raise ValueError('module_competency_table_unlocated')
            modules.append({'moduleId': module['moduleId'], 'candidatePdfRange': [start, end],
                            'competencyTablePages': table_pages, 'candidateRegionCount': len(rows),
                            'levelAnchorCount': sum(len(r['displayedLevels']) for r in rows)})
            all_rows.extend(rows)
    counts = Counter(r['bodySha256'] for r in all_rows)
    result = {'schemaVersion': 1, 'kind': 'pandemic-legacy-competency-row-locators', 'method': METHOD,
              'sourceSha256': manifest['sourceSha256'], 'sourcePageCount': 113,
              'openingManifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'modules': modules, 'rows': all_rows,
              'totals': {'modules': len(modules), 'candidateRegionAppearances': len(all_rows),
                         'levelAnchors': sum(len(r['displayedLevels']) for r in all_rows),
                         'distinctBodyDigests': len(counts)},
              'repeatedBodyDigests': [{'bodySha256': h, 'appearances': n} for h, n in sorted(counts.items()) if n > 1],
              'nestedObjectivesEnumerated': False, 'subjectReferencesEnumerated': False,
              'effective2024ApplicabilityApproved': False, 'sourceDecisionsMade': 0,
              'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output:
        output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
