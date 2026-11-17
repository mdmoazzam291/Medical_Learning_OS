"""Anatomy part A1 v1: AN1-AN20 only. Part A (AN1-AN43, 127 new concepts) timed out in the acceptance
RPC (8 s statement timeout), so it is accepted in two smaller batches. Concepts and wording come from
anatomy_a_concepts_v1.py; links outside this scope are dropped here and carried by part A2."""
import re as _re
exec(open('ops/nmc/specs/anatomy_a_concepts_v1.py').read())
VERSION = 'part-a1-v1'
_n = lambda code: int(_re.match(r'AN\s?(\d+)', code).group(1))
SCOPE_CODES = tuple(x for x in SCOPE_CODES if _n(x) <= 20)
for _c in C: _c['links'] = [l for l in _c['links'] if _n(l[0]) <= 20]
C = [_c for _c in C if _c['links']]
