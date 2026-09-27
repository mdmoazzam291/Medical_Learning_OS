# M07c inference activation gate

Status: activation contract implemented; probabilistic learner-state inference remains inactive.

## Why this exists

A model can produce a probability long before that probability is trustworthy.

Medical Learning OS therefore separates:
1. ability to compute a prediction;
2. permission to run hidden shadow inference;
3. permission to enter a controlled intervention experiment;
4. permission to influence general production.

Only the first three are represented today. General production requires a later explicit governance decision.

## Contract

Gate ID: `digital-twin-inference-activation-v1`.

Pure implementation:
- `src/domain/inference-activation-gate.js`

No database state is required by the gate.

## Candidate preregistration

Before evaluation, every candidate must lock:
- model ID/version;
- evaluation plan ID;
- SHA-256 plan digest;
- observed outcome/target contract;
- simple baseline comparator;
- evidence-sufficiency criteria;
- offline validation metrics + pass thresholds;
- declared claim scope.

Thresholds are candidate-specific. The gate does not contain a universal learner count, event count, Brier score, ECE, or effect-size threshold.

A future research plan should justify those thresholds through expected outcome frequency, calibration/power requirements, intended use, and risk.

## Claim scope

A candidate declares whether it claims:
- knowledge;
- retention;
- transfer.

Retention requires an observed delayed-outcome definition.

Transfer requires a genuinely distinct observed transfer outcome. Recall/question repetition alone cannot validate a transfer claim.

## Gate modes

### blocked

The candidate cannot be used for inferred learner state.

Typical blockers:
- preregistration was not locked before evaluation;
- leakage check failed;
- holdout was not frozen;
- uncertainty or missingness behavior is undefined;
- subgroup evaluation is undefined;
- evidence minima were not reached;
- a preregistered offline metric failed;
- a claimed retention/transfer dimension lacks an observed outcome.

### shadow_only

The candidate passed preregistered evidence and offline validation gates.

Allowed:
- compute hidden predictions;
- log them in a future explicitly non-authoritative shadow store;
- compare them with later observed outcomes.

Not allowed:
- learner-visible mastery;
- Study Now weighting;
- Adaptive Teaching changes;
- exam readiness changes;
- replacing observed evidence;
- production decisions.

### eligible_for_controlled_experiment

Requires everything needed for shadow mode plus:
- completed prospective shadow period;
- preregistered prospective metrics present and passing;
- subgroup guardrails passed;
- rollback plan;
- monitoring plan;
- exact model version pinned;
- intervention attribution ready.

This status means only that a separately governed controlled experiment may use the model.

It does **not** authorize general production.

## Production activation

Not implemented.

A future production ADR should require evidence from the prospective/controlled phase and should specify:
- intended product use;
- calibration/uncertainty display;
- rollback criteria;
- subgroup failure policy;
- monitoring/drift response;
- interaction with Study Now and Adaptive Teaching;
- learner-facing communication;
- model/version retirement behavior.

## Relationship to canonical learner evidence

The activation gate never rewrites evidence.

Observed events remain canonical.

Future inferred state must be a rebuildable, versioned projection carrying:
- model ID/version;
- evidence cutoff;
- uncertainty;
- claim scope;
- activation/governance status.

## Test values

Numbers appearing in unit tests are synthetic fixtures used to exercise comparison logic. They are not product thresholds and must not be copied into a future preregistration plan without independent justification.
