# Cashfree transport investigation — 2026-10-16

The owner confirmed temporary credential cleanup and supplied a dashboard screenshot
showing both Secrets Store bindings attached, with sandbox execution disabled.
Binding presence is not evidence that Cashfree accepted the stored values.

## Evidence and limits

The second real run, [38830783379](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38830783379),
returned `transport_failed`. The original catch discarded the exception, so its
cause cannot now be recovered. No third provider request ran during this work.

A separate session already merged `redirect:manual` and an inconclusive HTTP3xx
classification. This investigation preserves that change and does not claim a
redirect caused the failure.

An isolated local Miniflare/workerd check used the exact Miniflare dependency
reported for Wrangler4.151.0 (`5.20261012.0-beta`), compatibility date2026-10-01,
the current real adapter, dummy credentials, and an outbound service routed to
another local Worker returning401. It returned `unauthorized` as expected. No
Cashfree host or encrypted account secret was contacted. This validates the
basic request shape and native fetch call in a local runtime; it does not test
Cloudflare remote previews, DNS/TLS, real stored header values or provider access.
Runtime dependencies were installed in temporary scratch only, not added to MLOS.

Cloudflare documents `cache:no-store` as supported by default from2024-11-11,
which predates this Worker's2026-10-01 compatibility date. Removing cache control
without evidence is therefore not a supported fix:
https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-cache-no-store-http-standard-api

## Bounded diagnostic change

Only when the fixed GET throws, the receipt now adds a built-in exception category:

| Category | Meaning | Does not establish |
|---|---|---|
| `type_error` | Exception is a TypeError | Invalid keys, a particular malformed header, DNS or TLS cause |
| `error` | Other Error instance | A specific network or provider cause |
| `unknown` | Other thrown value | Any provider/authentication outcome |

The Worker logs only that enum. The runner prints only an allowlisted category.
No message, stack, cause, custom name/code, raw payload, provider response body,
secret value or redirect destination is copied. No retry or fallback request is
added. Existing default-off config, binding references and cleanup are unchanged.

Tests exercise the actual scheduled handler with deliberately sensitive errors,
verify one attempt, and verify that only fixed labels escape. The subprocess
runner test proves category delivery, private-log suppression and cleanup.

## Next boundary

This is diagnostic preparation, not a repair of the unknown external failure.
Do not ask the owner to recreate a token solely because offline checks passed.
Any later real attempt must first be explicitly approved with this uncertainty
and the single-request scope understood; inspect only sanitized categories.
