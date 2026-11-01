# Internal source review — canonical event/receipt parity (offline only)

**1 November 2026. ADR-134, issue #353. DRAFT/test-only, stacked on PR #362.**

## What changed

The existing disposable native PostgreSQL/GoTrue/PostgREST fixture commits an
immutable `internal-source-row-decision-event-v1` payload, while the canonical
internal transaction handoff expects `source-row-review-receipt-v1`. A caller
must not pretend the two are equivalent or infer successful review simply
because a JSON response has a plausible `decisionId`.

`src/domain/internal-source-row-receipt-parity.js` now provides two
**provider-neutral, offline** projections:

- `projectInternalSourceRowReceipt(event,request,reviewerId)`: validates the
  *exact* 11-field event, canonical nested request, expected reviewer, decision
  and scoped grant identities, timestamp and all four prohibited release flags.
  It generates the established 20-field receipt with an explicit
  SHA-256/JCS digest of the validated event payload (not a SQL-stored digest).
- `compareInternalSourceRowReviewEvents(writeEvent,readbackEvent,request,reviewerId)`:
  confirms an independent caller-supplied readback has identical canonical
  receipt semantics and digest; it refuses missing, changed or extra fields.

Both functions reject getters, hidden properties, symbol fields and inherited
authority; they snapshot the event before asynchronous hashing. JCS preserves
identity across JSON object property ordering. Test coverage includes changed
source rows, reviewers, grant IDs, decisions, rationale, forged publication
flags, tampered or mismatched readback and late mutation.

**No authority transition:** Even when parity succeeds, the result reports
`transactionVerified:false`, `persistenceVerified:false`,
`authorityVerified:false` and `decisionRecorded:false`. A fabricated pair of
identical JSON events passes *parity* by definition. A digest without a trusted
origin and secure database readback is not a receipt of authorized medical
adjudication.

## Actual release-blocking integration

1. An independently reviewed, user-JWT-bound SQL transaction must derive
   reviewer/session from trusted Auth, recheck current grant/rights and persist
   the immutable event with approved ownership and exact lock ordering.
2. **After** commit, a separately authenticated/current-session/current-grant
   protected readback must return the *persisted* event. The API must compare
   the returned event and original request through the parity contract.
3. The system must define a safe recovery operation for a dropped write
   response using the original request ID; it must never blindly resubmit
   ambiguous writes. Persisted event digest/signature policy and backup/restore
   integrity remain independent deliverables.
4. Verify managed Supabase Auth session-table privileges or implement an
   officially supported revocation bridge; audit definer grants, issuer/
   audience/key rotation and grant issuer independence in nonproduction.
5. Obtain actual qualified human review, primary-source/copyright rights,
   independent security review and explicit owner approval before any
   migration, Admin UI, live decision or content release.

This PR changes only an offline domain helper, tests and this documentation.
No `supabase/`, `workers/`, `web/`, managed Auth, clinical content,
external provider dispatch or deployment changes. PR #350 stays deferred/OFF.
**Do not merge or deploy the stacked source-review series without separate
approval.**
