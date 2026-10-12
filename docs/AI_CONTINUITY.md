# AI-independent development continuity

Accepted: 2026-10-12 (Asia/Kolkata). Scope: Medical_Learning_OS only.

## Ownership and authority
The repository owns implementation, accepted decisions, verification and engineering handoffs. Google Drive owns source-material originals, material governance and immutable releases. ChatGPT/Claude conversations supply proposals or explicit owner instructions; neither provider's private memory is required to resume recorded work. Missing decisions remain unresolved rather than invented. An explicit current owner instruction supersedes older project records; record the change.

Use AGENTS.md as the shared contributor contract. CLAUDE.md imports it. Repository workflow guides are portable reading material, not automatically installed skills, account connections or running automations. No new infrastructure or model dependency is introduced.

## Starting a task
1. Read AGENTS.md, README.md, AI_HANDOFF.md, PROJECT_CONTEXT.md and the latest STATUS.md entries, then relevant contracts and decisions.
2. Inspect the actual remote default branch, commit, open PRs and current working tree. The handoff is a dated snapshot, not a lock or proof that remote state is unchanged.
3. Identify one task, its current owner, acceptance criteria, branch and deployment scope. If the handoff is stale, reconcile repository evidence before acting.
4. Claim a task with a GitHub issue or PR comment that names the acting tool and branch when messaging is explicitly authorized. Otherwise use the owner-designated task record and report the claim to the owner. Never assume this document grants permission to message other people.
5. Start from current main for new work; resume the existing task branch for a transfer. Preserve unfinished work as a WIP commit on that feature branch.
6. Inspect the files before changing them. Use repository commands and existing patterns; read content contracts before any ingestion.

## Switching between ChatGPT and Claude
- One active writer per task. Stop the outgoing task before the incoming agent edits its branch. Ending a chat does not necessarily stop a remote job.
- The outgoing agent records objective, owner/released ownership, branch, base and current commit, PR, changed files, unfinished work, test commands/results/time, blockers and exact next action in AI_HANDOFF.md. Push WIP work before switching; do not leave the only copy in an agent's scratch filesystem.
- The incoming agent verifies branch/head and open PRs independently, reads the handoff, then resumes that branch. It must not restart completed work or merge superseded PRs.
- Independent tasks may use different branches. Assign explicit file/scope ownership; shared governance, migrations, release actions and overlapping files are serialized.
- Each PR is merged serially. Refresh from main before resolving conflicts; preserve newer owner decisions rather than blindly accepting either side.
- Verification belongs to the actual commit. After rebasing or resolving conflicts, rerun affected checks; update the evidence.
- Never force-push someone else's branch, replace unknown changes, or run competing production deployments.

This is a cooperative protocol, not an automated lock. No queue, watcher, task scheduler or cross-provider synchronization is installed.

## Finishing
Update STATUS.md, record material decisions in DECISIONS.md, and update AI_HANDOFF.md with completed/pending states. Use focused branches and PRs. Distinguish pushed, merged, CI-passed, deployed and hosted-verified states. A code change does not prove a deployment or material import.

## Portable workflows and access
- [Material intake](workflows/material-intake.md) and [material contract](workflows/material-contract.md).
- [Faculty insights](workflows/faculty-insights.md) and [insight contract](workflows/insight-contract.md).
- [Environment and service access](AI_ENVIRONMENT.md).
- [Starter prompt](AI_STARTER_PROMPT.md).

Read the live Drive governance and verify the existing master folder before writing. Resolve its identity through an authorized connector; do not create a replacement folder when access is missing. Keep private bindings/credentials outside this public repository. Missing access allows local draft preparation but blocks dependent external writes; record the gap.
