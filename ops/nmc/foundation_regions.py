"""Locate hash-pinned legacy Foundation Course rows; no 2024 equivalence claim."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell
from pandemic_rows import scan_rows

SOURCE_SHA = '616c6ebe7dd47a631aa7b984488136fc71827a7f7b6a11382b89b34e76386504'


def code_from_words(row, words, nested=False):
    left, top, right, bottom = row['bbox']
    selected = [w for w in words if top <= (w[1] + w[3]) / 2 < bottom and
                (left <= (w[0] + w[2]) / 2 < right if nested else w[0] < left)]
    if nested:
        candidates = [w[4] for w in selected if re.fullmatch(r'4\.5\.[1-8]', w[4])]
        if len(candidates) != 1: raise ValueError('nested_source_code_unresolved')
        return candidates[0]
    value = re.sub(r'\s', '', raw_cell(selected))
    if not re.fullmatch(r'FC[1-5]\.\d{1,2}', value): raise ValueError('top_level_source_code_unresolved')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA: raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    manifest_bytes = (root / 'nmc-supplement-requirement-enumeration.json').read_bytes()
    expected = json.loads(manifest_bytes)['foundation']
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    top_rows, nested_rows, source_codes = [], [], {}
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 64: raise ValueError('page_count_mismatch')
        for number in [16, 17, 18, 54, 55]:
            page = document[number - 1]
            if page.rotation != 0: raise ValueError('unsupported_rotated_page')
            nested = number >= 54
            words = [list(w[:5]) for w in page.get_text('words')]
            found = scan_rows(words, [list(d['rect']) for d in page.get_drawings()], SOURCE_SHA,
                             'legacy-foundation', number, minimum_level_x=470 if nested else 490,
                             maximum_level_gap=130 if nested else 100)
            for row in found:
                code = code_from_words(row, words, nested)
                if code in source_codes: raise ValueError('duplicate_source_code')
                row.pop('appearanceId'); row.pop('moduleId')
                row['sourceCodeSha256'] = digest(code)
                row['sourceSection'] = 'nested_disability' if nested else 'top_level_outcomes'
                if nested:
                    row['candidateParentAppearanceId'] = source_codes['FC4.5']['appearanceId']
                row['appearanceId'] = digest(canonical(dict(row, sourceSha256=SOURCE_SHA, method='foundation-regions-v1')))
                source_codes[code] = row
                (nested_rows if nested else top_rows).append(row)
    top_expected = {r['sourceCode']: r['pdfPage'] for r in expected['topLevelOutcomes']}
    nested_expected = {r['observedCode']: r['pdfPage'] for r in expected['nestedDisabilityOutcomes']}
    if {c: r['pdfPage'] for c, r in source_codes.items()} != dict(top_expected, **nested_expected):
        raise ValueError('legacy_manifest_code_or_page_mismatch')
    groups = Counter(code[2] for code in source_codes if code.startswith('FC'))
    result = {'schemaVersion': 1, 'kind': 'foundation-legacy-region-locators',
              'sourceSha256': SOURCE_SHA, 'sourcePageCount': 64,
              'priorEnumerationSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'geometry': {'topLevelMinimumLevelX': 490, 'topLevelMaximumGap': 100,
                           'nestedMinimumLevelX': 470, 'nestedMaximumGap': 130},
              'topLevel': top_rows, 'nested': nested_rows,
              'totals': {'topLevelAppearances': len(top_rows), 'nestedAppearances': len(nested_rows),
                         'groups': [{'group': int(g), 'appearances': n} for g, n in sorted(groups.items())]},
              'nestingIsCandidateSourceOrganization': True, 'clinicalParentMappingApproved': False,
              'effective2024ApplicabilityApproved': False, 'uniqueRequirementCount': None,
              'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output: output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
