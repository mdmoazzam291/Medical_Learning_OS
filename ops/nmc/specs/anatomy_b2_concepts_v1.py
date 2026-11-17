"""Anatomy part B2 v1: AN58-AN82 from anatomy_b_concepts_v1.py, built after B1 was accepted so shared
concepts (e.g. Cerebrospinal fluid for AN63.1) reuse accepted identities."""
import json as _json, glob as _glob
exec(open('ops/nmc/specs/anatomy_b_concepts_v1.py').read())
VERSION = 'part-b2-v1'
SCOPE_CODES = tuple(x for x in SCOPE_CODES if _n(x) >= 58)
for _c in C: _c['links'] = [l for l in _c['links'] if _n(l[0]) >= 58]
C = [_c for _c in C if _c['links']]
for _f in sorted(_glob.glob('docs/evidence/2026-11-17-nmc-anatomy-b1-objective-bindings-v1.json')):
    for _x in _json.load(open(_f))['concepts']: EXISTING.setdefault(_x['label'], _x['conceptId'])
