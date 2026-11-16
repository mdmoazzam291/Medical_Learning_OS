"""Physiology pilot concept specification v3 (2026-11-16). Supersedes v2 (never accepted).

One change from v2: a concept's classification.subjects lists only subjects evidenced by
its linked NMC source rows. Subjects the editor expects later (v1/v2 extraSubjects) are kept
as `expectedSubjects` on the batch item, outside the accepted document, so they are hints
and not identity claims. Other subjects join a concept when their own rows link to it.
Labels, aliases, splits, types, organs and objectives are unchanged from v2.
"""
from physiology_concepts_v2 import *  # noqa: F401,F403

VERSION = 'v3'
SUPERSEDES = {'batchId': 'nmc-physiology-concepts-v2-20261116',
              'sha256': 'dbc19399b887162a3fbfd30a09a0a34da158ab4d115aca59f4435141e06522a5', 'accepted': False}
EVIDENCED_SUBJECTS_ONLY = True
