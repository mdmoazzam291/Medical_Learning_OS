"""Verify proposal evidence locally without exporting NMC source prose.

Usage: python ops/nmc/verify_objective_draft_sources.py /path/to/pinned.pdf
Requires the source PDF used for the reference catalogue and PyMuPDF 1.26.6.
This verifies reconstructed row hashes and existing literal-mention evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path
from build_reference_catalogue import raw_cell

ROOT = Path(__file__).resolve().parents[2]


def verify(pdf):
    import fitz
    pack = json.loads((ROOT / 'data/nmc-learning-foundation-drafts.json').read_text())
    blob = pdf.read_bytes()
    if hashlib.sha256(blob).hexdigest() != pack['sourceSha256'] or fitz.VersionBind != '1.26.6':
        raise ValueError('pinned_source_and_engine_required')
    with fitz.open(stream=blob, filetype='pdf') as doc:
        for binding in pack['sourceBindings']:
            page = doc[binding['sourcePage'] - 1]
            words = [list(fitz.Rect(w[:4]) * page.rotation_matrix) + [w[4]] for w in page.get_text('words')]
            body = raw_cell([w for w in words if binding['rowBBox'][1] <= (w[1] + w[3]) / 2 < binding['rowBBox'][3]])
            if hashlib.sha256(body.encode()).hexdigest() != binding['sourceBodySha256']:
                raise ValueError('source_body_hash_mismatch')
            # Only these two proposals are in this bounded batch. PDF typography
            # uses whitespace/line breaks between name components.
            if binding['basis'] == 'literal-name-in-source-row' and (binding['namedConcept'] != 'Brown-Sequard syndrome' or not all(term in body.lower() for term in ['brown', 'sequard'])):
                raise ValueError('named_concept_mention_missing')
    return {'sourceSha256': pack['sourceSha256'], 'verifiedProposedBindings': len(pack['sourceBindings']),
            'clinicalEquivalenceApproved': False, 'sourceProseExported': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    print(json.dumps(verify(parser.parse_args().pdf)))
