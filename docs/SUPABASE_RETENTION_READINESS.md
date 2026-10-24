# Supabase retention and future content migration

Owner direction, 25 October 2026: retain all canonical content and learner data in the current Supabase project. Cloudflare continues website hosting and independent private backups. No D1, second catalog, dual writes, migration or deletion is introduced.

## Scheduled acceptance — 25 October 2026, 04:15 IST

The natural scheduled version7 execution saved a Supabase snapshot at 22:45:04 UTC on 24 October: `databaseBytes=22047891`, `databaseBudgetBytes=500000000`, `capacityRatio=0.044095782`, `capacityStage=normal`, status healthy. This proves scheduled measurement and persistence, not a production threshold-crossing alert or billed-quota measurement. Notification evidence now records `alert_delivery_not_configured`; email delivery is still blocked.

The same execution correctly marked R2 degraded: the latest production backup was successful on 18 October, the main restore drill succeeded on 1 October, but there was no main-branch storage audit. The audit workflow was manual-only despite the monitor's 35-day freshness requirement. It now schedules a monthly read-only inventory at 07:45 IST on the first day and runs when its own workflow/guard files change on main. It retains read-only permissions and backup concurrency serialization. Eight storage-guard tests pass. No fresh hosted audit result or complete backup health is claimed before the workflow executes.

Foundation40139406460 passed core checks but found a phone navigation test synchronization race: an eager toolbar count selected the learner trigger before async Admin authorization replaced it. The test now resolves either exact valid accessible name when actionable. Runtime navigation is unchanged; full hosted acceptance must be checked on the repaired head. Local1465 Node tests/check/build pass; local browser execution is unavailable because the browser executable download returned an invalid archive.

## Verified baseline and corrected audit

The earlier chat audit incorrectly treated backup run 39623460079 as an unresolved export defect. PR292 already fixed the explicit libpq connection argument. Actual encrypted backup and disposable restore runs 39624386430 and 39624968454 succeeded afterwards; the repair was merged. Do not rotate recovery keys or repeat that repair. These are dated recovery results, not proof of recovery of today's full platform.

The runtime monitor was still pinned to older source. Its R2 query could surface failed experimental-branch runs as production health and had no freshness check. This change scopes evidence to main and requires standalone backup evidence within eight days plus audit/restore evidence within 35 days. A missing or stale result is degraded, never silently healthy. Successful branch-local recovery drills remain dated acceptance evidence; they are not substituted for production schedule health. Scheduled/manual restore drills may consume an existing archive, so their start time cannot establish backup freshness.

## Capacity guard

Reuse the service-only owner dashboard's observed `pg_database_size` measurement and existing authenticated infrastructure alert state machine. No new public RPC or database table. `MLOS_DATABASE_BUDGET_BYTES` defaults conservatively to 500,000,000 bytes; change it after a verified plan/budget change. This is an operating budget, not a discovered entitlement or total provisioned disk/WAL measurement. Missing/invalid evidence is unknown/degraded.

| Fraction of operating budget | Stage | Operational response |
|---|---|---|
| Below 60% | normal | Continue |
| 60% | review | Review growth and remaining headroom |
| 75% | action | Evaluate upgrade or separately tested content migration |
| 85% | urgent | Commit a capacity action before further growth |
| 95% | critical | Protect learner write continuity; act before exhaustion |

Existing monitor debouncing and six-hour repeat cooldown apply. Thresholds do not block learner writes or automatically delete/archive/migrate anything. Intermediate stages remain in Admin metrics; existing alert severity escalates at 95%. Database growth forecasting and actual provider quota ingestion are not implemented. Supabase's current docs distinguish Free database-size limits from paid provisioned disk usage: https://supabase.com/docs/guides/platform/database-size .

## Notification diagnosis and remaining configuration

Read-only inspection of existing monitor HTTP response diagnostics identified `alert_delivery_not_configured`. Vault has a Resend credential name, but that does not establish credential validity. The connected Resend tool returned no domains; it may not represent the application credential's account. No domain, key or sender was guessed or changed. No test email was sent.

Set the existing Edge secret `MLOS_ALERT_FROM` to a verified sender owned by the application operator, and verify the existing Resend sending key independently. Never put a key in Git or chat. New delivery evidence retains only allowlisted diagnostic codes, rather than collapsing configuration, owner-resolution and HTTP failures to `delivery_failed`. API acceptance is distinct from actual inbox delivery. Alert email delivery remains unverified until configuration and a separately authorized delivery test succeed.

## Historical evidence

Synthetic local regression now checks catalog JSON export/restore after retirement: exact question ID/version/stem and the original learner event/receipt survive; another learner has no evidence; retired content is excluded from new selection. Existing retry/scoring/ownership tests remain authoritative for the local service. This is not a hosted Supabase-to-Cloudflare migration test.

The hosted session API intentionally blocks retired question delivery and returns no question for closed sessions. A full historical prompt lookup still needs an explicit distinction between superseded content and content withdrawn for rights/safety reasons. Do not bypass that protection merely to show an old question. Preserve private source versions and immutable attempt receipts now; implement a separately tested, learner-owned historical retrieval boundary before an actual content migration. Existing mock-exam state/receipt snapshots are a separate retained evidence path.

## Future cutover acceptance

Preserve canonical question/concept/version IDs, exact old content versions and source/review/rights bindings; retain original scoring receipts and idempotency keys. Test complete export/import and historical lookup with disposable fixtures. Freeze affected writes for final synchronization, reconcile all accepted writes, and retain a tested rollback that includes target-side writes. Never restore erased pilots. Content moves must not reset learner histories or silently recalculate scores. Learner records will keep growing in Supabase after any future content move.
