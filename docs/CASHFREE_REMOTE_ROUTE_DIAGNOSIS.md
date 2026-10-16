# Remote scheduled test endpoint correction

## Observed first attempt

Owner manually dispatched [run 38827800192](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38827800192)
on main `529de298b80832fab681c6f29783f9b9accdd96f`. Job 116739245365
started remote development and requested one local scheduled test. Its sanitized
output was `No verified provider result captured. Local test trigger HTTP status: 404`.
No provider classification was captured; the private Wrangler log was erased by
cleanup. Do not infer either successful authentication or a definite provider call.

## Root cause at the routing boundary

The runner uses `wrangler dev --remote --test-scheduled`. We previously changed
its URL to `/cdn-cgi/local/scheduled` based on general local-development docs.
That was incorrect for the remote middleware path.

Cloudflare's versioned Wrangler 4.151.0 source:

- [Scheduled middleware](https://github.com/cloudflare/workers-sdk/blob/wrangler%404.151.0/packages/wrangler/templates/middleware/middleware-scheduled.ts)
  intercepts only `/__scheduled`; other paths pass through to the Worker's fetch
  handler. This project's fetch handler deliberately returns 404 for all paths.
- [Bundle construction](https://github.com/cloudflare/workers-sdk/blob/wrangler%404.151.0/packages/wrangler/src/deployment-bundle/bundle.ts)
  loads that middleware for development with testScheduled enabled. Its separate
  local-runtime middleware uses the local flag; local and remote routing must not
  be conflated.

Downloaded those official tagged source files to temporary scratch. Evaluated the
real scheduled middleware after removing only its type import and type annotation,
using an in-memory dispatch recorder and a 404 downstream fetch. No listener,
credentials, Cloudflare session, or provider request was involved:

| Path | HTTP result | Recorded scheduled dispatches |
| --- | --- | --- |
| `/cdn-cgi/local/scheduled` | 404 | 0 |
| `/__scheduled` | 200 | 1 |

This reproduces the observed routing failure. The first run's erased private log
does not independently establish its exact resolved Wrangler version. Pinning the
corrected runner to **4.151.0** keeps the endpoint contract aligned with the source
actually inspected. It does not establish live Secrets Store connectivity.

## Prepared correction

- Pin Wrangler 4.151.0 and invoke `/__scheduled` once in remote test mode.
- Preserve the disabled deployed config, no public route, no Cron, existing
  encrypted bindings, bounded process cleanup, and explicit operator confirmation.
- Exit nonzero if no allowlisted provider classification is captured. Previously
  a missing result exited zero and could misleadingly produce a green Actions job.
- Tighten the offline curl fixture to recognize only the remote middleware path.
  Add trigger-404 and missing-result cases; each must issue one attempt, exit
  nonzero, stop descendants and erase scratch logs. Existing signal/startup cases
  stay covered. The old code failed three cases; the correction passes them.

This is a reviewed engineering repair, not an approved second live attempt. A
new main merge and any subsequent provider execution need separate owner approval.
Do not automatically probe both URLs, retry an event, or recreate credentials.
Revoke `mlos-cashfree-actions-once` and remove `MLOS_CASHFREE_PROBE_CF_TOKEN` after
the first attempt; owner confirmation of those UI cleanup actions is still pending.
