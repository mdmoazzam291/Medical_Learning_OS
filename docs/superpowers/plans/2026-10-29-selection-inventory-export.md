# Frozen selection inventory export

Continue approved331 slice3 after341. Export only the immutable saved selection through the existing authorized read RPC. Generate deterministic schema-versioned JSON and readable Markdown, with SHA256 of the canonical JSON manifest. Explicit inventoryOnly=true, ingestionReady=false, publicationAuthority=false and releaseReadiness=not-assessed. No clinical bodies, source evidence, reviewers, actor IDs, request IDs or live revalidation claims. This is a snapshot export, not a Drive release-package handoff or import format.

1. RED→GREEN pure domain tests: deterministic canonical JSON/checksum, exact IDs/versions/fingerprints, explicit limits, metadata allowlist, Markdown escaping, invalid/duplicate/oversized inputs.
2. Extend the protected Owner API read flow with GET /content-selections/export?id, no write/review/publication RPC. Adapter and Admin JSON/Markdown download controls. Validate export before enabling browser download, reset prior output/errors across checks, retain saved receipt.
3. Full Node/check/build plus synthetic Chromium/nativeWebKit download/content tests. Preserve feature branch/draft PR based341, code review and exact-head CI. No actual production migration/merge/deployment, private full-content export or Drive write.
