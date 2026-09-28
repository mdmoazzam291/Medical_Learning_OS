# M14 operations and scale evidence

## Purpose

M14 proves that the Medical Learning OS can be operated, recovered and secured without confusing successful feature tests with production readiness.

The release standard is evidence, not configuration presence. A backup workflow existing in GitHub is not recoverability; an error-monitoring SDK existing in the browser is not observability; RLS being enabled is not sufficient authorization proof.

## Current evidence register

| Area | Current evidence | State | Next gate |
| --- | --- | --- | --- |
| Database backup | Weekly Supabase logical dump to private R2 with archive + inner SHA-256 verification; scheduled run 36283198880 succeeded on 2026-09-27 | proven | keep weekly cadence |
| Recoverability | Run 36449290932 automatically selected latest backup `supabase/2026/09/27/20260927T004033Z`, verified freshness/source/checksums, restored into disposable Supabase and matched four core RLS-protected study tables exactly | proven foundation | monthly latest-backup drill must remain green |
| Study API transport | Deployed unauthenticated/CORS smoke has passed; multiple hosted feature-specific smokes exist | partial | consolidate current critical route health into release evidence |
| Browser preview monitoring | Sentry browser ingestion and application-side scrubbing were verified; localhost/CI loader contamination was corrected | proven foundation | add operational alert verification, then edge-runtime monitoring |
| Database security | Current Supabase advisor has no high-severity database finding. Service-only RLS/no-policy tables remain intentional where client grants are revoked | partial | resolve Auth leaked-password-protection warning and periodically prove grants/RLS boundaries |
| Database performance | Advisor currently reports informational unindexed foreign keys and unused indexes | observe | index only measured hot paths; do not add indexes merely to silence informational lints |
| Deployment health | Render preview has been used for real Auth/browser verification | partial | re-audit current service/deploy/latency once an explicit Render workspace is selected |
| Capacity | Functional full-exam and browser acceptance exist | unproven scale | establish bounded concurrency/load targets before production beta |

## Recovery policy

- Backup cadence: weekly.
- Full restore cadence: monthly plus manual dispatch after meaningful persistence/schema changes.
- Recovery always selects the newest canonical R2 archive, never a hard-coded historical prefix.
- A backup older than nine days fails the drill.
- Archive SHA-256, inner SQL SHA-256, source project/repository and prefix-to-manifest timing must all validate before restore.
- Restore runs only against disposable local Supabase. The workflow never writes to the live project.
- Core study tables must retain RLS and reproduce backup data exactly.
- Failed recovery evidence blocks any claim that backup/recovery is healthy.

## Cost discipline

The full disposable restore is intentionally monthly because it consumes substantially more GitHub Actions time than the weekly backup. Weekly backup verification remains lightweight. Increase restore frequency only when production risk or recovery-point objectives justify the additional compute.

## Security notes

The current Supabase security advisor reports leaked-password protection as disabled. That is a real Auth hardening item, separate from database RLS. It should be enabled through the authorized Supabase Auth configuration surface when available and then rechecked with the advisor.

Informational `RLS enabled, no policy` findings are expected on intentionally service-only tables only when anon/authenticated table/function grants are also absent. New tables must not inherit that explanation automatically; each one needs an explicit access model.

## M14 completion boundary

M14 is not complete until recovery evidence is current, critical service health is observable, security warnings are dispositioned, and capacity targets have been measured against production-shaped flows. Feature correctness alone is insufficient.
