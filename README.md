# Medretica

**Your Medical Learning Operating System.** An integrated medical learning platform. See the [brand contract](docs/MEDRETICA_BRAND.md).

A concept-centered medical learning system: study → answer → understand mistakes → revise → measure retention.

## Start here
- [AI-independent development and switching tools](docs/AI_CONTINUITY.md)
- [Current engineering handoff](docs/AI_HANDOFF.md)
- [Starter prompt for Claude Code or Codex](docs/AI_STARTER_PROMPT.md)
- [AI uploads, exclusive question homes and connected Notes/Graph contract](docs/CONTENT_LIBRARY_CONTRACT.md)
- [Current status and next task](docs/STATUS.md)
- [Project context and continuity](docs/PROJECT_CONTEXT.md)
- [Content lifecycle](docs/CONTENT_WORKFLOW.md)
- [Consumer payment gateway decision](docs/CONSUMER_PAYMENT_GATEWAY.md)
- [Cashfree merchant onboarding and sandbox access preflight](docs/CASHFREE_MERCHANT_ONBOARDING.md)
- [Cashfree sandbox credential storage for iPhone/iPad](docs/CASHFREE_SANDBOX_SECRET_SETUP.md)
- [Product scope](docs/PRODUCT.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data contracts](docs/DATA.md)
- [Decision log](docs/DECISIONS.md)
- [AI contributor instructions](AGENTS.md)

## Current implementation

The centered navigation implementation in [PR #233](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/233) gives tablet/desktop a 56px top header with separate workspace links and contextual tools, independent nested indexes and persistent pins. Narrow tablet windows use a labeled top launcher; no permanent sidebar reserves learning width. Phone navigation from PR #232 remains unchanged. Server-authorized Master Admin follows Exams; Account utilities and Preferences live in the avatar. Preferences separates Sage Precision / Lavender Precision, Standard / optional Glass, and Light / Dark. Glass follows the selected palette on navigation only; reading cards remain opaque. [ADR-113](docs/DECISIONS.md) and [the appearance contract](docs/FINAL_NAVIGATION_APPEARANCE.md) record the current approved arrangement; [status](docs/STATUS.md) distinguishes branch verification from production release.

Admin tool views show their own workspace, while Overview contains summary cards, urgent counts and shortcuts. In-page navigation preserves loaded tool drafts and results; [ADR-107](docs/DECISIONS.md) records the approved workspace separation and its access boundaries.

The next post-reset input is the owner's **final polished PYQs**, with no fixed batch count or respiratory-only scope. Follow the [current PYQ intake plan](docs/FIRST_REPLACEMENT_BATCH.md), preserve supplied originals/polishing lineage and use the existing accountable admin review. The former fixed respiratory batch is cancelled; the erased pilots remain excluded from reimport.

The [material release adapter](docs/MATERIAL_RELEASE_ADAPTER.md) is integrated through [PR #204](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/204). Main CI and both Cloudflare production builds passed. Actual Drive/archive and app staging integrations remain pending verified external ports and real supplied-material acceptance.

The connected [Notes/Graph library](https://medical-learning-os-web.medicalos.workers.dev/web/library.html) and [Admin import inbox](https://medical-learning-os-web.medicalos.workers.dev/web/content-import.html) now extend the existing app. Read the [upload contract](docs/CONTENT_LIBRARY_CONTRACT.md) before adding any content. Connected repository uploads stage drafts; one authorized **Review & publish** action makes them live. Private imports remain deferred. The authorized old-content and dependent-history reset is complete; the library awaits new supplied content.
Repository foundation, validated question-attempt events, replayable accuracy summaries, and a canonical concept/source/question catalog with versioning and publication review gates. A responsive local web preview adds learner settings, dark mode, a live personal countdown, and a persisted nonclinical study demo with bookmarks, incorrect queue and JSON export. See [learner app contract](docs/LEARNER_APP.md).

The hosted app uses Supabase Auth and authenticated APIs with server scoring, scheduling and publication gates. Cloudflare hosts the learner surface, while the local nonclinical demo stays isolated. Existing Study, Exams, Vault and Account flows remain available. See [current status](docs/STATUS.md) for verified releases and pending real-content acceptance.

## Run locally
Requires Node.js 24 or later. No dependency installation or API keys required.

```sh
npm test
npm run check
npm run demo
npm start
```

Open `http://127.0.0.1:3000` after `npm start`. Progress stays on that browser and origin; this preview is not publicly deployed.

## Layout
- `web/`: responsive learner preview.
- `src/adapters/`: transactional local storage.
- `src/domain/`: framework-independent learning logic.
- `examples/`: synthetic executable demonstrations, not medical teaching material.
- `tests/`: behavior and data-integrity tests.
- `docs/`: durable project memory and implementation state.
- `.github/`: contribution templates and continuous integration.

## Development workflow
Read AGENTS.md, docs/AI_HANDOFF.md and the latest docs/STATUS.md entries first. ChatGPT/Codex and Claude Code share these repository instructions; CLAUDE.md imports AGENTS.md. Implement one roadmap task, verify it, then update status and decisions. Use a feature branch and pull request for subsequent work. Keep provider credentials server-side and out of version control.

## Content and license
Use original, licensed, or permissioned material; record provenance and medical review before publication. No software or content license has been selected. Do not infer an open-source license from repository availability.
