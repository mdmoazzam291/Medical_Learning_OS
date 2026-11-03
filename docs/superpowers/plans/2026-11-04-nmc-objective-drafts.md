# Structured foundation objective draft implementation

Goal: first real structured objective batch and source-to-canonical proposals, with an Admin inspection surface.
Spec: ../specs/2026-11-04-nmc-objective-drafts.md

- [x] Create ten original objective proposals using existing canonical IDs and two metadata-only Brown-Sequard row bindings; verify pinned source evidence.
- [x] Test and implement strict proposal validation, identity drift and paginated requirement projection; reuse Preparation Curriculum objective validation.
- [x] Add protected read-only Owner API helper/route and existing cloud-owner adapter method; verify non-Admin/method/query denial and no writes.
- [x] Add on-demand Admin Coverage panel with explicit pending/unmapped/stale states; preserve disposal/account boundaries and escaping.
- [x] Run tests/check/build and Chromium/WebKit synthetic flows, independent review and save exact feature checkpoint. No clinical acceptance or active registry mutation.

Progress / rulings:
- Existing feature worktree and plan reused; domain tests first failed with missing module, then passed. Added control/nonprimitive offset rejection regression before fixing primitive validation.
- Source verification stays local to the pinned PDF; only metadata hashes and source positions enter Git. Both row hashes and named-concept mentions verified, not clinical equivalence.
- Admin component is tested through the actual built Admin shell with synthetic identity/HTTP responses; it does not claim a real signed-in production reviewer session.
- Independent review found the server boundary used a classification field rather than raw canonical subjectTags. Reproduced by realistic raw-catalog regression (RED), corrected field projection (GREEN); unchanged and subject-only drift now covered. No other P1/P2 reported.
- Final browser check: Chromium phone/tablet/desktop PASS. Hosted native WebKit new Admin flow and full job PASS, as does Chromium. Full Foundation41731291790 SUCCESS at6ea7177cd0351d4d575fb79a714e4b2b0b75166f.
- Final local verification: all1,572Node tests PASS; check PASS (13services/253coupling locations); Pages build PASS (131files); git diff --check PASS. Remote code43517444/checkpoint6ea7177c verified; PR410 saved; full hosted Foundation41731291790 PASS. Final documentation/evidence-only checkpoint follows. No active curriculum registry, source approval or clinical publication changed.
