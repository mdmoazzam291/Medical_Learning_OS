# NMC concept discovery implementation

Goal: open existing canonical learning material from curriculum topic groups without duplicating content or inventing clinical equivalence.
Spec: ../specs/2026-11-04-nmc-concept-discovery.md

- [x] Test exact label/alias matching, stable IDs, generic subject scope, ambiguous names and unique content counts.
- [x] Add pure discovery projection and identity-bound GET loader; test guest, account-change and failure paths.
- [x] Add per-topic lookup panels with canonical links and distinct empty/guest/retry states; reject stale asynchronous results and clear session-bound panels.
- [ ] Extend Chromium/WebKit viewport checks with synthetic authenticated library, no-match/outage/guest and logout cases; run repository tests/check/build and independent review.
- [ ] Save feature PR, handoff and precise verification. No source/clinical acceptance or new content publication.

Local unit/check/build and independent review pass. Hosted browser checks, feature PR and final checkpoint remain pending at code eee8a5d0.

Follow-up code b40e2f9f: real catalog446 has10registered concepts/6published questions/6published notes and zero exact topic-name matches. Empty results now browse the existing subject/full concept explorers. All1,557tests/check and extended local Chromium viewport flows pass; independent review clear. Hosted verification/release remains pending.
