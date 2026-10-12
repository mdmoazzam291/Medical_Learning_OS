# Navigation release — 12 October 2026

## 2026-10-12 — approved navigation released (PR #206)

- PR [#206](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/206) merged as `950fd2fd01746d02f9d481ddc38c9d3b4cb65b97`. The live learner app now has the single-row brand/five-master/search/theme header, collapsible icon rail, independent nested menus, Subject Index inside Subjects & Topics, persistent device pins and approved lavender appearance.
- Published-content workspaces cover all 19 subject indexes and 76 explicitly tagged modules, source references, Atlas/media, Notes/Questions/Graph, comparison/prerequisites, saved views/bookmarks, source-bound self-review and bounded filtered Build Session. Existing server-scored practice, revision, answer confidence, exact exam rules, private notes/drafts and genuine review/publication remain authoritative. Pin handoffs between Library and Build Session retain correct ownership.
- Verification: 1108/1108 Node tests, syntax/catalog/decision checks, 71-file allowlisted build and three reset-scope tests pass. Final PR Foundation run [38199744138](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38199744138) and main run [38199934813](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38199934813) passed check/browser jobs. Browser coverage exercises phone/tablet/desktop navigation, count selection, pinned handoffs, saved-run reload, preference synchronization, private drafts and all existing journeys. Independent final review reports no blockers.
- Supabase `study-api` v48 is active with all eight files matching reviewed source exactly. Added bounded learner-owned activity/history reads preserve server authentication and existing gateway configuration. Hosted smoke confirms no/invalid-token rejection (401), the learner-origin preflight (200) and unknown-origin rejection (403); required database columns are present.
- Both Cloudflare main production builds passed: learner web `8c9d03cf-11b8-44f3-bdb1-8f7805764086`; heartbeat `5791d087-4294-40e4-8c80-24c040cc3fb4`. The production public Home was inspected in the cloud browser: all five header destinations occupy one row and the left rail is visible. No hosted authenticated answer/run was created. CLI served-byte inspection returns 403, so frontend byte parity is not claimed.
- Remaining boundaries: pins/preferences are device-local; advanced 3D, sequential cases and audiovisual tools require reviewed assets/contracts. Content indexes do not establish curriculum completeness or create medical approval. The known non-production Cloudflare branch-preview failure remains: build `872aa7f8-484e-415f-878c-286a79c2ef75`, no error annotations. Production success does not resolve that provider issue.
- No clinical material was imported, restored, published or invented. Next: receive genuine polished PYQs, validate and stage them, then complete accountable administrator review; separately verify the authenticated hosted journey with actual eligible content.


## Acceptance boundary

CI uses isolated synthetic fixtures against the actual allowlisted built application. Its phone/tablet/desktop results prove UI behavior under those fixtures; they do not prove physical iPad/Safari behavior or learning effectiveness. Public production Home and the single-row navigation were observed directly, while the authenticated hosted content journey awaits eligible reviewed material.

The new learner-owned read projections return bounded metadata; they do not expose response maps, keys, explanations or another learner's history. Publication and existing scored actions stay on their established services. The release did not modify exam rules or create content, approvals or learner events.

The documentation receipt is a follow-up to the verified application release; it changes no application assets or API code.

