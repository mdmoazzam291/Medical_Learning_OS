"""Locate explicit sample ECE competencies/objectives; never universal additions."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical
from pandemic_nested import locate_sections

SOURCE_SHA = '8683513a6ed3ec1f1e8feefafddae7756b4ca918e082b158adfcdb6b3c125545'
METHOD = 'ece-explicit-example-items-v1'
STOP = re.compile(r'(?im)^[ \t]*(?:Learning Experiences?|Learning Session|Assessment|Resources|References)[ \t]*:?|^[ \t]*\*Please note')


def extract(pages, module, humanities=False):
    explicit = any(re.search(r'(?im)^[ \t]*Objectives[ \t]*:?[ \t]*$', text) for _, text in pages)
    objective = r'Objectives' if explicit else r'At the end of the ECE module I MBBS student shall be able to'
    expression = r'Competency addressed' if humanities else r'Expected Competenc(?:y|ies)|' + objective
    heading = re.compile(r'(?im)^[ \t]*(' + expression + r')[ \t]*:?[ \t]*$')
    def kind(value):
        return 'sample_expected_competency' if value.lower().startswith('expected') else ('humanities_example_competency' if humanities else 'sample_learning_objective')
    return locate_sections(pages, module, SOURCE_SHA, heading_pattern=heading, stop_pattern=STOP,
                           kind_for_heading=kind, method=METHOD,
                           number_marker_pattern=r'(?m)^[ \t]*(\d+)[.)][ \t]+')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); data = args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCE_SHA: raise ValueError('source_hash_mismatch')
    if args.output.suffix != '.json': raise ValueError('invalid_output_path')
    root = Path(__file__).resolve().parents[2] / 'docs/evidence'
    manifest_bytes = (root / 'nmc-supplement-requirement-enumeration.json').read_bytes()
    openings = json.loads(manifest_bytes)['ece']['sampleModuleOpenings']
    import fitz
    if fitz.VersionBind != '1.26.6': raise ValueError('pymupdf_version_mismatch')
    rows, scopes = [], []
    with fitz.open(stream=data, filetype='pdf') as document:
        if len(document) != 44: raise ValueError('page_count_mismatch')
        for index, first in enumerate(openings):
            last = openings[index + 1] - 1 if index + 1 < len(openings) else 40
            module = 'ece2019:sample:' + str(index + 1)
            found = extract([(n, document[n - 1].get_text()) for n in range(first, last + 1)], module)
            if not found: raise ValueError('sample_sections_unlocated')
            rows.extend(found); scopes.append({'localScopeId': module, 'pdfRange': [first, last], 'appearances': len(found)})
        found = extract([(n, document[n - 1].get_text()) for n in [41,42]], 'ece2019:humanities-annexure', humanities=True)
        if not found: raise ValueError('humanities_section_unlocated')
        rows.extend(found); scopes.append({'localScopeId': 'ece2019:humanities-annexure', 'pdfRange': [41,42], 'appearances': len(found)})
    counts = Counter(r['sectionKind'] for r in rows)
    result = {'schemaVersion': 1, 'kind': 'ece-legacy-explicit-example-item-locators', 'method': METHOD,
              'sourceSha256': SOURCE_SHA, 'sourcePageCount':44,
              'priorEnumerationSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'sourceRights':'citation_only', 'sourceTextStored':False,
              'engine':{'pymupdf':fitz.VersionBind,'mupdf':fitz.VersionFitz},
              'scopes':scopes, 'items':rows, 'totals':{'sampleModuleScopes':len(openings), 'additionalHumanitiesScopes':1,
                                                     'explicitAppearances':len(rows), 'bySectionKind':dict(sorted(counts.items()))},
              'examplesAreUniversalAdditionalRequirements':False, 'allRequirementsEnumerated':False,
              'effective2024ApplicabilityApproved':False,'uniqueRequirementCount':None,'eligibility':dict(ELIGIBILITY)}
    with args.output.open('x',encoding='utf-8') as output: output.write(canonical(result)+'\n')
    print(json.dumps(result['totals']))


if __name__=='__main__':main()
