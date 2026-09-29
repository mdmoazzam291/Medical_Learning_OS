# Retention probe readiness

Retention probes exist to measure whether learning survives delay and generalizes beyond the exact item that produced the original evidence. They must not become a mechanism for manufacturing convenient data.

## Current stage

M11b now has two completed foundations:

- **M11b0 structural readiness** — `study_retention_probe_readiness_v1()`;
- **M11b1 protocol preregistration** — immutable `retention-probe-feasibility-v1` plus `study_retention_probe_activation_readiness_v1()`;
- **M11c pair-validity substrate** — immutable exact-version pair validation plus service-only validated-transfer observations.

There is still **no probe scheduler** and no activation authority.

## M11b0 structural readiness

`study_retention_probe_readiness_v1()` audits the reviewed content graph and answers:

- how many distinct published questions exist;
- how many published primary concepts exist;
- which concepts have at least two distinct published question identities;
- how many alternate-item pairs are structurally possible;
- whether an in-review alternate candidate already exists for a currently published concept.

A second version of the same question does **not** count as an alternate item. Retention/transfer measurement needs a distinct question identity so content revision is not mistaken for item novelty.

## M11b1 preregistered feasibility protocol

The first protocol is `retention-probe-feasibility-v1`.

Its purpose is narrow: test whether Medical Learning OS can collect clean delayed alternate-item evidence with minimal learner burden. It does **not** estimate mastery, forgetting rate, item equivalence, intervention efficacy or causal effect.

Preregistered choices:

- primary horizon: **7 days**;
- acceptable completion window: **day 6 through day 8**;
- at most **1 probe assignment per learner per 7 days**;
- at most **20 total assignments** in this feasibility protocol;
- at most **56 days from the first assignment**;
- probe work may not displace due or mistake-repair work;
- explicit learner opt-in is required before activation;
- target alternate must have no prior learner attempt;
- origin must be a recorded authenticated question attempt;
- pair must use the same primary concept but a **different question identity**;
- both question versions must be published;
- validated novelty/comparability metadata is required before activation.

The operational caps are safety/feasibility limits, not statistical power claims.

## Contamination rules

A probe is excluded from the clean descriptive analysis if the platform observes:

- another same-concept question attempt between origin and probe; or
- the target alternate being seen before the probe.

Same-item early probing is forbidden.

Outside-platform exposure can remain unobserved, so even a “clean” platform trace is not proof that the learner had no external exposure.

## Outcomes

Primary descriptive outcome:

- correctness on the alternate item inside the 6–8 day window.

Secondary descriptive outcomes:

- alternate-item response time;
- optional memory rating if available;
- completion within the intended window;
- observed contamination rate;
- probe transport failure rate.

No causal inference, hypothesis-testing claim, mastery estimate or forgetting-model fitting is permitted by this protocol.

## Current live result

Production currently has:

- **7 published question versions**;
- **7 distinct published question identities**;
- **6 published primary concepts**;
- **1 concept with a published alternate item**;
- **1 published alternate-item pair**.

The first published alternate pair is on:

`emergency:anaphylaxis:first-line-treatment`

with:

- `emergency:anaphylaxis:first-line-drug@1`;
- `emergency:anaphylaxis:no-rash-first-action@1`.

The alternate passed normal Medical, References and Rights review before separate publication.

## M11c pair validity

M11c adds a separate validity layer before a same-concept alternate can count as validated transfer evidence or as a retention-probe comparator.

`study_transfer_pair_validations` stores one immutable decision for an exact pair of question versions and binds both sides to their current Medical review-target SHA-256. If either exact medical target changes, the validation becomes stale automatically rather than silently transferring to new content.

The validation contract records:

- surface novelty;
- primary-construct alignment;
- reasoning alignment;
- difficulty comparability;
- cue-overlap risk;
- whether the pair is valid for descriptive transfer evidence;
- separately, whether it is comparable enough for the stricter retention-probe use.

A `validated` transfer pair must target the same primary construct, have at least moderate surface novelty, avoid materially different reasoning, and avoid high cue-overlap risk. Retention-probe comparability additionally requires difficulty to be judged comparable or only boundedly different.

The bootstrap validator must hold current Medical, References and Rights reviewer grants and cannot validate a question they authored. This reuses existing human authority without inventing a permanent research-role system before one is needed.

`study_validated_transfer_observations_v1(learner)` remains read-only and descriptive. A follow-up is marked clean only when the target item had no prior learner attempt and no same-concept question occurred between origin and target. Outside-platform exposure can still be unobserved.

Current live pair-validation state:

- total pair validations: **0**;
- validated transfer pairs: **0**;
- validated retention-probe-comparable pairs: **0**.

No human pair judgment has been fabricated.

## Activation state

`study_retention_probe_activation_readiness_v1()` currently returns:

- published alternate pair available: **true**;
- protocol preregistered: **true**;
- validated pair metadata available: **false**;
- learner opt-in path available: **false**;
- can activate: **false**.

Current blockers:

1. validated alternate-pair novelty/comparability metadata;
2. explicit learner opt-in path;
3. separate activation authorization.

This is intentional. Preregistration removes ambiguity; it does not grant permission to schedule a probe.

## Non-negotiable boundaries

- Do not pull the same item forward merely to create a research observation.
- Do not treat a second version of the same question as transfer.
- Do not let an `in_review` item enter a real learner probe.
- New probe items require the normal Medical, References and Rights gates before publication.
- Shared primary-concept identity is necessary for a concept-level alternate probe, but not sufficient to prove comparable difficulty, novelty or transfer validity.
- The existing M11a projection remains the outcome-linkage layer. M11b must not create another learner-history authority.
- Study Now, mastery inference, FSRS authority and Digital Twin inference remain unchanged.

## Next transition

The next research step is one **authorized human M11c pair validation** of the published anaphylaxis alternate pair.

Even if that validation makes pair metadata available, probe activation must remain false until an explicit learner opt-in path exists and a separate activation decision is authorized.
