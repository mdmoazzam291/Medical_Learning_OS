# MLOS Medical Source Change Watch v1

Status: owner-operated evidence registry and exact canonical impact map. No autonomous external surveillance.

## Scope and authority

- The canonical `study_catalog.body.sources[]` fields `sourceId`, `version`, `url`, `title`, `evidence` remain the authoritative *cited* source snapshot for question and NeuralVault note versions.
- An owner may record a **possible different version** or **possible retirement** sighting with a HTTPS evidence URL, exact observed version when applicable, and a substantial note. The authenticated singleton Admin identity is stored server-side.
- Records are append-only in `public.owner_medical_source_observations`. The table has RLS enabled and no general authenticated/anon privileges. Only the owner-verified `owner-api` accesses it using the service role. No direct client table reads or writes.
- Each sighting is bound to the cited source version and catalog version observed when recorded. Retried identical client request IDs reuse the immutable receipt; conflicting payloads fail with HTTP 409.
- `GET /source-watch` joins catalog sources to their most recent matching sighting and explicitly enumerates question and canonical note versions directly citing each source. Draft content is excluded from the direct exposure list; published and in-review versions are separate. Superseded source-version sightings are history, not active alerts.
- Missing/incomplete reads and a changing catalog fail closed. The API caps auxiliary tables at 1,000 rows and catalog JSON at 8 MB; there is no claim of a complete view past this bound. Auxiliary reads are not cross-table transactional.

## Explicit non-claims

- **No automated web fetch or scheduled watcher has been implemented.** A record is an owner-submitted claim, not verified by independent parsing of official medical guidelines. Version difference alone does not establish an actual clinical recommendation change.
- Zero source sightings is **not** evidence that sources are current. Zero published content after reset is **not** evidence that content quality was audited.
- The watch does **not** rewrite existing questions, alter answers, retire content, affect Study Now ranking, make a Medical/References/Rights approval, or grant publication authority.
- Existing Reference Review and human source-rights/publication gates remain the authoritative content governance workflow.

## Human operating procedure

1. Visit **Admin → Content & Quality → Source Change Watch**, click **Load source watch**.
2. Identify a real canonical source used by existing content. Independently inspect trustworthy official source publication or revision evidence.
3. Record the observed edition/version (or retirement), original evidence HTTPS URL, and a clear evidence note. Do not record an inferred clinical change as fact.
4. Inspect the exact impacted question/note versions in the existing Reference Review workflow and determine whether changes are clinically meaningful and permitted by rights.
5. If a correction is needed, submit a separately reviewed, version-bound content update through the existing ingestion and publishing process. Never overwrite a published question in place.

## Future automatic surveillance

Implement provider-specific trusted-source parsers (WHO, NICE, CDC, national guidelines, journals), respecting licenses and rate limits, after real source URLs and expected update structures are available. Preserve fetched evidence hashes/timestamps, link to original URL, distinguish HTTP/HTML change from recommendation change, and require human attestation. No generic open-URL crawler or AI-only approval.

## Verification

- Synthetic unit tests cover empty catalogs, direct version impact, retirement and superseded observations, validation, idempotency, failsafe contracts.
- Chromium/iPad WebKit browser checks exercise the new section without creating clinical or evidence data.
- SQL migration `20261012070645_owner_medical_source_observations_v1.sql` was applied to the connected project. Test it with live owner authentication and independently verify production Cloudflare deployment before claiming the feature is live end-to-end.
