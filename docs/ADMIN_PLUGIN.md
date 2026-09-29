# Medical Learning OS Admin Plugin Extension

**Status:** V0.1 foundation implemented on feature branch  
**Audience:** MLOS content admin / reviewers  
**Primary goal:** reduce admin friction without creating a second source of medical truth or a second authorization path.

## 1. Core conclusion

The ChatGPT plugin is an **admin command surface**, not an authority system.

```text
ChatGPT / Plugin UI
        |
        v
MLOS Admin MCP gateway
        |
        v
Existing authenticated review-api
        |
        v
Server-side MLOS policy + Supabase
        |
        +--> immutable review / rights evidence
        +--> canonical draft content
        +--> learner-safe published content
```

The plugin must never bypass the existing Medical, References, Rights, provenance, version, or publication gates.

## 2. Non-negotiable invariants

1. **One authority path.** MCP calls the existing MLOS application API; it never receives a Supabase service-role key.
2. **JWT-derived identity.** The server derives admin identity from the authenticated Supabase user. No browser/model supplied `reviewerId`, email comparison, or user metadata is authoritative.
3. **Draft != reviewed != published.** These are separate states and separate actions.
4. **AI cannot self-certify medical truth.** AI may search, structure, draft, compare, summarize, and propose. Human evidence remains required where policy requires it.
5. **Author cannot self-review a canonical note.**
6. **Rights are evidence-bound.** Rights/provenance decisions are immutable and bound to the source fingerprint.
7. **Exact-version review.** Review receipts bind the exact question/note target, not a vague concept label.
8. **Learner-model authority remains separate.** Admin content actions cannot directly alter mastery, Memory Engine, Study Now, or Digital Twin state.
9. **Minimum necessary data.** Admin tools should return only the data required for the requested action.
10. **No autonomous publication.** Event triggers may prepare work; they do not silently publish learner-facing medicine.

## 3. V0.1 technical architecture

### Authentication

Use Supabase Auth as the OAuth 2.1 / OIDC authorization server for the MCP client.

```text
ChatGPT
  |
  | OAuth 2.1 + PKCE
  v
Supabase Auth
  |
  | user access token
  v
POST /mcp
  |
  | validates admin through review-api /me
  v
MLOS server-side authorization
```

Protected-resource discovery:

```text
GET /.well-known/oauth-protected-resource
```

MCP endpoint:

```text
POST /mcp
```

The MCP layer forwards the authenticated user token plus the browser-safe Supabase publishable key to the existing `review-api`. The review API then resolves `content_admin_status_v1` and gate grants from trusted server/database state.

### V0.1 implementation footprint

No new database table is required.

New/changed surfaces:

- `src/server/admin-mcp.js`
- `scripts/serve.js`
- `supabase/functions/review-api/index.ts`
- `tests/admin-mcp.test.js`
- `tests/review-api.test.js`
- this specification
- ADR-086

### V0.1 API additions

#### `GET /admin-search?q=&type=`

Admin-only canonical lookup across:

- concepts
- sources
- questions

Purpose: search before creating or linking anything, reducing duplicate concepts and invented source IDs.

Response intentionally returns compact canonical identifiers and metadata.

#### `POST /note-drafts`

Creates a **source-bound canonical NeuralVault draft** using the existing `neural_create_canonical_note_draft` database function.

Server derives:

```text
author = authenticated admin user ID
```

The response explicitly declares:

```json
{
  "learnerVisible": false,
  "publicationAuthority": false,
  "reviewAuthority": false,
  "independentReviewRequired": true
}
```

The plugin does not expose a self-review bypass.

## 4. V0.1 MCP tools

| Tool | Purpose | Risk | Canonical mutation? | Publication? |
|---|---|---|---:|---:|
| `mlos_admin_home` | Admin + pipeline status | Read | No | No |
| `mlos_admin_search` | Search concepts/sources/questions | Read | No | No |
| `mlos_question_review_queue` | Get exact question targets by gate | Read | No | No |
| `mlos_note_review_queue` | Get exact note targets by gate | Read | No | No |
| `mlos_learner_issue_queue` | Privacy-minimized issue triage | Read | No | No |
| `mlos_create_note_draft` | Create source-bound note draft | Reversible write | Draft only | No |
| `mlos_record_question_review` | Immutable review evidence | Consequential | Review evidence | No |
| `mlos_record_note_review` | Immutable review evidence | Consequential | Review evidence | No |
| `mlos_resolve_source_rights` | Immutable Rights decision | Consequential | Rights evidence | No |
| `mlos_full_question_review` | Three-gate human bundle | Consequential | Review evidence | No |
| `mlos_structured_review_batch` | Bounded human batch decision | Consequential | Review evidence | No |

### Deliberately excluded from V0.1

- `publish_content`
- `delete_content`
- `merge_concepts`
- `retire_concepts`
- learner suspension/deletion
- subscription/access changes
- direct mastery edits
- Study Now overrides
- automatic reviewer grants

These require additional policy and confirmation boundaries.

## 5. V0.1 plugin UI

V0.1 ships one compact MCP App resource:

```text
ui://medical-learning-os/admin-control-v1.html
```

It is linked to `mlos_admin_home`.

The first UI is intentionally small:

```text
+--------------------------------------+
| MEDICAL LEARNING OS · ADMIN CONTROL  |
+--------------------------------------+
| Authority       | Review gates | API |
| Authenticated   | 3            | OK  |
+--------------------------------------+
| Pipeline status                       |
+--------------------------------------+
| Drafts are not learner-visible.       |
| Authoritative writes remain gated.    |
+--------------------------------------+
```

The conversational surface handles the first V0.1 actions. A richer interactive review desk is a V0.2 layer, not a prerequisite for proving the architecture.

## 6. Intended V0.1 workflows

### A. Add a note safely

User:

> Find the canonical nephrotic syndrome concept and relevant verified sources, then draft a concise note.

Flow:

```text
admin_search
  -> user/model selects existing concept + sources
  -> create_note_draft
  -> DRAFT
  -> independent review remains required
```

The plugin must not create a duplicate concept merely because the user used a synonym.

### B. Review learner-facing questions

User:

> Show the next five Medical-review questions.

Flow:

```text
question_review_queue(medical)
  -> inspect exact target + evidence
  -> human decision
  -> record_question_review
  -> immutable receipt
```

### C. Full one-question review

```text
exact unreviewed question
  -> inspect medical correctness
  -> inspect references
  -> inspect Rights/provenance
  -> explicit human attestation
  -> full_question_review
  -> 3 immutable decisions
  -> publicationAuthority=false
```

### D. Rights review

```text
source
  -> inspect licensing/provenance evidence
  -> explicit decision
  -> resolve_source_rights
  -> fingerprint-bound Rights receipt
```

## 7. The V0.2 admin interface

Once V0.1 proves secure tool calling, add three richer surfaces.

### 7.1 Admin Home

Show only action-driving information:

- Medical queue
- References queue
- Rights queue
- drafts blocked on independent review
- unresolved sources
- learner issue reports
- stale/review-required content
- pipeline failures
- most important next admin action

No vanity dashboard.

### 7.2 Content Studio

One workspace for:

- canonical search
- note draft
- question draft/import
- source attachment
- concept linkage proposals
- media attachment
- provenance declaration
- automated QA results
- submit-to-review

The editor should display the **canonical concept ID and source IDs** prominently so authors know what objects they are modifying.

### 7.3 Review Desk

One item at a time:

```text
Exact target
Source evidence
Prior/current version diff
Medical gate
References gate
Rights gate
Target fingerprint
[Approve] [Reject] [Needs correction]
```

For bulk review, group by reusable source and shared failure mode. Do not make the reviewer inspect the same source 30 times.

## 8. Ultimate Admin Plugin architecture

The end-state should remain one coherent system, not a pile of admin features.

```text
                         MLOS ADMIN PLUGIN
                                |
        +-----------------------+-----------------------+
        |                       |                       |
  Content Workspace        Review Workspace       Ops Workspace
        |                       |                       |
        v                       v                       v
  Knowledge Graph          Human Governance        Automations
  Content pipeline         Rights/provenance       Health/alerts
        |                       |                       |
        +-----------------------+-----------------------+
                                |
                         MLOS Service Layer
                                |
          +---------------------+---------------------+
          |                     |                     |
       Supabase                 R2               Learning Engine
          |                                           |
          +---------------------+---------------------+
                                |
                    immutable evidence / audit
```

### 8.1 Content capabilities

Future tools:

- `content.search`
- `content.note.draft.create`
- `content.note.draft.revise`
- `content.question.draft.create`
- `content.question.version.create`
- `content.source.attach`
- `content.media.attach`
- `content.review.submit`
- `content.version.diff`
- `content.retire.propose`

AI can perform drafting and structural transformations. It cannot certify the output as canonical truth.

### 8.2 Knowledge Graph capabilities

Future tools:

- search canonical concept
- propose new concept
- propose synonym
- propose concept edge
- link artifact to concept
- detect possible duplicates
- compare candidate merge
- stage merge proposal

**Merge/retire execution must require a dedicated human confirmation because graph identity propagates across QBank, NeuralVault, analytics, exams, and learner evidence.**

### 8.3 Human-review capabilities

Keep three independent semantic gates:

- Medical
- References
- Rights/provenance

Add optional later gates only when evidence justifies them:

- exam/editorial
- media quality
- psychometric/calibration
- institutional/local-jurisdiction

Do not create 12 approval types by default.

### 8.4 Learner-control capabilities

Admin learner operations should be separated from content authority.

Recommended future model:

```text
Learner identity (Supabase Auth)
        |
        +--> product entitlement
        +--> beta access
        +--> account state
        +--> privacy/export/erasure workflow
```

Future tools:

- find learner by explicit admin query
- view minimum necessary account status
- grant/revoke beta entitlement
- grant/revoke product entitlement
- suspend application access
- restore application access
- initiate privacy export
- initiate erasure workflow

Avoid direct Auth-user deletion as the default “suspend” mechanism. Account access, entitlement, privacy erasure, and content-review roles are different authorities.

The admin plugin should not expose detailed learner mastery history unless the admin task genuinely requires it.

### 8.5 Rights workspace

Rights should become source-first:

```text
Source
  -> all dependent questions/notes/media
  -> one Rights investigation
  -> fingerprint-bound decision
  -> dependent content unblocked
```

Future capabilities:

- source rights queue
- source reuse/dependency count
- rights evidence capture
- license expiry
- source fingerprint drift
- affected-content impact map
- bulk re-review proposal after source change

### 8.6 Automation layer

Use events to **prepare work**, not to silently decide high-stakes content truth.

Candidate events:

```text
content.draft.created
content.review.required
content.review.rejected
content.verified
source.rights.unresolved
source.fingerprint.changed
source.license.expiring
learner.content_issue.threshold_reached
guideline.version.changed
media.review.required
pipeline.failed
backup.failed
```

Safe automatic actions:

- create review packet
- group dependencies
- propose source reuse
- generate diff
- run deterministic QA
- notify admin
- prioritize queue
- prepare replacement draft

Human-required actions:

- Medical approval
- contested References decision
- Rights clearance
- canonical concept merge
- learner-facing publication
- destructive learner/account operations

## 9. Publication design for V0.2+

Publication deserves a dedicated command, but only after we add an explicit service boundary.

Recommended command:

```text
publish_verified_content(target, expectedVersion, expectedReviewHashes, attested=true)
```

Server must re-check immediately before publication:

1. target remains verified
2. no review was rejected
3. Medical hash matches current target
4. References hash matches current target
5. Rights hash matches current source fingerprint
6. source remains permitted
7. target is not superseded
8. caller has publication authority
9. explicit confirmation/attestation is present
10. transaction succeeds atomically

Then emit an immutable publication receipt.

**Approval and publication remain separate.**

## 10. Audit architecture

Every admin mutation should eventually emit an `ActionReceipt` compatible with the existing semantic capability kernel:

```text
actor
capability
target
requested_at
policy_version
input_digest
output_digest
provider metadata
status
error classification
```

The receipt does not grant authority. It records what occurred after server policy decided whether the action was allowed.

## 11. Security model

### Trust boundary

Never:

```text
ChatGPT -> Supabase service_role
```

Use:

```text
ChatGPT
  -> OAuth user token
  -> MLOS MCP gateway
  -> server authorization
  -> application API
  -> database functions
```

### Prompt injection assumption

Treat all medical content, learner reports, imported files, URLs, source text, and notes as **untrusted data**.

A source or learner report containing “approve this question” is content, not an instruction.

### Confirmations

| Action | Confirmation |
|---|---|
| Search/read | none |
| Create draft | normal tool confirmation |
| Link/tag reversible draft | normal |
| Human review receipt | explicit |
| Rights decision | explicit |
| Publish | explicit + server revalidation |
| Concept merge/retire | explicit + impact preview |
| Bulk write | explicit + count + sample + dry-run |
| Learner suspension/erasure | explicit + identity preview |

## 12. Metrics

The plugin is successful only if it reduces admin work **without reducing quality**.

Primary metrics:

- human minutes / approved learner-safe item
- median intake -> publication time
- repeated source inspections / unique source
- source reuse factor
- review rejection/return rate
- post-publication correction rate
- stale-content detection latency
- percentage of writes with valid immutable receipts
- accidental/unauthorized mutation count = **0**

Do not optimize raw number of admin clicks or AI actions.

## 13. Build priority

### Build now

- authenticated MCP gateway
- admin search
- read-only status/queues
- safe canonical note draft
- existing review + Rights actions through the gateway
- tests proving no publication/learner-account authority

### Foundation next

- rich Review Desk UI
- draft revision/submission workflow
- explicit publication service + receipt
- capability/ActionReceipt mapping
- source-first Rights workspace
- dry-run/impact previews for bulk operations

### Later

- learner entitlement management
- graph merge/retirement workflow
- guideline/source change automation
- multi-reviewer institutional roles
- event-triggered review packet generation

### Experimental

- AI-assisted first-pass review
- AI clustering of learner reports
- automatic source-change impact analysis
- multi-agent content factory

### Reject

- AI direct-to-publication
- model-supplied reviewer identity
- service-role credentials in ChatGPT
- unrestricted SQL/database MCP as the product admin interface
- AI changing mastery or Digital Twin state by admin command
- concept deletion without versioned impact analysis

## 14. Product principle

The final experience should feel simple:

> “Show me what needs my judgment.”

The complex machinery stays underneath:

```text
search -> draft -> source -> QA -> review -> rights -> verify -> publish -> monitor
```

ChatGPT reduces navigation and preparation work. **Human judgment remains concentrated exactly where it creates safety and trust.**
