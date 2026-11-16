# General Medicine candidate identity registry readback

Draft PR #415. A read-only production query checked the same learner catalogue row used by the Owner API (catalogue version 448), and the Admin-private accepted identity registry, for the 14 candidates from the Medicine scope review. The catalogue had one concept and the private registry had 12 acceptance records at query time. No exact candidate was found in either registry. A follow-up search over IDs and labels for the relevant disease and assessment terms found no alternative in the queried registries. Synonyms outside those terms still require review.

| Candidate ID | Learner catalogue | Private acceptance |
| --- | --- | --- |
| `infectious:malaria:relapse-vivax-ovale` | Absent | Absent |
| `infectious:rabies:category-iii-rig` | Absent | Absent |
| `infectious:rabies:id-pep-schedule-india` | Absent | Absent |
| `infectious:rabies:im-pep-schedule-india` | Absent | Absent |
| `infectious:rabies:pep-wound-washing` | Absent | Absent |
| `infectious:rabies:vaccine-injection-site` | Absent | Absent |
| `respiratory:asthma:gina-mart-ics-formoterol-only` | Absent | Absent |
| `respiratory:asthma:gina-mart-step3` | Absent | Absent |
| `respiratory:asthma:gina-steps1-2-air-only` | Absent | Absent |
| `respiratory:asthma:gina-track1-preferred` | Absent | Absent |
| `respiratory:copd:exacerbation-antibiotic-indications` | Absent | Absent |
| `respiratory:copd:exacerbation-initial-short-acting-bronchodilator` | Absent | Absent |
| `respiratory:copd:exacerbation-systemic-steroid-five-days` | Absent | Absent |
| `respiratory:copd:post-bd-fev1-fvc-below-0-7` | Absent | Absent |

## Disposition by source row

| Source row | Scope for identity review |
| --- | --- |
| GM26.24 | Compare the existing rabies intake proposals and any pending identity drafts. Separate clinical rabies from exposure prevention, and check whether each prevention decision warrants a separate identity or an objective under a shared identity. |
| GM26.29 | Review the malaria relapse intake proposal as a narrow component of parasite biology. Keep presentation, complications and management open, and preserve the distinct prescribing task in GM26.30. |
| GM28.11 | Review the COPD spirometry intake proposal as one interpretation decision. Preserve broader pulmonary function test interpretation. |
| GM28.17 | Review related asthma intake proposals together for identity overlap. Keep asthma and COPD maintenance assessment decisions distinct. |
| GM28.18 | Review the three COPD exacerbation intake proposals together. Preserve separate acute asthma assessment and retain the broader exacerbation row for review. |

Treat the repository IDs as intake candidates. Check pending proposals and alias collisions before allocating any ID, then submit supported identity proposals through the owner review flow. Identity acceptance, source alignment and clinical approval remain separate. This check made no registry writes and accepted no links.
