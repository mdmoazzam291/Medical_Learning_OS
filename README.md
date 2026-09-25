# Medical Learning OS

A concept-centered medical learning system: study → answer → understand mistakes → revise → measure retention.

## Start here
- [Current status and next task](docs/STATUS.md)
- [Account study integration and limits](docs/ACCOUNT_STUDY.md)
- [Project context and continuity](docs/PROJECT_CONTEXT.md)
- [Content lifecycle](docs/CONTENT_WORKFLOW.md)
- [Product scope](docs/PRODUCT.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data contracts](docs/DATA.md)
- [Decision log](docs/DECISIONS.md)
- [AI contributor instructions](AGENTS.md)

## Current implementation
Repository foundation, validated question-attempt events, replayable accuracy summaries, and a canonical concept/source/question catalog with versioning and publication review gates. A responsive local web preview adds learner settings, dark mode, a live personal countdown, and a persisted nonclinical study demo with bookmarks, incorrect queue and JSON export. See [learner app contract](docs/LEARNER_APP.md).

M04a adds a separate [local study API](docs/SERVER_STUDY.md): credential-scoped access, SQLite persistence, trusted scoring, version eligibility, safe retries and exports. It is not connected to the browser yet. Real accounts, reviewed medical content, cloud sync, scheduling and AI remain planned.

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
Read AGENTS.md and docs/STATUS.md first. Implement one roadmap task, verify it, then update status and decisions. Use a feature branch and pull request for subsequent work. Keep provider credentials server-side and out of version control.

## Content and license
Use original, licensed, or permissioned material; record provenance and medical review before publication. No software or content license has been selected. Do not infer an open-source license from repository availability.
