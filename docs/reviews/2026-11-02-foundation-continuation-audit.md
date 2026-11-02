# Foundation continuation audit —2 November2026

Engineering audit requested after reconciling the paused October31 chat with later project chats. This is not a clinical, source-rights or publication approval. Original mixed346 history is preserved; existing scoped branches retain ownership.

| Scope | Verified state | Remaining gate |
| --- | --- | --- |
| Source evidence349 | Merged into feature base only; canonical IDs/digests/staging/access/recovery contracts present | Integration/release and genuine reviewed source material |
| NMC348 | Draft source inventory;22adjudication cases unresolved | Real exact-source/amendment/rights and qualified adjudication; no invented denominator |
| External security350 | Deferred offline proofs; actual managed Auth role/refresh limitations documented | Gateway OFF; not current internal review delivery path |
| Internal source review374 | Head821e8d2, Foundation41352604436 SUCCESS | Genuine staging JWT/lifecycle, independent reviewer grant/author exclusion, immutable protected receipt, managed revoke races, human approval |
| Reconciliation375 | Headf301fe3, Foundation41356644646 SUCCESS | Independent scoped documentation review and explicit merge decision |
| Core6 warning376 | Previous2ed2c0f, Foundation41361055588 SUCCESS; new warning-summary consistency defect repaired | Fresh repair-headCI, staging UI and actual eight-source/six-note/six-question decisions |
| Learner identity379 | Staging mapping and production-parity runtime RPC already installed; initial ce627f5 was not an Edge deployment | Fresh repair-headCI, genuine hosted JWT/two-user/revoked/suspended acceptance, operational retention/no-reuse and release decisions |

## Defects reproduced and fixed

1. Learner identity handler checked runtime access only before storage operations. The actual handler returned200 after simulated session revocation during GET readback or POST allocation. Two regressions failed before repair and pass after a new runtime check immediately before response. Any committed mapping is preserved; no code is returned on final denial/outage. This is a freshness recheck, not atomic provider/Auth/DB revocation. Trusted isolated callback tests do not establish actual token signature or hosted Auth acceptance.
2. Publication warning view accepted inconsistent count/truncation: total0 with truncatedtrue rendered No matching warning phrases found. A behavioral regression reproduced this. Reject inconsistent summaries as unavailable, retaining proper zero and truncated samples. Existing mandatory independent rights/medical/reference messages remain.

The fresh read-only reviewer found no further concrete learner-allocation/native test blocker, and described the publication scanner's limits as heuristic. That is not a certification that no other defect exists. The UI mismatch was treated as actionable because the recorded requirement explicitly prohibits malformed summaries appearing as clean scans.

## Newly completed verification

- Learner actual-handler tests execute the committed TypeScript and runtime helper against isolated trusted external callbacks: auth/origin/query/body/session failures, verified-ID self lookup, wrong-user/corrupt readback, uncertain writes, final revocation and dependency outage.
- Native PostgreSQL17.6/18.6 tests use distinct actual service-role login PIDs and observed unique-index waits: same-user requests converge, different-user code collisions retry without crossing identities, rolled-back winners release waiters, committed lost-ack writes reconcile without another insertion. UPDATE/DELETE denied; cleanup checked.
- Removing UUID uniqueness from the in-memory migration copy makes the native barrier test fail and still cleans up. Applied staging migration history is unchanged.
- Existing disposable mapping constraints/RLS/ACL/cascade and exact runtime-parity checks pass. Native major-version fixture proof is not managed staging17.11/concurrent HTTP proof.

## Boundaries

No production migration, API deployment, Auth account/code issuance, real learner data, source text, rights/medical/exam/reviewer decision, merge, content withdrawal/publication or gateway enabling was performed by this audit. No secret values or live tokens were requested or logged. Hosted positive lifecycle remains blocked on a trusted operator/controlled account procedure; an anonymous/forged-negative check cannot clear it. Twenty-two NMC decisions and Core6 human worksheets stay pending.

Exact repair commits and current CI receipts are recorded in the latest branch handoff/PR updates. Shared older handoffs on main/other branches may predate these scoped changes; prefer exact-head evidence and this reconciliation rather than replaying old Next instructions.

## Read-only completion of missing Core6 inventory

Production catalog metadata was inspected with SELECT only at2026-11-02T07:13:13.609571Z: catalog446 unchanged,6original published v1 notes,6linked published question-version IDs and8source IDs enumerated. The prior worksheet's six unknown question/source slots are now filled in376, with a metadata-only receipt; all decisions remain pending. Stored note hashes were observed, not independently recomputed; question/source JSONB-record hashes are snapshot fingerprints, not JCS/domain canonical or source-byte verification. No note/stem/answer/explanation/source excerpt, author/learner identity or credentials retrieved. All8sources still store public_domain, an unverified historical claim, not a rights determination.

## Final repair-head CI evidence

Learner identity implementationde8a4827d8669aa0d6f22bebacfee0c94bcdbb63: Foundation41404147987 all5jobsSUCCESS(core,Chromium,WebKit,nativePG17.6,nativePG18.6). Publication warning implementation0392476ee660592c7f3a1b1fcee09396d25cea31: Foundation41404306561 all3jobsSUCCESS(core,Chromium,WebKit). Later evidence-only documentation heads need separateCI; neither run is a hostedAuth/human approval. Local suites1569and1572testsPASS, checks13services255and250locationsPASS.
