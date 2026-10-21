# Service portability implementation plan

Goal: preserve an explicit exit path from current and future services without changing production behavior.
Architecture: extend existing adapters, backups and repository governance; offline tools only.
Tech stack: Node 24 built-ins, JSON and Markdown, no new dependencies.
Spec: ../specs/2026-10-21-service-portability-design.md
Execution: inline in a new feature branch; scope authorized by current owner request.

## Constraints
No live mutation, clinical content, credential values or new provider subscription. Existing deployments and PR290 remain separate.

## Review focus
Malformed/unknown service registrations must fail; stale baselines must fail; symlinked/private exports must not escape their root; altered or incomplete packs must fail; successful integrity checks must not be described as restore tests.

## Tasks
- [ ] Test and implement scripts/lib/service-portability.js plus ops/portability/services.json and coupling-baseline.json. Validate unique IDs, required exit fields and real evidence paths. Compare exact path/provider pairs; fail additions and stale entries. Integrate into scripts/check.js and package scripts.
- [ ] Test and implement scripts/lib/migration-pack.js and scripts/migration-pack.js. Seal/verify only ignored .local/migrations directories, use streaming SHA-256, strict manifest validation and regular-file checks. Tests cover tampering, omissions, additions, traversal, duplicate entries, symlinks and invalid providers.
- [ ] Document exit procedures for all registered services and remaining gaps. Update AGENTS, README, PR template, architecture, decisions, status and handoff. Run npm test, npm run check, npm run build:pages and focused CLI smoke checks. Review diff; commit/push feature branch and open PR. Record verified remote head and exact pending release state.
