# Medical Learning OS

A concept-centered medical learning system: study → answer → understand mistakes → revise → measure retention.

## Start here
- [Current status and next task](docs/STATUS.md)
- [Project context and continuity](docs/PROJECT_CONTEXT.md)
- [Content lifecycle](docs/CONTENT_WORKFLOW.md)
- [Product scope](docs/PRODUCT.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data contracts](docs/DATA.md)
- [Decision log](docs/DECISIONS.md)
- [AI contributor instructions](AGENTS.md)

## Current implementation
Repository foundation, validated question-attempt events, replayable accuracy summaries, and a canonical concept/source/question catalog with versioning and publication review gates. This is not yet a web application. Authentication, database persistence, QBank UI, scheduling and AI are planned.

## Run locally
Requires Node.js 24 or later. No dependency installation or API keys required.

```sh
npm test
npm run check
npm run demo
```

## Layout
- `src/domain/`: framework-independent learning logic.
- `examples/`: synthetic executable demonstrations, not medical teaching material.
- `tests/`: behavior and data-integrity tests.
- `docs/`: durable project memory and implementation state.
- `.github/`: contribution templates and continuous integration.

## Development workflow
Read AGENTS.md and docs/STATUS.md first. Implement one roadmap task, verify it, then update status and decisions. Use a feature branch and pull request for subsequent work. Keep provider credentials server-side and out of version control.

## Content and license
Use original, licensed, or permissioned material; record provenance and medical review before publication. No software or content license has been selected. Do not infer an open-source license from repository availability.
