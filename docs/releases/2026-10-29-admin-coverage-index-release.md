# Admin Coverage Index production release — 29 October 2026

PR332 merged as13b3c8c0651b96135a950c33f9877f155bb69dfe. Merged tree085499211c055c0655c0e3f686af02a397ce231f equals tested feature0775a683 exactly. Pre-merge Foundation40764606041 passed all jobs. Production website build8f70c0a6-8bc7-408a-ab4d-e09adbe7cd23 and heartbeatcc1a1687-c891-461e-b884-a0d2f352c45d succeeded. Main Foundation40864614526 core and dedicated Chromium/nativeWebKit coverage steps passed; wider suites were running at receipt time.

Applied provider-ledger20261029111344/admin_content_coverage_snapshots with exact SQL SHA256e0bd95d7b84f3be2e1c6e613ce59ce1f75cffddc0f399406ec91056bddddc39e. Owner APIv7 bundle338029d160b3b6ece832a380add21a4cd1dd1fa582359071cd4b813c8f880d9b has10files byte-identical to reviewed source; no deno config/import map exists at this source. Existing verify_jwt=false and internal Auth/session/Admin checks retained. Priorv6 bundle2997fbe24d246adbc53409d9c275f0a71c3a289641941594a859c22645c772ae is the rollback reference; no rollback was required.

Live SQL passed metadata redaction, exact snapshot replay, wrong actor, wrong registry and expiry. Derived test writes were rolled back. anon/authenticated have no table SELECT/RPC EXECUTE. Anonymous/invalid HTTP coverage and anonymous integrity return401/no-store.

Real Admin signed in securely, existing dashboard loaded, and Catalog Integrity read-only audit found0structural inconsistencies in446/6questions/10concepts/8sources/6notes. Released Coverage Index showed10concepts/6stored-published questions. No-direct-assessment filter found4concepts; platform filter kept all10concepts with0matching questions and persisted through reload. Baseline incomplete/historical-state warnings remained visible. No review, rights, question, note or learner publication action taken.

Before/after catalog digest9b5e6a2ef1210c1c15ea41a507c8aa59be180af6f8e1393dddf5bbb28d60b5d3 unchanged at446;36reviewevents/20rights events unchanged. Cache writes from normal inventory reads are derived metadata only. Post-advisor62INFO no-policy (one expected service-only cache increase), existing1WARN leaked-password protection, noERROR.

Limits: actual learner-account HTTP denial, physical iPad acceptance, dashboard pause/rollback controls and served-asset byte equality unverified. CLI assets returned403/timeouts; browser displayed and exercised the deployed feature. This is not clinical/source-rights approval or syllabus completeness. Preserve326 and330.

Next release unit333 is retargeted to main. Its effective24-file diff contains only concept-draft increment and its own migration; no duplicated coverage migration. This receipt/handoff checkpoint changes no333runtime source. Re-run exact-head CI before any333DB/API/frontend release; do not bulk-merge remaining stack. Issue338 remains the release coordinator.
