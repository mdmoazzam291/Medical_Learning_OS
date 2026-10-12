# Starter prompt for Claude Code or ChatGPT/Codex

Paste this into an agent with access to the repository:

```text
Continue Medical Learning OS in https://github.com/mdmoazzam291/Medical_Learning_OS.
Work only in this repository; exclude NEETPG2027.

Read AGENTS.md, README.md, docs/AI_CONTINUITY.md, docs/AI_HANDOFF.md,
docs/PROJECT_CONTEXT.md, the latest docs/STATUS.md entries and relevant decisions/contracts.
Verify current main, open PRs, task ownership and the actual implementation before editing.
Treat dated handoffs as snapshots; reconcile newer evidence. Do not require access to
ChatGPT's private project or invent missing decisions.

Resume the named active branch for transferred work. For a new task, start a focused branch
from current main. Use one active writer per task; stop/release outgoing work before transfer.
Preserve Sage Precision/Lavender Precision, independent light/dark appearance, the authorized
top-level Admin master, isolated Admin tools and summary Overview.
Never merge superseded PRs or resurrect erased clinical/test pilot material.

Use the recorded next action. If it requires supplied material or missing external access,
report that specific blocker and continue only independent authorized work; do not fabricate input.
Read docs/CONTENT_LIBRARY_CONTRACT.md and docs/workflows/ before content tasks.
No clinical publication or learner-history writes merely to verify engineering behavior.

Run npm test, npm run check and npm run build:pages as applicable.
Use existing Chromium/WebKit CI for UI changes; distinguish fixtures from hosted verification.
Update STATUS.md, DECISIONS.md when needed, and AI_HANDOFF.md with branch/commit,
verification, unfinished work, blockers and exact next action.
Use a focused PR and report its URL. Merge/deploy only within the owner's recorded authorization.
```

For a specific task, append: “Current task: <objective and acceptance criteria>.”
If resuming an unmerged handoff, append its exact branch/PR and instruct the agent to verify
the head first. The prompt does not itself configure account permissions or import private chats.
