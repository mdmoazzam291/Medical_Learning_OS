# PARSE — candidate product brand

**Selection:** PARSE · **Descriptor:** The Medical Learning OS. Owner-selected 2026-10-08.  
**Implementation:** Provisional visual rebrand created 2026-10-13 on `feat/parse-preview-brand-20261013`.  
**Release state:** Not cleared for public brand use. See [trademark screening and release gate](PARSE_BRAND_CLEARANCE.md).

## User-facing identity

- Primary name: **PARSE**, uppercase and pronounced as the familiar English word.
- Descriptor: **The Medical Learning OS**.
- Browser home title: **PARSE | The Medical Learning OS**.
- Accessibility: brand link **PARSE Home**; the glyph is decorative; text remains present whenever screen width allows.
- Provisional icon: linked-node P mark implemented as simple inline SVG and favicon source in `web/brand.js` and `web/favicon.svg`.
- Not an acronym. Do not fabricate expanded initials or claim a registered trademark.

## Approved permanent palettes remain unchanged

**Sage Precision** (default) and **Lavender Precision** (Account preference), each with independently selectable light/dark appearance, remain the only approved palettes. Do not introduce the earlier conceptual cyan/violet theme as a third or replace either palette.

New brand styling uses existing semantic `--accent`, `--soft`, `--ink` and `--muted` tokens; no persisted preference format changes.

## Code locations

- `web/brand.js`: display name/descriptor and provisional symbolic SVG.
- `web/navigation-view.js` / `web/navigation.css`: common top brand and mobile collapse.
- `web/account-landing.js` / `web/account-landing.css`: signed-out landing.
- `web/*.html`: browser titles, metadata and loading headings.
- `web/app.js`, `web/account.js`, `web/oauth-consent.js`, `web/owner-console.js`: visible product labels.
- `web/favicon.svg`: provisional icon.
- `scripts/public-surface.js`: explicitly serves shared brand module.
- `tests/parse-brand.test.js`: contract guards.

## Not renamed

GitHub repository `Medical_Learning_OS`, package name, Supabase tenancy/Auth, Cloudflare Worker/URLs, OAuth callbacks, navigation destinations/links, API and event contracts, content/right records, source IDs, saved browser preferences, patient/learner records, telemetry and history remain unchanged.

This task does **not** alter content review, examination rules, scoring, Study Now policy, mastery models or authorized Admin actions.

## Release prerequisites

1. Resolve Class 9/41/42 India trademark conflicts, relevant common-law uses and target international markets to a documented **go** decision; `PARSE` currently **not cleared**.
2. Ensure branding PR CI passes and preview renders without overflow in Sage/Lavender × light/dark across phone/tablet/desktop; check iPad/WebKit separately.
3. Validate keyboard focus, legible text contrast, screen-reader link naming, and reduced-motion behavior.
4. Verify Google/password sign-in, OAuth consent, admin master permissions, all 5 learner destinations, and old deep links unaffected.
5. Only after clearance and explicit production release authorization, merge/publish through the normal CI/deployment/rollback process.

The earlier documentation-only [PR #203](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/203) remains historical context; this branch implements the UI without requiring that stale PR to merge.
