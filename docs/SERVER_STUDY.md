# M04a — local server study foundation

## Boundary
The server, not the client, selects published versions, scores answers, attaches source references, assigns learner/concept/time/event identity and persists evidence. The existing browser remains the separate M03 nonclinical demo; it does not call this API yet. No medical content was published or reviewed by this change.

Node 24's built-in SQLite adapter stores data in `.local/study.sqlite` by default. Prepared statements bind all input values. Transactions and unique constraints protect active-session ownership and submission idempotency. The database has a versioned schema; an unknown version fails without resetting data. This single-host implementation is deliberately not a cloud account/sync system or a production deployment.

## Identity and access
Operator-issued, random 256-bit bearer credentials map to a learner ID. Only a SHA-256 token hash and expiry are stored; credentials expire after seven days by default and can be revoked. The API never accepts a learner ID, correctness, event ID, concept ID or timestamp from the client. Session lookups enforce owner scope and return 404 for other learners' sessions.

This is a credential-authenticated development boundary, **not** self-service signup, verified human identity, password handling, an identity provider, reviewer authorization or a completed account product. Provisioning, revocation and catalog import are local operator commands, not public endpoints. Future account integration should resolve a trusted learner principal at this same boundary. Do not put operator credentials in browser storage or source files.

The API binds only `127.0.0.1`, checks the exact Host and same-origin Origin, emits no CORS allowance, and does not use ambient authentication cookies. It accepts bounded JSON bodies, uses no-store responses and hides unexpected database errors. TLS, public hosting, rate limiting, abuse protection, distributed storage, backups/recovery drills, deletion workflows and identity-provider integration remain release requirements. Loopback binding is intentional; this server must not simply be exposed publicly.

## Local operation
Requires Node 24+. No package installation or third-party service is needed.

```sh
npm run start:api
```

The API starts at `http://127.0.0.1:3001`. `MLOS_API_PORT` and `MLOS_DB_PATH` can change local configuration. `.local/` and SQLite files are ignored by git. The launcher uses restrictive file permissions. `GET /health` reports the local foundation scope; all `/api/` routes require a bearer credential.

Operator commands (run only when intentionally provisioning/importing):

```sh
node scripts/admin.js provision local-learner .local/learner.token
node scripts/admin.js revoke local-learner
node scripts/admin.js import data/content-draft.json
```

Provisioning saves the credential once in a new 0600 file; it does not print the secret or overwrite an existing file. Revoke invalidates all credentials for that learner. The example catalog import yields zero published questions. A real content import needs genuine source/rights/review evidence; these domain gates check records, not the identity or qualifications of their authors. Authenticated reviewer workflows are still required.

## HTTP contracts
Use `Authorization: Bearer <credential>` and `Content-Type: application/json` for POST. Unknown payload fields are rejected. No learner selector is accepted. No query parameters are currently supported.

| Method and route | Payload / result |
|---|---|
| GET `/api/questions` | Published stems/options/version IDs only; no solutions |
| POST `/api/sessions` | `{}` or `{ "limit": 15, "filter": "all" }`; resumes existing active session, otherwise selects up to 50 published versions. Filters: all, incorrect, bookmarks |
| GET `/api/sessions/:id` | Owned session cursor/current question and saved receipt, if answered |
| POST `/api/sessions/:id/answer` | `{ "requestId": "unique-client-key", "position": 0, "optionId": "option-id" }`; returns persisted event, solution, explanation and sources |
| POST `/api/sessions/:id/next` | `{ "position": 0 }`; answer required; one-step retry returns current state without skipping |
| POST `/api/sessions/:id/cancel` | `{}`; closes the session while preserving evidence |
| POST `/api/bookmarks` | `{ "questionVersionId": "question@1", "bookmarked": true }`; explicit set/unset, not a retry-unsafe toggle |
| GET `/api/progress` | Rebuilt descriptive accuracy; never mastery or predicted rank |
| GET `/api/export` | Learner-scoped events, session IDs/cursors/question-version lists and bookmarks; no credentials or full catalog |

Typical errors: 400 invalid contract, 401 missing/expired/revoked credential, 403 disallowed origin, 404 unavailable session, 409 conflicting retry/stale session/no eligible content, 413 oversized body, 415 non-JSON body. Unexpected errors return only `internal_error`.

## Evidence and lifecycle guarantees
- Session question-version IDs are fixed at creation. Selection and scoring both require current publication eligibility. Mid-session retirement blocks a new answer; the session can be cancelled. A new version does not silently replace the assessed version.
- A saved answer has a unique `(learner, requestId)` and `(session, position)`. Identical retries return the original stored receipt, even after advancing or retirement. A reused key with another option/session/position returns conflict. A different key cannot overwrite the answered slot.
- The event and explanation/source receipt are inserted in the same transaction. A failed write yields no acknowledged attempt; the same request can retry. Session advancement is a separate explicit transaction after the answer is committed.
- `durationMs` is server wall-clock time since the question became current, including interruptions. It is not active study time and is not directly comparable with the demo's approximate active timer. Richer timing semantics need a future event-contract decision.
- Catalog imports retain old questions/sources/concepts. Question content and old review records are immutable; lifecycle transitions cannot move backward. Revised source material requires a new source/version record. Imports are an operator trust boundary, not proof of clinical quality.
- Incorrect queues use the latest recorded result per exact version. Cross-version transfer, scheduling, mastery inference and adaptive ordering are not implemented.

## Verification and next slice
`npm test` covers HTTP auth, cross-learner access, strict input, private answer keys, scoring, sources, retry conflicts, double submission, restart recovery, catalog immutability, content retirement, two database connections, failed-write rollback, credential expiry/revocation, unsupported schema, payload size and sanitized errors. Fixtures are synthetic, nonclinical and in temporary test databases only.

Next (M04b): real account/session integration and connect the learner interface to this boundary. M04c: authenticated reviewers and a genuinely reviewed initial medical set; only then validate the complete medical study loop. The M03 demo remains intact and its evidence is not automatically migrated.

Implementation API reference: [Node 24 SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).
