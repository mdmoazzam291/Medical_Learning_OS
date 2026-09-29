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


## M11d learner opt-in path

The beta now has an explicit learner-controlled opt-in/withdrawal path for the preregistered retention-feasibility protocol.

Consent evidence is:
- append-only;
- learner-scoped from the authenticated server identity;
- bound to the exact preregistered protocol SHA-256;
- idempotent when the learner repeats the same current decision;
- reversible for future assignments through a new `withdraw` event.

The learner-facing Account screen states the protocol horizon and burden caps before opt-in:
- target around day 7;
- acceptable day 6–8 window;
- at most one probe assignment per learner per 7 days;
- at most 20 assignments in the feasibility protocol;
- due revision and mistake-repair work may not be displaced.

**No learner is enrolled automatically.** Creating the opt-in path does not schedule a probe, activate the protocol, change Study Now, or alter mastery/forgetting inference.

System-level activation readiness may now report `learnerOptInPathAvailable=true`, but actual assignment would still require:
1. a current human-validated retention-comparable pair;
2. that learner's current opt-in state;
3. separate activation authorization;
4. later bounded scheduling logic.


## M11f1 activation authorization

Activation authorization is a separate governance event from:
- content publication;
- transfer-pair validation;
- learner consent;
- probe scheduling.

An `authorize` event is accepted only when all of the following are true:
1. the caller is the singleton content admin;
2. `retention-probe-feasibility-v1` is still the current preregistered protocol and the exact protocol SHA-256 matches;
3. the selected pair-validation receipt is current, human-authored, still bound to the exact published question versions and marked retention-probe comparable;
4. at least one learner is currently opted in to that exact protocol;
5. requested assignment caps do not exceed the preregistered limits;
6. the authorization window is future-dated and no longer than 56 days.

Authorization evidence is append-only. Revocation is a new immutable event, not a mutation. Revocation must remain available even if the pair later becomes stale or learners withdraw.

**M11f1 still does not schedule a single probe.** A later bounded scheduler must separately consume only an active authorization and re-check learner consent at assignment time.


## M11f2 dormant scheduler kernel

M11f2 defines the mechanics of a bounded assignment without turning them on automatically.

A candidate exists only when:
1. an active, unexpired M11f1 authorization exists;
2. the exact human-validated retention-comparable pair is still current and both versions remain published;
3. the learner's current consent is `opt_in`;
4. that consent predates the origin attempt;
5. the activation authorization predates the origin attempt;
6. the origin attempt falls into a day 6–8 delivery window at evaluation time;
7. the target alternate has never been attempted;
8. no observed same-concept attempt occurred after the origin;
9. no overdue revision, unresolved latest-incorrect item or open study session should take priority;
10. protocol-wide, authorization-wide and rolling per-learner assignment caps remain available;
11. the 56-day feasibility horizon has not expired.

The kernel can be invoked only through a service-role RPC. **No cron, browser route, Admin run button or learner delivery path is enabled.**

A future delivery surface must call `study_retention_probe_delivery_readiness_v1()` immediately before showing the target item. Any withdrawal, authorization revocation/expiry, stale pair/content, out-of-window timing, target exposure, same-concept contamination or higher-priority due/mistake work makes the assignment non-deliverable.

An assignment is scheduling evidence, not proof that the learner saw or answered the item. Delivery/exposure and response evidence must remain separate later events.
