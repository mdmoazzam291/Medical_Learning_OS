# Implementation roadmap

Status: DONE means implemented and checked; NEXT means the next bounded task; PLANNED means not implemented. IDs remain stable as sub-tasks are added.

| ID | Parent category and ownership | Deliverable / exit condition | Status |
|---|---|---|---|
| M00 | Project governance and memory | README, AI instructions, decision log, roadmap, working verification commands | DONE |
| M01 | Learning data foundation | Versioned attempt contract and deterministic accuracy projection with retry protection | DONE |
| M02 | Canonical knowledge and content | Concept IDs, versioned questions, references, licensing provenance and draft/review/publish workflow | DONE |
| M03 | Learner application and access | Responsive shell, learner settings, identity strategy, storage choice and accessible navigation | DONE |
| M04 | Core study loop and QBank | Start/resume, answer, explanation, bookmark, incorrect queue, persistence and end-to-end checks | IN PROGRESS |
| M05 | Revision and study planning | Due queue, configurable workload, tested scheduler, interruption-friendly intern mode | PLANNED |
| M06 | NeuralVault | Canonical concept notes, personal annotations, search, export and update-safe links | PLANNED |
| M07 | Digital Twin and diagnostics | Evidence-backed learner projections, Mistake Fingerprint, uncertainty and actionable analytics | PLANNED |
| M08 | Exam adapters and simulation | Versioned exam rules, Exam DNA/PYQ provenance, mocks and GT Autopsy | PLANNED |
| M09 | AI and adaptive teaching | Provider adapters, grounded explanations, evaluation set, cost limits and review gates | PLANNED |
| M10 | Multimodal and clinical learning | Licensed images, annotations, finding-first exercises, later voice/video encounters | PLANNED |
| M11 | Research and quality validation | Retention endpoints, intervention experiments, data-quality monitoring and outcome review | PLANNED |
| M12 | Community and educator platform | Moderation, verified contributions, import/API contracts and quality-controlled marketplace | PLANNED |
| M13 | Institutions and sustainable business | Privacy-scoped faculty views, entitlements, unit economics and institutional pilots | PLANNED |
| M14 | Operations and scale | Deployment, recovery drills, observability, security review and capacity evidence | PLANNED |

## Dependency rules
M00 → M01 → M02 → M03 → M04 is the first delivery path. M05 and M06 follow the persisted core loop. M07 needs sufficient longitudinal data. M08 builds on content provenance and question versions. M09 needs reviewed sources and evaluations. M10 reuses content/versioning. M12/M13 wait for a useful individual product. M11 measurement design and M14 basic security start during M03; advanced research and scale arrive later.

## Completed M02 tasks
- [x] Define concept and question-version schemas with stable IDs and references.
- [x] Add a small original content fixture, clearly marked draft until medically reviewed.
- [x] Validate answer-option IDs, concept links, provenance and review status.
- [x] Reject unpublished content from learner-facing selection.
- [x] Document the review and update workflow; preserve earlier question versions.

## Completed M03 / immediate M04 task
M03 includes the responsive shell, local storage/identity contract and nonclinical study-session path, verified at phone/tablet/desktop Chromium sizes. M04 is next: authorized application services, server persistence, trusted scoring and reviewed medical content. Local demo progress is not production medical evidence.

## MVP release gate
M02–M06 minimal paths work together; progress survives reload; data export works; errors do not lose attempts; content is reviewed; responsive flows are exercised; no secrets reach clients. Later systems are not release prerequisites.

## M04 slices
- M04a — DONE: credential-scoped server API, SQLite persistence, trusted scoring, publication eligibility, immutable receipts, retries, bookmarks, export and failure/restart tests. Local and GitHub checks passed.
- M04b — IN PROGRESS: local Supabase Auth and account UI/API path implemented; real account/browser verification, durable cloud learning-state storage and recovery still required. No browser-stored operator credential shortcut.
- M04c — PLANNED: authenticated reviewer workflow, genuinely reviewed initial medical set and full medical study-loop validation.

M04 is not complete until all three slices and the medical learner flow pass their release gates.
