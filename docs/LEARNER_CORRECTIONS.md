# Learner-private corrections and canonical error reports

## Core rule

A learner may disagree with or rewrite medical content **for themselves** without mutating canonical content, another learner's view, scoring, mastery, Study Now, revision scheduling, or publication state.

The implementation extends the existing NeuralVault personal-annotation layer. It does not create a competing learner-note system.

## Two lanes

### 1. My correction

A private correction is a learner-scoped editable overlay bound to one exact reviewed target:

- a published canonical NeuralVault note version; or
- a published question version.

The correction stores the exact target identity and SHA-256 observed when it was created. Only one active private correction exists per learner × exact target. The learner can edit or delete it with the existing optimistic-revision annotation controls.

Canonical content remains visible beside the correction. A correction never silently replaces it.

When the shared target changes, the UI surfaces that state:

- current;
- canonical note updated;
- question version retired;
- target unavailable.

Private corrections are included in the learner's existing NeuralVault export because they are part of the same learner-owned annotation layer.

### 2. Report possible canonical error

A learner may separately submit an immutable issue report for the exact target snapshot with one category:

- possibly incorrect;
- possibly outdated;
- ambiguous;
- missing context;
- other.

Optional details may be supplied.

A private correction is **not** copied into the shared report by default. It is included only when the learner explicitly selects **Include my private correction text in this report**. The report stores a copy of the text at submission time; later private edits do not rewrite historical report evidence.

Reports have:

- no canonical-content authority;
- no publication authority;
- no learner-model authority;
- no Study Now or scheduler effect.

Repeated reports may later inform content-quality triage, but report count can never establish medical truth by popularity.

## Why canonical content is not directly editable

Direct learner mutation of canonical medicine creates several failure modes:

- one learner's misconception can become another learner's teaching;
- authoritative and personal provenance become indistinguishable;
- source/version review is bypassed;
- question answer keys can diverge from explanations;
- learner-model evidence becomes impossible to interpret;
- a later canonical update can silently overwrite or conflict with personal changes.

The overlay design preserves agency without sacrificing provenance.

## Concept boundary

Current canonical concepts are structural anchors: ID, label, aliases and subject tags. They are not standalone versioned medical prose. Therefore M06d does not create a concept-edit authority.

If a concept has a published canonical note, the learner can correct that note privately. If no canonical note exists, an ordinary personal annotation remains the correct learner-owned surface.

If concepts later gain versioned semantic definitions or clinically meaningful graph assertions, those claims should get their own canonical review/version contract before private correction targeting is extended to them.

## Future quality flywheel

The intended loop is:

learner notices issue
→ private correction protects their own workflow immediately
→ optional exact-version report creates content-quality evidence
→ AI/human triage groups and verifies reports
→ reviewed canonical version is corrected if warranted
→ learners with stale private corrections are warned
→ future learners receive improved canonical content

This converts learner disagreement into a data-quality signal without allowing user edits to become medical authority.
