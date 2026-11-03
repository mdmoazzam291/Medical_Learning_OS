"""Legacy skill-training examples: reference occurrences and objective-section blocks."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest
from pandemic_nested import locate_sections

SOURCE_SHA = '3e267665af122cb7fd238151d73516e278eb800464836f0b19a6ee660dec0c4e'
METHOD = 'legacy-skills-sample-sections-v1'
CODE = re.compile(r'\b([A-Z]{2,4})\s*\d{1,3}\s*\.\s*\d{1,3}\b')
HEADING = re.compile(r'(?im)^[ \t]*(?:\d+\.[ \t]*)?(Objectives)[ \t]*:?[ \t]*$')
STOP = re.compile(r'(?im)^[ \t]*(?:\d+\.[ \t]*)?(?:\uf0b7[ \t]*)?(?:Suggested Teaching Learning Methods?|Background Knowledge|Background Information|Learning Experiences?|Skill assessment|Assessment|Equipment|Setting/Equipment)\b')


def references(text, module, page):
    result = []
    for match in CODE.finditer(text):
        row = {'moduleId':module,'pdfPage':page,'startChar':match.start(),'endChar':match.end(),
               'sourcePrefix':match.group(1),'rawSpanSha256':digest(match.group()),
               'whitespaceCollapsedCodeSha256':digest(re.sub(r'\s','',match.group())),
               'locationScope':'sample_module_range_not_semantic_role'}
        row['appearanceId']=digest(canonical(dict(row,sourceSha256=SOURCE_SHA,method=METHOD)))
        result.append(row)
    return result


def objective_blocks(pages,module):
    # Preserve entire explicitly headed section; lettered/bulleted objectives
    # are not converted into a falsely precise item count.
    return locate_sections(pages,module,SOURCE_SHA,heading_pattern=HEADING,stop_pattern=STOP,
                           kind_for_heading=lambda _: 'sample_objective_section_block',method=METHOD,
                           number_marker_pattern=r'(?!)')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();data=args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    if args.output.suffix!='.json':raise ValueError('invalid_output_path')
    path=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-supplement-requirement-enumeration.json'
    manifest_bytes=path.read_bytes();openings=json.loads(manifest_bytes)['skills']['sampleModuleOpenings']
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    scopes,refs,blocks=[],[],[]
    with fitz.open(stream=data,filetype='pdf') as document:
        if len(document)!=56:raise ValueError('page_count_mismatch')
        for index,first in enumerate(openings):
            last=openings[index+1]-1 if index+1<len(openings) else 56
            module='skills2019:sample:'+str(index+1)
            pages=[(n,document[n-1].get_text()) for n in range(first,last+1)]
            found_refs=[r for n,text in pages for r in references(text,module,n)]
            found_blocks=objective_blocks(pages,module)
            refs.extend(found_refs);blocks.extend(found_blocks)
            scopes.append({'localScopeId':module,'pdfRange':[first,last],
                           'referenceAppearances':len(found_refs),'explicitObjectiveBlocks':len(found_blocks),
                           'explicitObjectiveHeadingLocated':bool(found_blocks)})
    result={'schemaVersion':1,'kind':'legacy-skills-example-reference-and-section-locators','method':METHOD,
            'sourceSha256':SOURCE_SHA,'sourcePageCount':56,
            'priorEnumerationSha256':hashlib.sha256(manifest_bytes).hexdigest(),
            'sourceRights':'citation_only','sourceTextStored':False,
            'engine':{'pymupdf':fitz.VersionBind,'mupdf':fitz.VersionFitz},
            'scopes':scopes,'references':refs,'objectiveSectionBlocks':blocks,
            'totals':{'sampleScopes':len(scopes),'referenceAppearances':len(refs),
                      'distinctWhitespaceCollapsedCodeDigests':len({r['whitespaceCollapsedCodeSha256'] for r in refs}),
                      'explicitObjectiveBlocks':len(blocks),'prefixAppearanceCounts':dict(sorted(Counter(r['sourcePrefix'] for r in refs).items()))},
            'individualObjectivesEnumerated':False,'referenceSemanticRolesApproved':False,
            'legacyPrefixAliasesApplied':False,'examplesAreUniversalAdditions':False,
            'effective2024ApplicabilityApproved':False,'eligibility':dict(ELIGIBILITY)}
    with args.output.open('x',encoding='utf-8') as output:output.write(canonical(result)+'\n')
    print(json.dumps(result['totals']))


if __name__=='__main__':main()
