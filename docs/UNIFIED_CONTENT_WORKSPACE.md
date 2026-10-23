# Medical Library workspace

Owner-approved design: 22 October 2026. Implementation extends the existing Library; no new top-level application or duplicate catalog.

## Homes and connections

| Object | Authoritative owner | Learner entry |
|---|---|---|
| Concept | Existing canonical concept registry | Library → Concept Explorer → Overview |
| Published note | Versioned reviewed content | Concept → Overview / Notes; NeuralVault for references and annotations |
| Question / original QBank | Question Intelligence / exact version | Concept → Questions; Original QBank |
| PYQ | Same question identity plus actual occurrence evidence | PYQs collection; concept Questions; Exam DNA |
| Platform QBank | Existing exclusive source-home policy | QBank collection; concept Questions |
| Medical visual / clinical vignette | Existing reviewed question/media contract | Media / Atlas / Cases; original scored Study |
| Personal annotation | Authenticated NeuralVault | Related context → Private notes |
| Bookmark / saved filter | Device collection | My Library → Bookmarks & Saved Views |
| Answer / exam outcome | Existing server-owned evidence ledgers | Study / Exams → Progress / Revision |

Selecting a concept preserves its ID across Overview, Notes, Questions and Graph. Shareable URL state is allowlisted. Back/Forward and reload restore the selected representation. Notes and Overview discard incompatible question-only collections. Intentional PYQ/QBank collection changes clear contradictory source filters. A missing concept stays unavailable rather than displaying another dossier.

Explore offers subject, body-system and clinical-task perspectives over the same canonical IDs. Clinical tasks represent declared assessment metadata, not an exhaustive clinical-presentation ontology. Aliases find the same concept. Collections preserve source occurrences without duplicating canonical questions. The central list starts at 50 artifacts and offers more; study selection still uses the complete filtered pool. The Explorer initially shows 60 concepts, up to 1,000 before requiring refinement. These client render limits do not constitute server pagination or unlimited-catalog capacity.

## Responsive behavior

At 1,400 CSS px or wider: 240 px Explorer, flexible reader, 280 px Context. Between 1,000 and 1,399 px: 220 px Explorer plus reader; Context opens in a modal. Below 1,000 px: reader plus on-demand Explorer and Context. Both desktop side panes collapse. Width, rather than device identity/orientation, determines the layout. Existing centered global navigation, themes and opaque reading surfaces remain.

Pane dialogs support Escape and focus return; Explorer search/load-more keeps a narrow-window pane open. Concept tabs support arrows, Home and End. Filters collapse so the reader keeps priority. Private notes stay in NeuralVault; no new unsaved learner editor is introduced.

## Graph contract

The initial neighborhood contains at most 30 nodes and 60 evidence edges; expansion is capped at 100 nodes and 200 edges. Lists expose the same exact evidence versions and explicit hidden counts. Exam/content edges are published question-concept/note associations. Learning dependencies use explicit prerequisite-to-primary co-links at exact question versions and are labeled educational evidence. They do not establish clinical causality. The deployed Medical perspective remains an honest empty state until a protected reviewed relationship feed exists. PR #303 supplies an optional directed read/display contract, bounded graph/list and exact source/fingerprint validation; it does not implement the database registry, Admin human-review workflow or production snapshot feed. See MEDICAL_RELATIONSHIP_PROJECTION.md and #299. No clinical edges are inferred from associations, and no graph database is introduced.

## Admin preview

Open Master Admin → Content Intake → staged import → Content Placement Inspector. Checks show eligible, missing, unresolved or not-applicable metadata per artifact. Existing catalog references remain unresolved in the manifest-only preview; the server validates them at publication. No check claims human medical accuracy, PYQ authenticity or source-rights approval.

Draft learner preview reuses the shared dossier and graph renderer inside an authenticated admin-only dialog, with 1,440 px desktop and 1,024 px tablet canvases. Its frame has an opaque sandbox origin (`allow-scripts` only), a restrictive frame CSP and a static allowlisted interaction relay; the frame cannot inspect the admin page or its authentication storage. The parent verifies frame identity and render revision and accepts only bounded read-only view/selection messages. No inline draft scripts or arbitrary outbound links are allowed. Only its prompt-safe projection reaches the preview; answer keys, explanations, private evidence and derivative keys are excluded. Overview/Notes/Questions/Graph and canonical selections work inside it. Specialized destinations are disabled in this bounded preview rather than sending drafts to learner routes. The actual existing human Review & publish action and server publication transaction are unchanged.

## Extension seams and limits

- `src/domain/content-workspace.js`: context transitions, dossiers, alias explorer and bounded graph projection.
- `src/domain/library-workspaces.js`: shared filters, route state and collection logic.
- `web/content-workspace-view.js` / `content-workspace-controls.js` / `content-workspace.css`: content renderer, transient pane behavior and responsive surfaces.
- `src/domain/content-placement.js` / `web/content-placement-view.js`: metadata placement and isolated draft projection/preview.
- Existing specialized Library renderers, Study runtime, Exams and NeuralVault remain domain owners.

The published-library projection adds allowlisted attached source IDs and title/URL/version metadata. The interface tolerates older deployed API responses by directing learners to NeuralVault for available source references. The API function needs its normal deployment for these additive source fields; a frontend merge alone does not update Supabase Edge Functions.

No new service, package, database store, migration, paid plan or model dependency. The new browser script mocks the existing configured API origin; its single reviewed portability marker adds no production call. The preview bridge is a local static asset, not a service or external script. Chromium/WebKit acceptance checks verify read-only behavior and the opaque sandbox boundary. Catalog publication, a complete medical assertion/relationship registry, longitudinal clinical encounters, inferred mastery, generated content and 3D anatomy remain governed by separate contracts and acceptance work.

Preparation focus now extends this workspace through the shared contracts in [PREPARATION_PATHWAYS.md](PREPARATION_PATHWAYS.md). It preserves the existing homes and requires normal API deployment; no curriculum is inferred from provenance.

## Audited implementation stage — 23 October 2026

| Design requirement | Current implementation | Evidence / remaining boundary |
|---|---|---|
| One canonical home across content types | Implemented in PR296 | Existing concept IDs, exclusive PYQ/QBank homes and exact artifact versions are reused |
| Concept dossier and four synchronized representations | Implemented in PR296/298 | Overview, Notes, Questions and Graph preserve canonical selection and compatible URL state |
| Desktop/iPad adaptable panes | Implemented | Five-width Chromium acceptance; existing macOS WebKit CI covers iPad windows, not physical-device testing |
| Source-grounded structured sections | Implemented in PR298 | Only explicitly headed published note material is assembled; missing sections remain missing |
| Placement inspection and draft preview | Implemented in PR296 | Prompt-only opaque iframe, restricted relay, source/evidence boundaries and desktop/iPad canvas tests |
| Medical relationship read/display | Released through PR303 | Explicit directed, exact-source/fingerprint projection; preparation scope enforced at the shared graph boundary; no automatic clinical inference |
| Authoritative medical relationship registry | Pending #299 | Database versions, actual grants/rights/review receipts, publish/retire transaction, Admin controls and protected snapshot feed |
| Large-catalog discovery | Pending #300 | Present client render limits do not provide server pagination or an indexed search contract |
| Live signed-in acceptance | Pending #301 | This graph release rechecked the Library guest gate; signed-in and populated real-content acceptance was not rerun |
| Rich clinical presentations and overlays | Pending #302 | Current task facets and linked/private views are foundations; reviewed symptom mappings, grounded comparisons and full media/case workflows remain |
| Learning outcome claims | Unvalidated | Browsing and graph exploration do not create mastery evidence; recall/transfer experiments require reviewed content and prospective responses |

Read/display approval must not be interpreted as registry/publication completion. Normal publication review remains authoritative for every clinical artifact.
