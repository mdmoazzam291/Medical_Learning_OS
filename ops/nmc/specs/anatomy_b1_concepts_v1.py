"""Anatomy part B1 v1: AN44-AN56 from anatomy_b_concepts_v1.py (links outside scope dropped)."""
import re as _re
exec(open('ops/nmc/specs/anatomy_b_concepts_v1.py').read())
VERSION = 'part-b1-v1'
SCOPE_CODES = tuple(x for x in SCOPE_CODES if _n(x) <= 56)
for _c in C: _c['links'] = [l for l in _c['links'] if _n(l[0]) <= 56]
C = [_c for _c in C if _c['links']]
