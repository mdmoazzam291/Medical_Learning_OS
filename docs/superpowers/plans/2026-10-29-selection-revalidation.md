# Saved selection revalidation

Continue approved331 slice3 and PR340 frozen receipts. Add a read-only recheck that loads the immutable receipt through its actor-bound RPC, previews only those exact IDs using current review/source/report gates, and compares catalog version, binding identities/fingerprints and digest. Return current-at-observation, stale or blocked; transport/malformed/authorization errors never imply clearance. No saved receipt modification, new schema, release authority or learner visibility change.

1. RED→GREEN domain/API tests: unchanged, catalog drift, changed fingerprints, unavailable/blocked exact items, unauthorized/malformed response and no save RPC calls.
2. Add authenticated GET /content-selections/revalidate?id, owner adapter and Recheck saved evidence UI. Clear older positive result during every recheck/error/change/reopen; preserve immutable receipt separately. Display checked time and reasons, never Ready to publish.
3. Verify focused/full Node/check/build and dedicated synthetic Chromium/WebKit flows. Persist isolated branch/draft PR based on340, with exact-head evidence and remaining production limits. No production deployment or canonical write.
