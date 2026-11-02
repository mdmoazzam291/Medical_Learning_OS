"""Locate explicitly headed nested items; no semantic completeness or mapping claim."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest

HEADING = re.compile(r'(?im)^[ \t]*(Sub[ -]competenc(?:y|ies)(?: addressed)?|Learning objectives)[ \t]*$')
STOP = re.compile(r'(?im)^[ \t]*(?:Learning experience|Case study(?:\s+\d+)?|Assessment|Resources|Further reading)[ \t]*:?\s*$')
REFERENCE = re.compile(r'\b[A-Z]{2,4}\s*\d{1,3}\s*\.\s*\d{1,3}\b')


def locate_sections(pages, module, source_sha):
    # Replace a leading numeric folio with equal-length whitespace so offsets
    # still refer to PyMuPDF plain page text, without polluting nested body hashes.
    parts, ranges, cursor = [], [], 0
    for number, raw in pages:
        match = re.match(r'^\s*\d+\s*\n', raw)
        text = (re.sub(r'[^\n]', ' ', match.group(0)) + raw[match.end():]) if match else raw
        parts.append(text); ranges.append((number, cursor, cursor + len(text)))
        cursor += len(text) + 1
    text = '\n'.join(parts)
    headings = list(HEADING.finditer(text)); records = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        stop = STOP.search(text, heading.end(), end)
        if stop: end = stop.start()
        body = text[heading.end():end]
        markers = list(re.finditer(r'(?m)^[ \t]*(\d+)\.[ \t]+', body))
        if markers:
            numbers = [int(m.group(1)) for m in markers]
            if numbers != list(range(1, len(markers) + 1)):
                raise ValueError('nested_numbering_unresolved')
            spans = [(heading.end() + m.start(), heading.end() + (markers[i + 1].start() if i + 1 < len(markers) else len(body)), numbers[i]) for i, m in enumerate(markers)]
        else:
            spans = [(heading.end(), end, None)]
        for begin, finish, ordinal in spans:
            selected = text[begin:finish]
            begin += len(selected) - len(selected.lstrip())
            finish = begin + len(selected.strip())
            if begin >= finish:
                raise ValueError('nested_body_missing')
            segments = [{'pdfPage': n, 'startChar': max(begin, a) - a, 'endChar': min(finish, b) - a}
                        for n, a, b in ranges if max(begin, a) < min(finish, b)]
            record = {'moduleId': module, 'sectionKind': 'learning_objective' if heading.group(1).lower().startswith('learning') else 'subcompetency',
                      'ordinal': ordinal, 'segments': segments, 'bodySha256': digest(text[begin:finish])}
            record['appearanceId'] = digest(canonical(dict(record, sourceSha256=source_sha, method='pandemic-explicit-nested-text-v1')))
            records.append(record)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-global-support-review-queue.json'
    manifest_bytes = path.read_bytes(); manifest = json.loads(manifest_bytes)['pandemic']
    data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != manifest['sourceSha256']: raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    rows, scans = [], []
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 113: raise ValueError('page_count_mismatch')
        for index, module in enumerate(manifest['moduleOpenings']):
            first = module['pdfPage']; last = manifest['moduleOpenings'][index + 1]['pdfPage'] - 1 if index + 1 < len(manifest['moduleOpenings']) else 79
            pages = [(n, document[n - 1].get_text()) for n in range(first, last + 1)]
            found = locate_sections(pages, module['moduleId'], manifest['sourceSha256']); rows.extend(found)
            scans.append({'moduleId': module['moduleId'], 'candidatePdfRange': [first, last],
                          'explicitNestedAppearances': len(found),
                          'standardDottedReferenceMatches': sum(len(REFERENCE.findall(t)) for _, t in pages),
                          'pageTextDigests': [{'pdfPage': n, 'sha256': digest(t)} for n, t in pages]})
    result = {'schemaVersion': 1, 'kind': 'pandemic-explicit-nested-item-locators',
              'method': 'pandemic-explicit-nested-text-v1', 'sourceSha256': manifest['sourceSha256'],
              'openingManifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'modules': scans, 'items': rows,
              'totals': {'modulesScanned': len(scans), 'sourcePagesScanned': sum(len(s['pageTextDigests']) for s in scans),
                         'explicitNestedAppearances': len(rows), 'standardDottedReferenceMatches': sum(s['standardDottedReferenceMatches'] for s in scans)},
              'semanticReferenceCoverageComplete': False, 'allObjectivesEnumerated': False,
              'effective2024ApplicabilityApproved': False, 'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output: output.write(canonical(result) + '\n')
    print(json.dumps(result['totals']))


if __name__ == '__main__': main()
