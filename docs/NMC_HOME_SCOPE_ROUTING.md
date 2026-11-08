# NMC names-only scope routing — 8 November 2026

This is an editorial routing proposal derived from existing task packets, not official-source revalidation or an accepted canonical mapping. Organizer labels provide authoring context; they are not automatically concepts. The original gap queue and graph remain unchanged: 357 proposed links and 50 unresolved canonical facet homes.

| Organizer label | Type | Facets |
| --- | --- | --- |
| poisoning and envenomation | mixed-clinical-context | 4 |
| bone marrow examination | procedure-family | 1 |
| reproductive maternal newborn and child health | care-context | 4 |
| gastrointestinal and liver disease | mixed-clinical-context | 3 |
| medical practice | professional-context | 4 |
| prescribing | professional-context | 4 |
| maternal and child care | care-context | 4 |
| wounds | mixed-wound-context | 8 |
| medicine information | professional-context | 2 |
| rational medicine use | professional-context | 3 |
| female reproductive function | clinical-family | 1 |
| abortion care | care-context | 2 |
| neurodegenerative disease | clinical-family | 1 |
| obstetric and gynaecological care | care-context | 1 |
| torture | care-context | 4 |
| surgical care | care-context | 3 |
| scleral disease | clinical-family | 1 |

All 17 groups and 50 facets retain exact component IDs and source references. Each group also retains its source task packet path, reference ID, code, page, row coordinates, body hash and assessment mode. No teaching content or new objective wording was added.

## Routing outcomes

- 31 facets: care/professional context only; specific canonical mapping remains open.
- 10 facets: investigate a specific concept home, without inheriting the mixed organizer as a canonical identity.
- Four facets: retain broad procedure/disease/function families until narrower scope is established.
- Five facets: cross-cutting scope review, including growth/deficiency signs, injury determinants and causes of death.

## Exact next actions

1. Reuse the existing component/name inventory for the 19 non-context facets; inspect exact source scope before proposing targets. Keep bone marrow aspiration/biopsy and interpretation separate, and avoid treating neurodegeneration as equivalent to parkinsonism.
2. For the 31 context facets, propose individual concept/objective targets without converting navigation contexts into one assessed concept. Preserve supervision and assessment modes from source tasks.
3. Refresh registry metadata before proposing canonical reuse/allocation. Existing draft-task metadata are not official medical/source validation.
4. Continue the 2,007 unassessed parent labels, 21 source exceptions and learner integration separately. No full-foundation completion is implied.

## Reproduce structural verification

```sh
node ops/nmc/verify-home-scope-dispositions.js
node ops/nmc/verify-home-scope-gap-queue.js
node ops/nmc/report-facet-home-links.js --verify
node ops/nmc/verify-name-role-proposals.js
```

The new verifier detects omitted groups/facets, changed source bindings or hashes, invalid context routing and false acceptance flags. It does not establish clinical truth or semantic equivalence.
