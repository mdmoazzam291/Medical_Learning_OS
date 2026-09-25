# Decision log

## ADR-001 — Separate product repository (accepted, 2026-09-25)
Medical_Learning_OS is independent of NEETPG2027. Existing exam preparation is a use case, not a migration instruction.

## ADR-002 — Foundation before framework (accepted, 2026-09-25)
Use dependency-free JavaScript and Node's built-in test runner for the first domain module. This allows a verified starting point without choosing hosting, database or AI provider prematurely. A web framework and TypeScript remain options for M03.

## ADR-003 — Evidence before personalization (accepted, 2026-09-25)
Store versioned events and show descriptive accuracy first. Digital Twin, Memory Debt and mastery estimates remain planned until their methods and validity are established.

## ADR-004 — Source and license decisions (pending)
No license selected, no paid content imported and no AI vendor configured. Resolve software distribution and content permissions explicitly before public distribution.

## ADR-005 — Context-backed canonical content (accepted implementation choice, 2026-09-25)
Use the named Medical Learning OS project as design context and GitHub as implementation evidence. Record source topics, user decisions versus assistant proposals, and retrieval limitations in PROJECT_CONTEXT.md. Do not treat unseen Drive/XMind plans as reconciled.

Implement a minimal shared concept/source/question catalog before the UI. Subject tags are views, question versions preserve history, and provenance distinguishes original/generated content from recalled/licensed PYQs. Domain review gates model medical/reference/rights approval; authentication and actual medical review remain outside the pure functions. New versions require fresh reviews. Publishing a replacement retires the prior published version without changing its content. This supports future NeuralVault links and version-specific learning evidence without duplicating medical curricula.
