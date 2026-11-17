# Product principles

These are durable design rules for the Medical Learning OS. Each is a constraint on what we build, not a feature. When a proposal conflicts with one, change the proposal or record an explicit decision in `docs/DECISIONS.md`.

Objective: maximum durable medical mastery per unit of learner time. Engagement, streaks, question volume and time spent are not goals.

## Learner model

1. **Exam importance is not forgetting rate.** How often a topic is examined (PYQ / Exam DNA) decides *what is worth knowing*. How fast a learner forgets it decides *when to review it*. Keep them as separate inputs to Study Now; never fold yield into a decay parameter or the reverse.
2. **Stable competence is separate from session state.** Mastery and forgetting estimates change only from graded evidence over time. Fatigue, time pressure, a bad session or a streak are session state: they may change today's plan, never the stored competence estimate.
3. **Every estimate carries its uncertainty.** Show "not enough evidence" rather than a confident number. A learner with three attempts on a concept has a wide interval, and the UI and the recommender must both respect that.
4. **Observed evidence and inferred state stay distinguishable.** An answered question is an observation. "Knows X" is an inference. Store and label them separately so an inference can be recomputed when the model changes.

## Recommendation and adaptation

5. **No reinforcement learning or bandits until the basics are measured.** Start with transparent rules: spacing, yield, recent errors, prerequisites. Adaptive policies come only after we have outcome data and a held-out comparison showing the rules are the bottleneck.
6. **Measure transfer, not just retention.** A concept is mastered when the learner answers *new* items on it (different stem, different presentation), not when they recognise items they have seen. Evaluation sets must hold out item families.
7. **No learning-style labels.** "Visual" or "auditory" learner labels lack evidence of benefit and are not used for personalisation. Choose the format by what the content needs (an ECG needs a tracing), not by a learner label.
8. **Misconceptions are first-class.** A wrong answer that picks a specific distractor is evidence of a specific misunderstanding. Distractor-to-misconception links belong in the knowledge graph and drive the next intervention.

## Content and authority

9. **Provenance before publication.** Every learner-visible item names its source and version and keeps stable IDs. AI-drafted content is labelled as such until a human review says otherwise. Never claim faculty or clinical review that did not happen.
10. **Publication is an explicit owner action.** Drafts, accepted identities and Admin previews are not learner content. Nothing reaches learners by default.
11. **Canonical systems over new features.** If a proposal overlaps an existing system (knowledge graph, objective registry, question intelligence), extend that system instead of adding a parallel one.
12. **Exam-specific logic lives in adapters.** NEET-PG and INI-CET differences go in pathway mappings, not in the core objective model, so the core survives syllabus and exam-pattern changes.

## Engineering

13. **Fail closed.** Pinned data that does not match its checksum, a stale identity digest, or a missing overlay row stops the operation; it is never silently skipped.
14. **Append-only history for anything a learner or reviewer relied on.** Revisions add rows; they do not overwrite.
