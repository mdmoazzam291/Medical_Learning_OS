# Architecture

## Implemented
A JavaScript ES module validates attempt events and projects accuracy by concept for one learner. It has no database, network calls or AI dependency. The example prints a synthetic result in the terminal. A separate content module validates canonical concept/source/question records, preserves question revisions, and enforces publication eligibility. See [content lifecycle](CONTENT_WORKFLOW.md).

## Proposed application boundaries
| Boundary | Responsibility |
|---|---|
| Learner interface | Session UX, notes, review actions and accessible progress views |
| Application services | Authorization, session orchestration and content eligibility |
| Domain | Attempts, concept links, scheduling rules and learner projections |
| Persistence adapters | Content versions, learning event ledger, personal notes and exports |
| AI adapters | Provider-specific calls behind a shared interface, grounding and cost accounting |

Start as a modular monolith. Choose the web framework, database, authentication and hosting when building M03; no vendor is locked in by this scaffold.

## Data flow
Reviewed question version → learner answer → server validates/scores answer → persist attempt with idempotency key → project learner summary → choose next action. Client-supplied correctness must never be trusted. M04a implements this application boundary with credential-scoped access and SQLite persistence; actual reviewed content, real accounts and browser integration remain pending.

## Production requirements
Tenant isolation must be enforced in storage/services as well as projections. Persist events transactionally with a unique event ID and reject conflicting retries. Use event version migrations. Maintain rebuildable projections. Separate immutable source content from personal annotations. Support export and deletion, including rebuilding projections after deletion; append-only history does not override privacy requirements.

Offline support will need a durable outbox, retry-safe synchronization and conflict handling. Nothing in the current in-memory example guarantees persistence or cross-device sync.

## M03 local preview boundary
The learner preview now runs as browser ES modules, a pure demo state machine and an IndexedDB adapter. Read [learner app contract](LEARNER_APP.md) for scope and persistence guarantees. Demo data and client-side scoring are isolated nonclinical fixtures, not the production medical data flow described above. Production service/database/authentication decisions remain pending M04.

## M04a server boundary
`src/server/study-service.js` owns credential resolution, content import, sessions, scoring and transactions. `src/server/http-api.js` supplies a loopback-only, strict JSON interface with learner identity derived from bearer credentials. `scripts/api.js` and `scripts/admin.js` start/provision it. The medical catalog stays server-only. See [server contract](SERVER_STUDY.md) for limitations and release gates. SQLite is a local single-host adapter, not a cloud deployment decision.


## M04b cloud account boundary
The dedicated Supabase project is now the selected cloud identity/database boundary for M04b. Public browser configuration contains only the project URL and publishable key. Access/refresh sessions are learner credentials; database passwords and Supabase secret/service-role keys remain server-only.

The hosted `study-api` Edge Function validates the learner JWT and then performs trusted study operations against the existing `study_*` schema. Writes use the live atomic mutation functions so retry/session invariants remain database-enforced. Browser code never submits learner ID, correctness, concept ID, event ID or authoritative timestamps.

The current live catalog is empty. This intentionally decouples account integration from M04c medical-content review. Resend/custom SMTP and a real email-confirmed account test are still required before M04b is considered fully verified. See [cloud account contract](CLOUD_ACCOUNT.md).


### Observability boundary

Operational error monitoring sits outside the learning-evidence model. Product code emits sanitized failure envelopes through `src/adapters/error-monitoring.js`; provider-specific transport belongs behind that adapter.

The observability path must never become an alternate store for learner evidence, answer payloads, medical/clinical content, authentication tokens, or credentials. Sentry is the intended first provider, but the domain boundary remains provider-agnostic so monitoring vendors can change without touching learning logic.


## M04c review evidence boundary

Authenticated review evidence is normalized outside the learner catalog. Reviewer grants are mutable authorization state; review events are immutable audit evidence. A review event is bound to the exact question/source target by a server-computed SHA-256 fingerprint.

The learner-facing catalog remains a publication projection, not the authority for reviewer identity. A future trusted `review-api` resolves reviewer identity from Supabase Auth, checks grant scope, and records decisions through the database function. Publication remains separate so a valid review cannot accidentally become learner-visible content.


### Reviewer interface boundary

The reviewer UI is an authenticated operational interface over `review-api`, not a learner feature and not a publication authority.

The browser may submit a question version ID, one granted review kind, a decision and notes. It never supplies reviewer identity, target hash, server timestamp or publication state. Review queues are fetched only after server-side grant checks, and publication remains a separate trusted transition with no browser control.


## M06a NeuralVault boundary
NeuralVault is concept-centered rather than document-centered.

The latest canonical catalog owns concept identity. Canonical NeuralVault note versions reference that identity and may reference existing catalog sources. Personal annotations reference the same concept ID but remain learner-owned mutable data.

The authenticated study API is the application boundary for learner annotation reads/writes. Browser roles cannot mutate the underlying tables or invoke trusted mutation functions directly. Optimistic revision checks prevent stale-tab overwrites.

Canonical note content is intentionally separate from the personal annotation layer. Canonical publishing is a content-quality action and remains outside the learner CRUD API.

## Canonical learning-intelligence ownership

The project now treats the following ownership model as the architectural default. It consolidates the Digital Twin, Memory Engine, Mistake Intelligence, Study Now, NeuralVault, Exam DNA, clinical reasoning and AI plans without creating duplicate state.

| System | Owns | Must not own |
|---|---|---|
| Medical Knowledge Graph | canonical concept identity, typed relationships, medical assertions/provenance | learner mastery or exam-specific copies of medical concepts |
| Content / Question Intelligence | immutable content versions, item meaning, concept mappings, distractor/item metadata and later psychometrics | learner state |
| Exam DNA / adapters | versioned exam rules, exam relevance, historical exam evidence and uncertainty | canonical medical truth |
| Learning Event Ledger | immutable/replayable learner observations and exact context/version references | inferred mastery |
| Preparation Digital Twin | versioned inferred learner-concept state and uncertainty | raw historical evidence |
| Memory Engine | retention/retrievability/forgetting estimates and memory-route projections | separate canonical mastery store |
| Mistake Intelligence | mistake hypotheses, recurrence and confusion evidence with inference confidence | subject-level duplicate mastery |
| Study Now | next-action policy, candidate/constraint/recommendation history | medical truth or direct mutation of evidence history |
| Adaptive Teaching | intervention selection for an already selected learning target | overall study priority |
| NeuralVault | learner-owned annotations/representations linked to canonical concepts | canonical medical content or separate mastery |
| Clinical / multimodal engines | interaction environments and higher-order evidence | independent learner model |
| Analytics | projections, explanations and outcome reporting | new authoritative learner state |
| AI gateway | provider-independent execution of bounded tasks | persistent truth, provider-owned memory, or unreviewed authority |

### Canonical control loop

```text
OBSERVE
  learner interaction
      ↓
RECORD
  immutable versioned evidence
      ↓
INFER
  Digital Twin + memory + mistake hypotheses
      ↓
DECIDE
  Study Now policy
      ↓
TEACH / CHALLENGE
  Adaptive Teaching chooses an intervention;
  QBank / NeuralVault / image / case / mock / AI executes it
      ↓
MEASURE
  immediate response → delayed retention → transfer
      ↓
UPDATE
  append new evidence and rebuild projections
      ↺
```

The deepest invariant is: **content never owns learner state**. A learner can study from an internal question, NeuralVault note, imported resource, future educator content or clinical simulation and still update the same canonical learner × concept model.

### Source-of-truth hierarchy

1. Canonical content/evidence records define the exact medical/content/exam object and version used.
2. Immutable learning events record what actually happened.
3. Rebuildable projections infer current learner state from those observations.
4. Policy outputs are decisions made from a state snapshot, not facts about the learner.
5. Analytics and AI consume these layers; neither becomes a hidden second source of truth.

### Evolution rule

Do not rename or rewrite historical events merely to fit a newer vocabulary. Introduce explicit event/schema versions and adapters/projections. New modalities such as viva, virtual patients, AR or workplace assessment should map into stable semantic event families while preserving their modality-specific payloads.

Database work remains forward-only from the existing timestamped Supabase migrations. PostgreSQL/Supabase stays authoritative unless a later measured need justifies a graph/search/analytics projection; such a projection must be rebuildable from canonical records.
