# Permanent shared-content reset receipt

Owner requested permanent deletion including dependent history, 2026-10-04.

Live database reset: executed after successful rollback rehearsal. Exact pre-reset catalog SHA-256 is bound in the SQL; changed inventory aborts. One explicit 45-table TRUNCATE has no CASCADE, no disabled triggers, no reusable privileged endpoint. Catalog updated v406 → v407 with empty concepts/sources/questions. Accounts (3), admin (1), grants, infrastructure and exam rule configuration preserved.

Removed: 184 question versions, 180 concepts, 43 sources, 3 note versions, 27 attempts, 15 sessions, 3 mock runs and all connected content review/intake/revision/recommendation/probe/media records. Five private Storage objects were deleted through the Storage API, and the temporary one-time maintenance function was replaced with JWT-required disabled code.

`purge_backups.py` uses existing R2 credentials in GitHub Actions to remove only recognized Supabase backup archives/checksums with snapshot timestamps at or before 2026-10-03T23:18:39Z. It validates the complete inventory before deleting, preserves unrelated keys/newer backups, then verifies zero old keys remain. It shares backup concurrency to avoid overlap. No new backup of erased material is made.

Limits: repository engineering/evaluation fixtures and Git history are not learner content and remain for reproducible tests; do not reimport them. Provider-controlled physical database WAL/backups and copies already downloaded to devices cannot be independently erased through this application. Previously issued signed media URLs expire after 15 minutes; deleted objects cannot be fetched. A new clean backup establishes the next restore baseline; old fixed restore fixtures are no longer valid recovery targets.

Release blocker: automatic approval review rejected the GitHub push twice because it requires explicit end-user authorization for `https://github.com/mdmoazzam291/Medical_Learning_OS`. Local feature commit and workflow are ready; no PR exists and R2 backup deletion/clean backup have NOT run.
