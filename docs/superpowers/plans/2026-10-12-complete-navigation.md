# Approved navigation implementation

The owner has approved the navigation through the PDF review and successive prototypes, including Q1/Q2/Q3, and asked to implement all of it in the main application. The current implementation base is main `1af8765` in an isolated feature worktree. The repository, rather than the illustrative prototype, owns learning and publication behavior.

## Design and boundaries

- One top row: Medical Learning OS, Home, Study, Library, Exams, Account, global search, dedicated light/dark button. At phone widths use short branding and labelled icons without wrapping.
- A shared left panel starts as a 64px icon rail and expands to 220px. Section children expand independently. Subject Index belongs inside Subjects & Topics. Click/tap flyouts, Escape/outside dismissal and keyboard operation work without hover. Pinned section shortcuts follow the learner across all five masters.
- Use the approved lavender light/dark palette. Persist only validated device preferences, saved filter views and canonical bookmarks; blocked storage falls back to page memory. Do not persist private note drafts, answers, auth or clinical material in this store.
- Library routes cover all 19 subjects, Notes/Questions/Graph, Atlas, media categories, nine shared references, comparison, prerequisites, My Notes and Saved Views. Notes/Questions/Graph share canonical filters. Subject module and reference indexes use explicit published classification, not guessed medical mappings.
- Study routes cover configuration/practice/revision/mistake repair/recall/cases/images/skills. Existing server-owned scoring, confidence, media, revision and resumable sessions remain authoritative. Source-bound self-review never creates scored attempts or recall evidence. Unsupported media, sequential-case and 3D capabilities display their actual content requirements rather than invented material.
- Exams keep their actual simulator, Exam DNA, past runs, autopsy and server rule views. Account retains identity, personal data, research and verified admin authority. Admin is an Account child, never a sixth top destination.
- No clinical import, content restoration, new human attestation or server exam-rule change follows from this UI task.

## Tasks

1. **Shared shell and navigation model.** Add `src/domain/app-navigation.js`, `web/navigation.js`, `web/navigation.css`; integrate all real page entry points; extend the explicit public allowlist. Test independent submenu state, nested ownership, validated pins, role filtering and storage failures before implementation. Preserve existing page DOM/form lifetime during rail/theme changes.
2. **Published Library and learning workspaces.** Add taxonomy/workspace projections and their tests. Extend `web/library.js` with shared filters, Questions, subject modules, references, comparison/prerequisite views, device saved views/bookmarks and source-bound self-review. Add an authenticated `web/workspace.html`/module for real diagnostic, progress and preference views where the existing pages have no route. Preserve `/study` exact-version selection and resumable server behavior; explicit labels distinguish device state and unsupported content.
3. **Responsive verification and delivery.** Add real built-bundle browser coverage for 390/820/1440 widths, single-line header, nested independent menus, flyouts, pins/theme persistence, search, role boundary, published filters and no unsolicited writes. Update existing browser selectors only where the approved labels move. Run `npm test`, `npm run check`, build and actual browser checks. Review the whole branch independently, fix release blockers, record ADR/status and create the GitHub PR with verification evidence.

## Review focus

Preserve authenticated role boundaries, exact question identities, post-answer disclosure and original-only evidence; never publish fixtures. Check that no rail/theme operation loses an unsaved form, every visible destination has a functional route, URL context survives view changes, untrusted strings stay escaped, and unavailable data never appears as a fake learning outcome. Desktop/phone/tablet tests must inspect the actual built application.
