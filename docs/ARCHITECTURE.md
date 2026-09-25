# Architecture

## Implemented
A JavaScript ES module validates attempt events and projects accuracy by concept for one learner. It has no database, network calls or AI dependency. The example prints a synthetic result in the terminal.

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
Reviewed question version → learner answer → server validates/scorers answer → persist attempt with idempotency key → project learner summary → choose next action. Client-supplied correctness must never be trusted by a production API. The current validator enforces structural integrity only; scoring and authorization are not implemented.

## Production requirements
Tenant isolation must be enforced in storage/services as well as projections. Persist events transactionally with a unique event ID and reject conflicting retries. Use event version migrations. Maintain rebuildable projections. Separate immutable source content from personal annotations. Support export and deletion, including rebuilding projections after deletion; append-only history does not override privacy requirements.

Offline support will need a durable outbox, retry-safe synchronization and conflict handling. Nothing in the current in-memory example guarantees persistence or cross-device sync.
