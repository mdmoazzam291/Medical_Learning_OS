# AI-independent development continuity

Accepted: 2026-10-12 (Asia/Kolkata). Scope: Medical_Learning_OS only.

## Ownership and authority
The repository owns implementation, accepted decisions, verification and engineering handoffs. Google Drive owns source-material originals, material governance and immutable releases. ChatGPT/Claude conversations supply proposals or explicit owner instructions; neither provider's private memory is required to resume recorded work. Missing decisions remain unresolved rather than invented. An explicit current owner instruction supersedes older project records; record the change.

Use AGENTS.md as the shared contributor contract. CLAUDE.md and GEMINI.md import it and the current handoff/continuity guide. Repository workflow guides are portable reading material, not automatically installed skills, account connections or running automations. No new infrastructure or model dependency is introduced.

## No repeated prompt: standing checkpoint policy
Accepted by the owner on 2026-10-13. AGENTS.md now directs the acting agent to update and push its task checkpoint at meaningful milestones, before long waits and before planned pauses, context compaction, switches or final responses. Routine feature-branch checkpointing within task scope needs no repeated owner request. Explicit staging, remote verification and accurate WIP/test states are required; production release and material publication authority are unchanged.

Codex/AGENTS-aware agents use AGENTS.md. Claude Code loads CLAUDE.md imports; Gemini CLI loads GEMINI.md imports. The new agent must open the same repository/workspace and fetch current state. The user can then give a short task or say “continue”; they do not need to paste the starter prompt. Verify loaded context once during each tool's initial setup (Claude /context; Gemini /memory show) and reload stale context when switching branches.

This policy is cooperative, not enforced by an installed hook. It cannot capture a killed process's unpushed edits, detect a browser/app switch or cancel another vendor's running task. ChatGPT web Projects, ordinary Claude chats and other tools that do not load repository instruction files need a one-time persistent project instruction/repository connection in their own settings; this repository change does not configure those accounts. File-only knowledge snapshots must be refreshed. Unsupported agents require their own documented instruction entry point. No claim of universal zero-setup autosave is made.

References: [Claude memory/imports](https://code.claude.com/docs/en/memory), [Gemini context/imports](https://geminicli.com/docs/cli/gemini-md/).

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
