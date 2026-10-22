# Shared NEET-PG and INI-CET preparation foundation

Owner request: implement the supplied combined-pathway design after inspecting existing implementation. Checked 23 October 2026, Asia/Kolkata. Base main: 288b84100cbb64e44702065314727154cecdd7ba. Implementation owner: Codex, isolated branch feat/combined-preparation-pathways-20261023. Existing Library PR296 and dossier PR298 are merged. Graph PR303 is independent and remains untouched. Old AI_HANDOFF workspace-blocker paragraphs are stale relative to merged code and current STATUS/PR receipts.

## Outcome
One canonical catalog, two selectable preparation profiles (NEET-PG and INI-CET), and a combined selection. Preserve each exam's simulation rules, historical provenance and readiness. Changing goals retains all learner evidence, sessions and private notes. Future exam profiles are additive; unfinished pathways are not selectable.

## Existing foundations
Canonical concept/version identities, exclusive PYQ-first homes, shared Library projections, responsive workspace, server-scored attempts/revision and versioned exam rules already exist. Do not recreate them. No objective-to-exam suitability registry or synced preparation preference exists.

## Contracts
Add provider-independent versioned pathway, objective, requirement and artifact-binding contracts. Requirement mappings carry exact pathway/objective versions, source/version, evidence kind (official, expert or historical), status and review identity. Artifacts bind exact published versions to objective versions and teaching/assessment roles. Never infer exam suitability from PYQ origin or subject overlap. Validate duplicate IDs, missing references, cycle/self dependencies, unknown statuses and unsupported profile selections. Approved mappings and bindings alone influence scope. Future paths can be planned in a registry without appearing in the active selector. Depth/context/task are explicit objective fields.

A combined profile unions required objectives and prerequisite closure without duplicating canonical questions or revision work. Coverage is computed independently for each selected pathway: required objectives, available teaching and assessment, missing material, family diversity and unmapped state. This is inventory evidence, never mastery or official syllabus completeness.

## Preferences and interfaces
Use existing authenticated account metadata only for a small, validated learner-editable preparation preference. It is never authorization, medical review or subscription data. A narrow adapter reads/writes the preference through existing Auth API; no credentials or learner history are copied. Account provides NEET-PG, INI-CET, Both and primary-goal selection. Failed reads/saves remain visible and retryable. No profile is silently assigned to existing users.

Library receives trusted curriculum metadata plus the current preference from its authenticated API. Scope choices: For my goals, Needed foundations, Explore all knowledge. Deep links and browser history preserve scope and the selected concept. Every workspace renderer sees the same scoped catalog. Unconfigured/older APIs retain existing behavior with clear setup/status links. Scoped missing mappings show an honest unavailable state, with an explicit Explore all action. All-mode material is never excluded merely because it lacks mappings.

Study Now reads the same trusted preference/registry. Existing sessions resume unchanged. New goal-scoped sessions use exact mapped question versions once; no request-supplied curriculum or exam provenance is trusted. Ordinary explicit browsing/study and revision history remain accessible. A selected but unmapped pathway yields an honest plan with no scoped questions, not a silent unrelated recommendation. Simulator configuration and run snapshots remain unchanged.

## Data and release boundaries
Ship an empty clinical curriculum with two active preparation identities. Do not seed invented medical objectives, exam requirements, approval evidence or coverage. Reviewed curriculum additions are code-reviewed versioned records, separate from question ingestion and human publication. Existing import format and authority remain unchanged. This first foundation does not implement a new clinical review console or all future assessment runtimes. No new service, package, SQL migration or production deployment.

## Acceptance
Tests must prove shared-objective union, exclusive requirements, transitive prerequisites, exact-version suppression, no provenance-derived suitability, draft/retired rejection, cycle/ref validation, separate teaching/assessment gaps, empty registry, profile failure/isolation, route Back/reload, responsive selector and existing-session preservation. Run full npm test, npm run check, static build and available browser acceptance. Save source and an accurate handoff on the feature branch/PR; no automatic production merge.
