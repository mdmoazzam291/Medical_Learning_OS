"""Separate leading-list-marker formatting matches from unchanged source identity."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from aetcom_appendix import SOURCE_SHA
from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell

MODULE_SHA = '07bdd20188acaacae5546bd969379d10fa32f09943e99fc7fbb426673bdabaf0'
APPENDIX_SHA = 'e413a8baa908f0cbe697b45d3929be1ffcfa3bc13e1ae156258d0770d8ae58ff'


def comparison(text):
    marker = re.match(r'^\s*(\d{1,2})\.(?:\s+|(?=[A-Z]))', text)
    body = text[marker.end():] if marker else text
    return digest(' '.join(body.split())), int(marker.group(1)) if marker else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA: raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    values = []
    for name, expected in [('nmc-aetcom-module-appendix-comparison-v1.json', MODULE_SHA),
                           ('nmc-aetcom-appendix-locators-v1.json', APPENDIX_SHA)]:
        raw = (root / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected: raise ValueError('evidence_version_mismatch')
        values.append(json.loads(raw))
    modules, appendix = values
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 94: raise ValueError('page_count_mismatch')
        cache = {}
        def reconstruct(row):
            number = row['pdfPage']
            if number not in cache: cache[number] = [list(w[:5]) for w in document[number - 1].get_text('words')]
            left, top, right, bottom = row['bbox']
            text = raw_cell([w for w in cache[number] if left <= (w[0] + w[2]) / 2 < right and top <= (w[1] + w[3]) / 2 < bottom])
            if digest(text) != row['bodySha256']: raise ValueError('body_hash_mismatch')
            return text
        targets = [(row, comparison(reconstruct(row))[0]) for row in appendix['numbered'] + appendix['additional']]
        old = {c['moduleAppearanceId']: c['appendixMatches'] for c in modules['comparisons']}
        rows = []
        for row in modules['rows']:
            text = reconstruct(row); key, marker = comparison(text)
            matches = [{'appearanceId': target['appearanceId'], 'sourceNumber': target['sourceNumber'],
                        'sourceDeclaredClass': target['sourceDeclaredClass'],
                        'displayedLevelsMatch': target['displayedLevels'] == row['displayedLevels']}
                       for target, target_key in targets if key == target_key]
            if old[row['appearanceId']] and not matches: raise ValueError('prior_exact_match_lost')
            rows.append({'moduleAppearanceId': row['appearanceId'], 'moduleId': row['moduleId'],
                         'pdfPage': row['pdfPage'], 'removedLeadingListNumber': marker,
                         'comparisonSha256': key, 'priorWhitespaceOnlyMatch': bool(old[row['appearanceId']]),
                         'literalPartialWordDetected': bool(re.search(r'\bpartial\b', text, re.I)),
                         'formattingMatches': matches, 'decision': None})
    result = {'schemaVersion': 1, 'kind': 'aetcom-leading-list-marker-comparison',
              'method': 'leading-list-number-and-whitespace-only-v1', 'sourceSha256': SOURCE_SHA,
              'moduleArtifactSha256': MODULE_SHA, 'appendixArtifactSha256': APPENDIX_SHA,
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'sourceRights': 'citation_only', 'sourceTextStored': False, 'rows': rows,
              'totals': {'moduleAppearances': len(rows), 'priorExactMatches': sum(r['priorWhitespaceOnlyMatch'] for r in rows),
                         'formattingMatches': sum(bool(r['formattingMatches']) for r in rows),
                         'newFormattingMatches': sum(bool(r['formattingMatches']) and not r['priorWhitespaceOnlyMatch'] for r in rows),
                         'remainingUnmatched': sum(not r['formattingMatches'] for r in rows),
                         'literalPartialWordAppearances': sum(r['literalPartialWordDetected'] for r in rows)},
              'originalArtifactsUnchanged': True, 'semanticEquivalenceApproved': False,
              'uniqueRequirementCount': None, 'effective2024ApplicabilityApproved': False,
              'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output: output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
