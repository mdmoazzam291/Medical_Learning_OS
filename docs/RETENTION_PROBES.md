# Retention probe readiness

Retention probes exist to measure whether learning survives delay and transfers beyond the exact item that produced the original evidence. They must not become a mechanism for manufacturing convenient data.

## Current stage

M11b begins with a **readiness gate**, not a probe scheduler.

`study_retention_probe_readiness_v1()` audits the reviewed content graph and answers:

- how many distinct published questions exist;
- how many published primary concepts exist;
- which concepts have at least two distinct published question identities;
- how many alternate-item pairs are structurally possible;
- whether an in-review alternate candidate already exists for a currently published concept.

A second version of the same question does **not** count as an alternate item. Retention/transfer measurement needs a distinct question identity so content revision is not mistaken for item novelty.

## Non-negotiable boundaries

- Do not pull the same item forward merely to create a research observation.
- Do not treat a second version of the same question as transfer.
- Do not let an `in_review` item enter a real learner probe.
- New probe items require the normal Medical, References and Rights gates before publication.
- Shared primary-concept identity is necessary for a concept-level alternate probe, but not sufficient to prove comparable difficulty, novelty or transfer validity.
- Probe scheduling remains disabled until a separately versioned protocol is preregistered.
- Analysis horizons must be fixed before the first protocol-governed probe assignment; they must not be retrofitted after seeing outcomes.
- The existing M11a projection remains the outcome-linkage layer. M11b must not create another learner-history authority.

## Current live result

The production catalog currently has:

- 6 published question versions;
- 6 distinct published question identities;
- 6 distinct published primary concepts;
- 0 concepts with two distinct published questions;
- 0 published alternate-item pairs;
- 0 in-review alternate candidates on those six published concepts.

Therefore the product is **not structurally ready** for an alternate-item retention probe.

This is preferable to silently using the original item. Same-item delayed retrieval remains useful retention evidence through M11a, while alternate-item probing waits for valid content.

## Next transition

The next M11b transition should occur only when at least one distinct alternate item for a published primary concept has passed the normal production review gates. At that point, preregister the probe horizons, item-pair eligibility/novelty rules, assignment logic, contamination rules, analysis metrics and stop criteria **before** the first probe assignment.

No arbitrary population-size or accuracy threshold is frozen by this readiness slice.
