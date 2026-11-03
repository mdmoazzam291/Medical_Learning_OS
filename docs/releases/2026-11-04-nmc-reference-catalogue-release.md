# NMC reference catalogue release — 4 November 2026

PR408: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/408
Merged main92c6dbee954930cac557e80a2a39d787b85cd00c. Accepted feature head5d075e99ebf0f25b02e75d23353951c372730f65. Full Foundation run41694292108 SUCCESS (check/browser/webkit); 1,552 Node tests, check/build, actual-source deterministic generation and independent engineering review passed. Main tree equals the accepted feature tree exactly.

## Delivered

Standalone curriculum-reference browser linked from Medical Library, containing2,634 defining identifier appearances,399 topic-heading appearances and390 visible topic groups across19subjects. Exact source appearance identities/pages preserved,including repeats,seven malformed tokens andeleven unassigned heading references. Search,subject filters,official PDF-page links,selected October clarification warnings,pagination and shareable URL state. Workspace links now occupy46px instead of125px.

## Production verification

Direct browser inspection of https://medretica.com/web/nmc-catalogue after deployment verified full counts,GM9.8lookup and two official page297links,Anatomy filtering413references,Clear restoration and compact flex navigation. New route initially returnedNot found during Git deployment,then loaded correctly. Clean URL verified after redirects. No source-asset byte comparison or physical iPad test is claimed; viewport flows passed in hosted Chromium/WebKit. Provider deployment ID for production was not separately retrieved.

## Scope and continuation

This is reference/topic navigation,not copied competency descriptions,clinical teaching content,accepted clinical concept mappings,mastery or a certified unique-competency total. Supplementary auditing remains deferred. Existing backend,Auth,clinical registry,questions/notes and learner history are unchanged by this static release. No erased material is restored.

Next useful work: independently authored canonical concepts and explicit links to reviewed notes/questions. Reuse existing concept IDs; retain distinct mechanisms,diseases,findings,drugs,investigations and procedures. Similar source headings alone do not establish clinical equivalence.

Rollback: a reviewed revert of merge92c6dbee restores the previous static bundle without database rollback. No rollback was executed. This receipt is checkpointed on the owned feature branch after production release; no extra production deployment is required just to publish these verification notes.
