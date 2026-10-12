# Project instructions

## Scope
Work only in Medical_Learning_OS. Do not access, copy, merge, or modify the separate NEETPG2027 project without explicit user authorization. NEET-PG is an exam adapter in this product.

## Start each task
For any uploaded questions, PYQs, platform Qbanks, notes, books or concepts, read `docs/CONTENT_LIBRARY_CONTRACT.md` first. Preserve explicit user provenance, exclusive PYQ/platform homes and connected canonical identities. Stage ChatGPT uploads through `content/inbox/` or the authenticated admin intake; never publish on the agent's behalf. Private imports are deferred. The owner-authorized 2026-10-04 permanent reset is complete in the live database; never reimport erased catalog/test seed material or restore pre-reset backups. Read `ops/content-reset/README.md` for remaining-copy scope. Preserve new question-pattern keywords in `classification.tasks`; read the keyword search section of the contract.
Read README.md, docs/AI_CONTINUITY.md, docs/AI_HANDOFF.md, docs/PROJECT_CONTEXT.md, the latest docs/STATUS.md entries, docs/ROADMAP.md and relevant architecture/data contracts. Inspect current main, open PRs and task ownership; resume the named active branch for transferred work. Use repository records for implementation truth and accepted decisions, independent of the development AI. The ChatGPT project named “medical learning os” is optional supplementary context when accessible, never a prerequisite. If an unrecorded decision would change the task, retrieve an owner-provided source or record the gap before making a conflicting choice. Separate direct user decisions from prior assistant proposals and state retrieval limits. Inspect the actual implementation before claiming a feature exists. Chat ideas are proposals until recorded and implemented. Read docs/workflows/ for portable material/faculty procedures; verify current Drive governance before external writes.

## Implementation
- Build the smallest complete learning loop before advanced personalization.
- Give each concept a canonical ID; reference it across subjects, questions, notes and exams.
- Keep domain logic independent of UI, database and AI providers.
- Preserve versioned learning events; derived summaries must be rebuildable and retries idempotent.
- Do not present accuracy as mastery, predicted rank, or validated retention.
- Never invent PYQ provenance, guideline citations, clinical verification or user data.
- Keep secrets and patient-identifying information out of code, fixtures and logs.
- Add dependencies only for an actual implementation need; preserve lockfiles when introduced.
- Keep medical content review and user annotations separate from generated drafts.
- Follow local instructions and user authorization; never mark planned work complete prematurely.

## Finish each task
Run npm test and npm run check for domain changes. For UI changes, verify the actual phone/tablet/desktop flows and persistence. Record what changed, verification, limitations and the next task in docs/STATUS.md. Record material design decisions in docs/DECISIONS.md. Update docs/AI_HANDOFF.md with branch/head, ownership, verification, unfinished work, blockers and the exact next action before switching providers or finishing. Stop outgoing remote tasks before transferring the same branch; one active writer per task. Use focused commits and feature branches after initial setup.
