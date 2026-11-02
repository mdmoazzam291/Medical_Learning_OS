"""Metadata-only appearance/overlap investigation of the pinned AETCOM appendix."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell
from pandemic_rows import scan_rows

SOURCE_SHA = 'f752cfe4ef694f60f89f7e709a29c4d8167672928dd248dfb9bd34414bc13766'
METHOD = 'aetcom-appendix-level-regions-v1'


def number_in_region(row, words):
    _, top, _, bottom = row['bbox']
    candidates = [int(w[4]) for w in words if w[0] < 100 and
                  top <= (w[1] + w[3]) / 2 < bottom and re.fullmatch(r'\d{1,2}', w[4])]
    if len(candidates) != 1: raise ValueError('appendix_number_unresolved')
    return candidates[0]


def comparison_digest(text):
    # Exact whitespace-collapsed comparison only; not semantic equivalence.
    return digest(' '.join(text.split()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA: raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    numbered, additional = [], []
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 94: raise ValueError('page_count_mismatch')
        for page_number in range(87, 94):
            page = document[page_number - 1]
            if page.rotation != 0: raise ValueError('unsupported_rotated_page')
            words = [list(w[:5]) for w in page.get_text('words')]
            # Domain K/S is a distinct column left of x=510; only rightmost
            # level-column markers anchor rows. Body words remain unfiltered.
            rows = scan_rows(words, [list(d['rect']) for d in page.get_drawings()], SOURCE_SHA,
                             'aetcom-appendix', page_number, minimum_level_x=510)
            for row in rows:
                row.pop('appearanceId'); row.pop('moduleId')
                if len(row['displayedLevels']) != 1: raise ValueError('appendix_level_unresolved')
                left, top, right, bottom = row['bbox']
                text = raw_cell([w for w in words if left <= (w[0] + w[2]) / 2 < right and top <= (w[1] + w[3]) / 2 < bottom])
                row['whitespaceCollapsedBodySha256'] = comparison_digest(text)
                if page_number <= 91:
                    row['sourceNumber'] = number_in_region(row, words)
                    row['sourceDeclaredClass'] = 'core' if row['sourceNumber'] <= 39 else 'non_core_desirable'
                    target = numbered
                else:
                    row['sourceNumber'] = None; row['localAppearanceOrdinal'] = len(additional) + 1
                    row['sourceDeclaredClass'] = 'additional_non_core_desirable'; target = additional
                row['appearanceId'] = digest(canonical(dict(row, sourceSha256=SOURCE_SHA, method=METHOD)))
                target.append(row)
    if [r['sourceNumber'] for r in numbered] != list(range(1, 55)):
        raise ValueError('numbered_appendix_sequence_unresolved')
    comparisons = [{'additionalAppearanceId': r['appearanceId'],
                    'matchingNumberedAppearances': [{'sourceNumber': n['sourceNumber'], 'appearanceId': n['appearanceId'],
                        'sourceDeclaredClass': n['sourceDeclaredClass']} for n in numbered if n['whitespaceCollapsedBodySha256'] == r['whitespaceCollapsedBodySha256']]} for r in additional]
    result = {'schemaVersion': 1, 'kind': 'aetcom-appendix-appearance-comparison', 'method': METHOD,
              'sourceSha256': SOURCE_SHA, 'sourcePageCount': 94, 'sourceRights': 'citation_only',
              'sourceTextStored': False, 'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'numbered': numbered, 'additional': additional, 'comparisons': comparisons,
              'totals': {'numberedAppearances': len(numbered), 'coreBySourceDeclaration': 39,
                         'desirableBySourceDeclaration': 15, 'additionalAppearances': len(additional),
                         'additionalWithExactWhitespaceCollapsedMatch': sum(bool(c['matchingNumberedAppearances']) for c in comparisons)},
              'clinicalEquivalenceAdjudicated': False, 'effective2024ApplicabilityApproved': False,
              'uniqueRequirementCount': None, 'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output: output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
