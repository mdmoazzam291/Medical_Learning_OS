# Connected learning pilot 08

## Purpose and boundary

The user's 2026-09-29 instruction permits the amount of notes/concepts required to exercise meaningful app connections, including one note for one question, one note for many questions, and subject-spanning concepts. This targeted two-question pilot is not another 25-question simulator inventory batch: the 180-item test inventory is already sufficient.

Reuse canonical IDs. Do not clone a medical concept for each subject or tag every concept with all 19 subjects. Subject tags are views, not assertions that every subject connection is clinically relevant. A larger teaching topic should be composed of distinct canonical concepts where needed; do not collapse all medicine into one concept.

## Connected content

| Canonical concept | Note | Assessed question identities after intake | Other connection |
|---|---|---|---|
| `emergency:anaphylaxis:first-line-treatment` | Reuse existing published note; no new version | Original first-line drug + new no-rash scenario | Emergency medicine, pharmacology, immunology |
| `infectious:rabies:pep-wound-washing` | New review candidate | Original wound-wash item + correction 09 water-only scenario | Infectious diseases, community medicine, emergency medicine |
| `infectious:rabies:category-iii-rig` | New review candidate | Original RIG item | Historical secondary context in retired referral item; not a second assessed concept |

Correction 09 supersedes the *pilot design*, not the immutable question identity: `infectious:rabies:washing-before-referral@1` was judged near-duplicate of the published 15-minute washing item before any review was recorded. Its promoted batch remains unchanged for audit. Migration `20260929000000` retires that exact unreviewed version with before/after digests, then the separate intake manifest `content-intake-connected-learning-09-correction.json` adds `infectious:rabies:water-only-without-soap@1`. The new scenario tests what to do when soap/antiviral cleanser is unavailable; its primary concept is still wound washing, but no equivalence or transfer claim is made. The resource-limited question requires its own Medical, References and Rights review and is not published.

New question identities remain `in_review`. Repository note definitions remain `draft`; their separately assigned live UUID/version/status belong to the existing note lifecycle. No generated review approvals or new publication authority are introduced. The existing published note and all previous questions remain unchanged.

## Source check

- CDC, *Preventing and Managing Adverse Reactions*, page date July 25, 2024; checked September 28, 2026. Narrative section on management of acute vaccine reactions supports immediate IM epinephrine and the possibility of anaphylaxis without urticaria. Use the existing canonical source ID; no copying of adapted third-party tables.
- WHO, *Rabies*, page date **September 17, 2026**; checked September 28, 2026. Prevention/PEP and exposure-category sections support the two short original notes and wound-care question. URL: https://www.who.int/news-room/fact-sheets/detail/rabies . New source ID `who:rabies-fact-sheet:2026-09-17` starts with **unknown rights**. Citation-only use is proposed, not approved.
- WHO, *Rabies vaccinations and immunization*, wound-management section; accessed September 29, 2026. When soap or an antiviral agent is unavailable, it advises extensive water washing. URL: https://www.who.int/teams/control-of-neglected-tropical-diseases/rabies/vaccinations-and-immunization . The correction registers a distinct access-dated source ID with **unknown rights**; no copied passage is shipped.
- NRCP pages could not be freshly opened during this task. Existing NRCP-backed content was not edited or represented as newly source-verified. WHO's current accessible page supplies the new rabies claims; no India-specific vaccine schedule is changed.

## Repeatable checks

Run `npm test`, `npm run check`, and `node scripts/content-connections-check.js`.

`content-connections-authoring-v1` is a pure operator/authoring projection, not a learner API or live readiness calculation. It validates note source/concept anchors and reports exact question versions and roles while counting distinct question identities. It rejects malformed drafts, excludes retired items, and does not mutate inputs. Published pair counts are structural only, never equivalent-item or transfer validation.

The normal GitHub PR/main workflow already runs every test via `node --test`. The new suite exercises:

- one note to multiple primary questions;
- one primary question plus a secondary concept connection;
- note-only concepts and more than one draft note;
- synthetic 19-subject views without concept duplication;
- question revisions versus alternate identities;
- invalid sources/concepts/provenance and unpublished boundaries.

Existing suites continue to test QBank/scoring, revision/Study Now, NeuralVault annotations, teaching, exam mode, review, media, evidence integrity and authorization. No claim is made that a small content pilot proves all medical subject coverage, every live feature, or clinical quality. Browser CI uses isolated fixtures; authenticated hosted acceptance remains separate. No continuous paid monitoring service, synthetic learner history or automatic clinical approval is introduced.

## Next gate

Human Medical/References/Rights review of the two questions and two notes, including WHO source rights, then separate publication. Only afterward preregister an alternate-item retention protocol and evaluate novelty/comparability. Same-concept linkage alone never proves transfer, and this pilot does not activate research or reschedule learners.

The reviewer workspace also offers read-only source focus for References on both questions and canonical notes. It groups unique source versions by pending target impact and filters the cards after a reviewer chooses one source. The existing seven-versus-seven claim-first measurement arms remain separate from this focus view. No source inspection or draft packet creates a review event: each exact version still needs an authenticated per-gate decision with independent judgment. This lowers navigation and repeated source-hunting work without adding a paid service or weakening the publication boundary.
