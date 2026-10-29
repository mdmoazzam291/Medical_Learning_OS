# Frozen content evidence selections

Goal: extend approved design331 slice3 with immutable metadata-only selections, not learner release. Base: PR339 exact2cf6e507; implementation branch feat/frozen-content-selections-20261029. Execute inline with TDD.

A selected item is {kind:question|note,versionId}. At most100 unique exact versions. A server preview validates current review/source/report evidence using the existing collection preflight, computes three exact current review hashes per version, pins the catalog version and hashes the sorted metadata selection. Saving recomputes this preview and refuses a stale digest/catalog. Server binds the authenticated Admin actor, request identity and timestamp; the immutable receipt records observed evidence, not human approval. Same request/content retries return the old receipt even after later evidence changes; conflicting request reuse fails. A selection can never release siblings or clinical bodies.

Task1 SQL/domain/API RED→GREEN: actor/session denial; bounds; current/missing/stale evidence; exact hash drift; expected digest/catalog; immutable records; idempotent request replay/conflict; metadata projection/no canonical writes.
Task2 Admin selection UI RED→GREEN: per-version checkboxes; preview then explicit Freeze evidence selection; preserve selected IDs across filters/pages; asynchronous stale-response refusal; uncertain save retains request identity; exact receipt readback; no publish action.
Task3 verify full Node/check/build, isolated SQL and Chromium/nativeWebKit synthetic phone/tablet/desktop flows; self/AI review; persist draft PR and verification limits.

No production migration/merge/deployment, actual content approval or publication. No private full-content export. Existing publication proposal330, source discrepancies326 and controlled release338 remain. Expensive concurrency/load and real hosted Auth/restore require separate acceptance. Frozen receipts may become stale immediately; future release must revalidate every exact binding and external holds.
