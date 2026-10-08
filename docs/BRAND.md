# PARSE — Brand identity contract

**Status:** Owner-selected product identity, 2026-10-08 (Asia/Kolkata). **Implementation phase:** documentation only; future UI rollout pending.

## Canonical brand

- **Primary public-facing brand:** **PARSE** (all caps).
- **Brand descriptor:** **The Medical Learning OS**.
- **Preferred lockup:** `PARSE` on the first line, `The Medical Learning OS` below.
- **Accessible plain-text variant:** `PARSE: The Medical Learning OS`.
- **Document/browser-title example:** `PARSE | The Medical Learning OS`.
- **Short form in learner-facing copy:** `PARSE`.
- **Product category:** adaptive medical learning platform for durable knowledge, transfer, and exam preparation.

PARSE is a proper brand name, **not a confirmed acronym**. Do not invent an expansion. The words *Medical Learning OS* remain valid as the product's description and as historical architectural terminology.

## What changes and what does not

The owner selected a **future brand identity**, not a rename of deployed infrastructure. This decision does **not** authorize migration, deletion, release, or immediate rebranding of the live app.

Keep existing technical identities unchanged unless a separately reviewed migration requires them: GitHub repository `Medical_Learning_OS`; Supabase project/database; Cloudflare Workers/Pages routes and addresses; deployed services; OAuth redirect URIs; API routes; event names; canonical IDs; content versions; audit records; secrets; backup paths; external links; historical documentation and commit/PR history.

Continue to use the existing names when referring to actual deployed endpoints, code paths, and historical records. Do not rewrite historical evidence or references solely for cosmetic consistency.

## Future implementation checklist (separate change)

1. **Brand eligibility:** check trademark availability, confusingly similar medical/education brands, usable domains, and social handles before asserting public exclusivity.
2. **Design system:** prepare accessible wordmark/icon, typography, light/dark variants, favicon/app icons, loading and error states; choose visual assets through design review.
3. **Learner surfaces:** update visible navigation/header/login/onboarding/account titles, browser metadata, PWA manifest and publicly indexed descriptions consistently.
4. **Communications:** update outbound emails, sender-facing display text, help/support copy, privacy/terms/company disclosures, and screenshots only when approved and truthful.
5. **Migration verification:** check old URLs/OAuth links and API compatibility; retain redirects and historical identities where needed; test phone/tablet/desktop and accessibility.
6. **Controlled release:** use ordinary PR, CI, preview, approval and rollback flow. No content reset, learning-model change, event-schema migration, or new AI feature is implied.

## Product invariants

PARSE retains the same canonical Medical Knowledge Graph, learner-evidence ledger, Preparation Digital Twin, Study Now policy, Question Intelligence, Exam DNA, Mistake Intelligence, Memory Engine, NeuralVault, clinical reasoning, and content review/rights gates. Branding must not change medical truth, learning evidence, rights governance or the criterion of **maximum durable medical mastery per unit learner time**.
