"""Metadata-only topic-count investigation of the five discrepant 2024 subjects."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell
from audit_empty_regions import INVENTORY_SHA

SUBJECTS = {'GM': (281, 327, 525), 'PE': (329, 350, 406),
            'OG': (427, 442, 141), 'SU': (403, 412, 133), 'OP': (414, 418, 60)}


def headers(text, prefix):
    matches = list(re.finditer(r'(?im)(?:^|\n)[ \t]*Topic(?=[\s:\d])\s*:?\s*(\d+)?', text))
    result = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        segment = text[match.start():end]
        code = re.search(r'\b' + re.escape(prefix) + r'\s*\d+\s*\.', segment)
        segment = segment[:code.start()] if code else segment[:500]
        count = re.search(r'Number\s*of\s*competencies\s*:?\s*\(\s*(\d+)(\s*\))?', segment, re.I)
        result.append({'topic': int(match.group(1)) if match.group(1) else None,
                       'declaredCount': int(count.group(1)) if count and count.group(2) else None,
                       'countSyntax': 'closed_parenthesis' if count and count.group(2) else 'malformed_or_unlocated',
                       'headerEvidenceSha256': digest(segment)})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-row-region-inventory-v1.json'
    inventory_bytes = path.read_bytes()
    if hashlib.sha256(inventory_bytes).hexdigest() != INVENTORY_SHA:
        raise ValueError('inventory_version_mismatch')
    inventory = json.loads(inventory_bytes)
    source = args.pdf.read_bytes()
    if hashlib.sha256(source).hexdigest() != inventory['sourceSha256']:
        raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json':
        raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind != '1.26.6':
        raise ValueError('pymupdf_version_mismatch')
    subjects = []
    with fitz.open(stream=source, filetype='pdf') as document:
        if len(document) != inventory['pdfPageCount']:
            raise ValueError('source_page_count_mismatch')
        for prefix, (first, last, published) in SUBJECTS.items():
            page_words, topic_headers = {}, []
            for number in range(first, last + 1):
                page = document[number - 1]
                page_words[number] = [list(fitz.Rect(w[:4]) * page.rotation_matrix) + [w[4]] for w in page.get_text('words')]
                topic_headers.extend(dict(h, pdfPage=number) for h in headers(page.get_text(), prefix))
            observed, pages, fingerprints = Counter(), defaultdict(set), defaultdict(set)
            region_ids = []
            for region in inventory['regions']:
                if region['prefix'] != prefix or region['kind'] not in ('standard', 'nonstandard'):
                    continue
                left, top, right, bottom = region['bbox']
                text = raw_cell([w for w in page_words[region['pdfPage']] if
                                left - 1 <= (w[0] + w[2]) / 2 <= right + 1 and
                                top <= (w[1] + w[3]) / 2 < bottom])
                if digest(text) != region['rawCellSha256']:
                    raise ValueError('source_cell_digest_mismatch')
                match = re.fullmatch(re.escape(prefix) + r'(\d+)\.(\d+)\*?', re.sub(r'\s', '', text))
                if not match:
                    raise ValueError('unparsed_identifier_in_subject')
                topic = int(match.group(1)); observed[topic] += 1
                fingerprints[topic].add(region['rawCellSha256']); pages[topic].add(region['pdfPage'])
                region_ids.append(region['regionId'])
            topics = []
            for topic in sorted(observed):
                candidates = [h for h in topic_headers if h['topic'] == topic]
                if len(candidates) > 1:
                    raise ValueError('duplicate_numbered_topic_header')
                header = candidates[0] if candidates else None
                count = header['declaredCount'] if header else None
                unique = len(fingerprints[topic])
                topics.append({'topic': topic, 'observedAppearances': observed[topic],
                               'distinctRawCellDigests': unique, 'pdfPages': sorted(pages[topic]),
                               'header': header, 'declaredMatchesDistinctRawCells': count == unique if count is not None else None})
            subjects.append({'prefix': prefix, 'pdfRange': [first, last], 'publishedSubjectSummary': published,
                             'observedAppearances': sum(observed.values()),
                             'distinctRawCellDigests': sum(len(v) for v in fingerprints.values()),
                             'numberedHeaderCount': sum(h['topic'] is not None for h in topic_headers),
                             'unnumberedHeaders': [h for h in topic_headers if h['topic'] is None],
                             'closedNumberedHeaderCountSum': sum(h['declaredCount'] or 0 for h in topic_headers if h['topic'] is not None),
                             'allNumberedCountsParseable': all(h['declaredCount'] is not None for h in topic_headers if h['topic'] is not None),
                             'regionIdSequenceSha256': digest(canonical(region_ids)), 'topics': topics})
    result = {'schemaVersion': 1, 'kind': 'nmc-five-subject-topic-count-investigation',
              'sourceSha256': inventory['sourceSha256'], 'inventorySha256': INVENTORY_SHA,
              'sourceRights': 'citation_only', 'sourceTextStored': False,
              'engine': {'pymupdf': fitz.VersionBind, 'mupdf': fitz.VersionFitz},
              'subjects': subjects, 'sourceDecisionsMade': 0, 'eligibility': dict(ELIGIBILITY)}
    with args.output.open('x', encoding='utf-8') as output:
        output.write(canonical(result) + '\n')
    print(json.dumps([{k: s[k] for k in ['prefix', 'observedAppearances', 'distinctRawCellDigests', 'numberedHeaderCount', 'closedNumberedHeaderCountSum', 'allNumberedCountsParseable']} for s in subjects]))


if __name__ == '__main__': main()
