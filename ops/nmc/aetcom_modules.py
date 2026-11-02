"""Locate legacy AETCOM module appearances and compare exact appendix text hashes."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from aetcom_appendix import SOURCE_SHA, comparison_digest
from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell
from pandemic_rows import scan_rows

APPENDIX_SHA = 'e413a8baa908f0cbe697b45d3929be1ffcfa3bc13e1ae156258d0770d8ae58ff'
METHOD = 'aetcom-module-table-appearances-v1'


def module_heading(text):
    if not re.search(r'Competenc(?:y|ies)\s+addressed', text, re.I): return None
    headings = re.findall(r'(?im)^[ \t]*Module\s*(\d+\.\d+)(?=\s|:)', text)
    if not headings: return None
    if len(headings) != 1: raise ValueError('module_heading_ambiguous')
    return headings[0]


def match_appendix(row, appendix):
    matches = []
    for collection in ['numbered', 'additional']:
        for candidate in appendix[collection]:
            if candidate['whitespaceCollapsedBodySha256'] != row['whitespaceCollapsedBodySha256']: continue
            matches.append({'collection': collection, 'appearanceId': candidate['appearanceId'],
                            'sourceNumber': candidate['sourceNumber'],
                            'sourceDeclaredClass': candidate['sourceDeclaredClass'],
                            'displayedLevelsMatch': candidate['displayedLevels'] == row['displayedLevels']})
    return matches


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); source = args.pdf.read_bytes()
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA: raise ValueError('source_hash_mismatch')
    path = Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-aetcom-appendix-locators-v1.json'
    appendix_bytes = path.read_bytes()
    if hashlib.sha256(appendix_bytes).hexdigest() != APPENDIX_SHA: raise ValueError('appendix_version_mismatch')
    appendix = json.loads(appendix_bytes)
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    rows, modules, comparisons = [], [], []
    with fitz.open(stream=source, filetype='pdf') as document:
        if len(document) != 94: raise ValueError('page_count_mismatch')
        for number in range(1, 87):
            page = document[number - 1]; module = module_heading(page.get_text())
            if module is None: continue
            if module in [m['moduleId'] for m in modules]: raise ValueError('duplicate_module_heading')
            if page.rotation != 0: raise ValueError('unsupported_rotated_page')
            words = [list(w[:5]) for w in page.get_text('words')]
            found = scan_rows(words, [list(d['rect']) for d in page.get_drawings()], SOURCE_SHA, module, number)
            for row in found:
                row.pop('appearanceId')
                left, top, right, bottom = row['bbox']
                text = raw_cell([w for w in words if left <= (w[0] + w[2]) / 2 < right and top <= (w[1] + w[3]) / 2 < bottom])
                row['whitespaceCollapsedBodySha256'] = comparison_digest(text)
                row['appearanceId'] = digest(canonical(dict(row, sourceSha256=SOURCE_SHA, method=METHOD)))
                comparisons.append({'moduleAppearanceId': row['appearanceId'], 'appendixMatches': match_appendix(row, appendix)})
            rows.extend(found); modules.append({'moduleId': module, 'pdfPage': number, 'candidateRegions': len(found)})
    result = {'schemaVersion': 1, 'kind': 'aetcom-module-appendix-appearance-comparison',
              'method': METHOD, 'sourceSha256': SOURCE_SHA, 'appendixArtifactSha256': APPENDIX_SHA,
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'scannedPdfRange': [1, 86], 'modules': modules, 'rows': rows, 'comparisons': comparisons,
              'totals': {'detectedModuleHeadings': len(modules), 'candidateRegionAppearances': len(rows),
                         'withExactAppendixMatch': sum(bool(c['appendixMatches']) for c in comparisons),
                         'withoutExactAppendixMatch': sum(not c['appendixMatches'] for c in comparisons)},
              'semanticMappingApproved': False, 'allModuleRequirementsEnumerated': False,
              'effective2024ApplicabilityApproved': False, 'uniqueRequirementCount': None,
              'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output: output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
