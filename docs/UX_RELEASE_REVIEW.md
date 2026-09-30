# Aperture UX integration review — 2026-09-30

The interface stack has been reviewed as one learner journey. Six integration findings are fixed, and responsive synthetic acceptance passes. PRs #155–#159 are now merged and deployed at commit 77a97c20bf2c4bb6619f36493c5fc607b0b2aa06. The complete merged tree matches the tested feature tree; main Foundation run 36686530859 passes both jobs. Exact live parity of app.js, medical.js, vault.js and styles.css was verified on 2026-09-30.

## Reviewed scope

Baseline main: `c7a0f85370b0657be6254015205e2923931f9a23`. The stack changes frontend presentation/controller navigation, regression coverage and documentation; it does not change APIs, database schema, medical content, publication, scheduler authority, dependencies or infrastructure.

| Dependency order | Change | Review state |
| --- | --- | --- |
| [#155](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/155) | Home and results-to-revision hierarchy | Merged; CI passed |
| [#156](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/156) | Saved feedback and owned-session Vault return | Merged; CI passed |
| [#157](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/157) | Vault reading and personal workspace | Merged; CI passed |
| [#158](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/158) | Study entry and GET-only session reload | Merged; CI passed |
| Integration follow-up | Findings below and integrated journey regression | Merged as #159 |

## Findings resolved

| Trigger | Previous behavior | Reviewed behavior |
| --- | --- | --- |
| Revisit a concept from completed results | Vault lost the session return context | Bounded return restores the same closed-session results through the owned GET |
| Question list cannot load | Primary Browse pointed to an absent section | One working Reload Study action; successful browsing moves keyboard focus to its heading |
| Home progress totals fail | Available schedule/catalog reads were suppressed | Independent successful projections remain usable; unavailable totals stay unknown and retries clear old projections |
| Rapidly choose another Vault concept | An older slow response could replace the latest detail/URL | Only the latest detail request can set the active concept/annotation context |
| Closure is acknowledged but summary is unavailable | The heading implied full selected-item completion | Closed is acknowledged; Complete requires explicit authenticated summary evidence |
| A persistent Study message overlays the mobile next action | Message had no dismissal control | Explicit Dismiss returns focus to feedback or the next result action |

## Acceptance evidence

All 806 repository tests pass, including summary-outage resilience. Syntax/catalog/decision checks and whitespace checks pass. Existing Study/admin/privacy, saved-feedback/Vault-return, Study-entry and Vault persistence browser suites pass.

The new integrated fixture runs at 390×844, 820×1180 and 1440×1000. It follows Home → Study start → reload → accepted answer → Vault note save/reload → saved answer → Finish → results → Vault → the same results → Home next-session planning. Exactly four explicit fixture writes occur: session Start, answer, personal note, and advance. Navigation, disclosures and reload create no extra Start, answer, memory rating or advance. Additional cases check projection outages, working recovery, dismissal focus and reversed-order concept responses.

Screenshots use nonclinical synthetic fixtures. They are interface acceptance evidence, not learner retention, clinical review or production activity. No production learner data was written.

## Release handoff

1. Review the integration follow-up and verify its final CI run. Merge the stack in the order above, retargeting each next dependent PR to current main and confirming the intended tested tree. If main changes independently, reconcile and rerun affected checks.
2. This is a frontend release. The existing study-api v41 contracts already support it; no Edge deployment, migration or infrastructure adjustment is part of this stack.
3. Verify the existing hosting deployment serves the merged app.js, medical.js, vault.js and styles.css. Only claim hosted delivery after exact asset parity is checked.
4. Observe sign-in, Home/Study/Vault navigation and a previously saved owned session/results through the authenticated hosted UI without submitting fabricated answers, ratings, notes or review evidence. Real learner use remains separate.

Native iOS Safari and real authenticated hosted acceptance of the new UI remain unverified. Chromium viewport checks do not stand in for those observations. FSRS remains shadow-only, and no retention/clinical release gate is promoted by this UX review.


## Hosted acceptance update

The existing browser session expired before authenticated acceptance could complete. The summary showed unavailable, then QBank and Account showed signed-out state. No learner evidence was created. Secure sign-in is required to observe the existing saved results and Vault return. Native iOS Safari remains unverified. A separate Vault unsaved-draft follow-up is tracked in STATUS.md and does not change these release facts.


## Final acceptance — 2026-09-30

Secure sign-in succeeded. The actual hosted Home loaded the learner's data; an existing completed session showed 6/6 answered, 4 correct and 2 incorrect. The results → anaphylaxis Vault concept → Return to study → same results path and subsequent reload passed with no learning or note writes. This supersedes the earlier expired-session blocker above.

Vault draft-protection follow-up #160 is also merged and deployed at f033f51fa2a6c52d735db852777cd4e1241893b2. All 806 tests and the full main browser suite pass (run 36688037103), including three-width synthetic failed-save, conflict and removed-target draft recovery. Live vault.js, vault-drafts.js and styles.css match Git bytes. Native iOS Safari and browser-termination draft durability remain unclaimed. See ADR-095 for draft boundaries and STATUS.md for the next task.
