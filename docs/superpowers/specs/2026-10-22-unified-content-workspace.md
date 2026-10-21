# Unified Content Workspace

Owner direction: “Build this all”, accepting the supplied workspace design on 22 October 2026. Scope is the existing Medical_Learning_OS, not a replacement website. Codex owns feat/unified-content-workspace-20261022 from main a653853.

## Outcome
Library is the stable home for canonical concepts and their published artifacts before real ingestion. Preserve Home, Study, Library, Exams, Account and authorized Master Admin. One selected concept survives Overview/Notes/Questions/Graph switches, reload and Back/Forward. Explicit PYQ and QBank collections use the existing exclusive-home policy. Subject, system and clinical-task perspectives organize the same identities.

## Shared projection and routes
Reuse canonical-content-library-v1 and existing published APIs, adding only allowlisted source/version metadata; tolerate older deployed responses without these additive fields. No new database, provider, dependency, migration or duplicate content store. A concept dossier assembles actual published notes, questions, media/cases and explicit links. Missing sections remain empty. Question keys/explanations and private review evidence never enter the projection. NeuralVault owns personal annotations; device collections remain explicitly device-local.

The validated URL owns view, concept, filters, collection and graph perspective. Destination-incompatible filters clear on representation switches; concept/subject/system stay. No secrets or private notes in URLs. Concept aliases participate in search. Do not silently substitute another concept for an unavailable requested ID.

## Interface
Four Library groups: Explore, Content Collections, Connections, My Library. Four concept tabs: Overview, Notes, Questions, Graph. Wide desktop: collapsible Explorer, primary reading pane and collapsible Context pane. Tablet: Explorer and content with contextual dialog. Narrow windows: focused content, Explorer/Context dialogs. Width determines layout, not device detection. Reading surfaces remain opaque in both existing palettes and modes. Pane navigation has keyboard focus, Escape dismissal, and no page overflow. Long lists use bounded slices with explicit load-more controls, and graph nodes have a list equivalent.

## Graph
Bounded selected-concept neighborhood with Medical, Learning and Exam perspectives. Only explicit published question-concept/note-question links generate edges. Prerequisite co-links are labeled educational evidence at the exact question version, never medical causation. No inferred medical edges, mastery coloring or invented clinical relationships. Missing medical relationships are an honest empty state.

## Admin
Within authenticated Content Intake, show per-artifact placement checks and exact draft preview at desktop/iPad widths. Use the same dossier/renderer contract, allowlisted prompt-only draft projection, no learner API publication or draft localStorage. Distinguish metadata eligibility, unresolved external IDs and actual approval. Existing server validation and human rights/medical/reference approval remain authoritative. Preview controls never dirty review fields or publish.

## Learning boundary
Library is Browse Mode; practice enters existing server-owned Study. Do not score reading/graph traversal/preview as mastery. Full notes cannot appear beside independent scored Study/Exam prompts through this workspace. New sources/claims/clinical cases remain governed by their existing domain contracts; no AI generation, simulated clinical encounter or 3D atlas is asserted.

## Acceptance
Domain tests: context preservation, incompatible filters, aliases, missing concepts, unique PYQs, bounded graph, exact-version evidence, draft answer stripping and placement gaps. Browser tests: empty/large catalogs, all primary tabs, concept selection, Back/reload, dialogs/keyboard, wide desktop/tablet/phone/Split View, no overflow, shared preview and no write on browse. Run npm test, npm run check, build:pages, existing affected browser suites. Record live/authenticated and browser-engine limits accurately. Feature PR is reviewable delivery; no production deployment/content publication is implied.
