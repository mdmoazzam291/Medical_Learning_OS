# Canonical library design

The user explicitly authorized recording the rules first and then implementing them. This specification incorporates the approved architectural discussion plus the latest exclusive-home, one-action-publication and private-import deferral decisions; implementation proceeds inline.

Binding contract: [CONTENT_LIBRARY_CONTRACT.md](../../CONTENT_LIBRARY_CONTRACT.md).

Extend the existing Supabase catalog and canonical notes, never create a competing learning/content store. Add immutable import manifests with draft/published receipts, approved question occurrence metadata, concept facets and note/question links. Exact duplicate matching targets the existing canonical question; conflicts reject publication. Learner receipts/scoring remain unchanged.

A dedicated `content-library-api` authenticates Supabase users and checks runtime suspension/revocation. GET library returns only published prompts/notes and learner-scoped observed counts. Admin GET inbox and POST stage/review require the singleton content administrator. A database transaction owns review/publication; client code cannot grant authority. A repository inbox workflow stages manifests using the existing DB secret and never auto-publishes.

The library page is linked from Study/Vault and the import page from Admin. One context supports Notes/Graph, category/source filtering, related question lists and observed learner colouring. Existing study/scoring and Vault annotation paths remain available. No product dependency, AI provider SDK, graph database or recurring service is required.

Imported notes are externally sourced/AI-authored, with source author/evidence in provenance; the administrator curates and reviews their exact text. The new atomic import path records this explicit import review; it does not weaken legacy self-review restrictions or manufacture another human identity.

Tests must exercise actual pure ownership/dedup/filter behavior, actual API handlers with controlled external HTTP clients, rollback-only Postgres publication/idempotency/security checks, and built frontend phone/tablet/desktop interactions. Synthetic medical content must not persist. Production acceptance proves transport/source parity, not clinical validation or learner retention.

Private imports and destructive content reset are excluded exactly as stated in the contract.
