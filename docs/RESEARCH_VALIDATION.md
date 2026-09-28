# M11 research and outcome validation

Status: M11a delayed-outcome measurement foundation is live. No causal or mastery inference is enabled.

## Governing objective

Medical Learning OS should optimize **durable medical mastery per learner minute**, not activity volume. Research endpoints must therefore distinguish immediate performance from delayed retention, transfer, calibration, error recurrence and efficiency.

## Outcome hierarchy

The long-term research hierarchy is:

1. acquisition / immediate performance;
2. delayed retention;
3. transfer to a different item or representation;
4. calibration;
5. learning efficiency;
6. error recurrence;
7. exam performance;
8. clinical competence and later real-world behavior.

Engagement remains operational telemetry, not proof of learning.

## M11a: delayed retrieval observation contract

`study_delayed_retrieval_observations_v1(learner)` is a service-only, rebuildable projection over existing immutable evidence.

For every exact question attempt it preserves:

- exact origin attempt, question version, canonical concept and timestamp;
- origin correctness and response time;
- optional explicit memory rating;
- originating Study Now recommendation/reason when one exists;
- every schedule-policy decision recorded at that evidence cutoff;
- the **first later retrieval of the same exact question version**;
- exact elapsed milliseconds to that retrieval;
- the first later different-question attempt on the same canonical concept as a **transfer candidate**;
- how many same-item retrievals occurred before that transfer candidate.

The first later same-item retrieval is used because a second later retrieval after another exposure is already affected by that intervening exposure. The system does not erase later attempts; each later attempt becomes its own future origin.

## Delay coverage

The projection reports only data-availability counts at or beyond:

- 1 day;
- 7 days;
- 30 days;
- 90 days;
- 180 days.

These are not retention scores and do not imply that an opportunistic follow-up is equivalent to a randomized retention probe.

## Transfer boundary

A different question sharing a canonical concept is only a **transfer candidate**. It does not become validated transfer evidence until future content metadata establishes sufficient novelty/comparability and the analysis protocol defines acceptable intervening exposures.

## Authority boundary

M11a:

- does not write new learner evidence;
- does not calculate mastery, half-life, retention probability or forgetting rate;
- does not alter Study Now, revision due dates, FSRS shadow output or Digital Twin state;
- does not claim causal effect;
- is unavailable to browser roles.

Its job is to make future validation possible without rewriting history.

## Current evidence gap

The current live beta history contains repeated retrievals, but none yet reaches even one full day after the immediately preceding exposure for the most active learner. That is useful evidence of **insufficient delayed-outcome coverage**, not a failure to be hidden.

The next research step should be a preregistered retention-probe protocol or naturally accumulated delayed follow-up, not a hand-designed forgetting model trained on near-immediate retries.


## M11b1: preregistered alternate-item feasibility protocol

Production now has its first reviewed and published alternate-item pair on the anaphylaxis first-line-treatment concept.

Before any protocol-governed assignment, `retention-probe-feasibility-v1` fixes:

- a 7-day target and 6–8 day completion window;
- distinct-question, same-primary-concept pair identity;
- no prior target attempt;
- contamination exclusions;
- one-probe-per-learner-per-7-days and 20-assignment operational caps;
- explicit learner opt-in requirement;
- descriptive-only outcomes and no causal/mastery inference;
- immediate pause on content-safety, identity/pair-binding or opt-out violations.

This protocol does not activate scheduling. Pair novelty/comparability validation (M11c), an opt-in path and a separate activation decision remain required.
