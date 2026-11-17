"""Anatomy part A2 v1: AN21-AN43, built after part A1 was accepted so concepts shared with A1
(e.g. Ossification for AN26.6) reuse A1's accepted identities. Concepts and wording come from
anatomy_a_concepts_v1.py; links outside this scope are dropped."""
import re as _re, json as _json, glob as _glob
exec(open('ops/nmc/specs/anatomy_a_concepts_v1.py').read())
VERSION = 'part-a2-v1'
_n = lambda code: int(_re.match(r'AN\s?(\d+)', code).group(1))
SCOPE_CODES = tuple(x for x in SCOPE_CODES if _n(x) >= 21)
for _c in C: _c['links'] = [l for l in _c['links'] if _n(l[0]) >= 21]
C = [_c for _c in C if _c['links']]
for _f in sorted(_glob.glob('docs/evidence/2026-11-17-nmc-anatomy-a1-objective-bindings-v1.json')):
    for _x in _json.load(open(_f))['concepts']: EXISTING.setdefault(_x['label'], _x['conceptId'])
