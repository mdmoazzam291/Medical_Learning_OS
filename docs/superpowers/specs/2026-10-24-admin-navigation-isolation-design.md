# Admin navigation isolation

The owner approved changes only to the Master Admin entry and its own tools, explicitly removing Admin from top navigation and fixing any Admin controls appearing in other masters. Keep Home, Study, Library and Exams destinations, content, appearance and interactions intact.

Use the existing shared shell: one server-authorized Master Admin entry in the avatar menu, with a local Admin tools trigger inside Admin pages. On phone this local trigger opens the existing drawer; on tablet/desktop it opens the existing contextual tools menu. The global master list contains only the four learner workspaces. Admin pins must never render in learner contextual menus, including legacy saved pins. Preserve unrelated learner pins and saved preferences.

Preserve all five Admin groups and their canonical tools. Remove the redundant navigation row on Import & review and expose its existing Medical relationships anchor in the Admin content group. Do not combine Medical/References/Rights authority or edit review forms, database/API gates, clinical content or learner features. No new sidebar or new general review application is authorized.

Alternatives: retaining Admin in the top navigation conflicts with the explicit owner instruction; adding a permanent Admin sidebar is unnecessary for this bounded repair. The avatar plus local tools approach uses existing behavior and needs no new dependencies.

Acceptance: Admin entry exists only for signed-in users with affirmative server authority; learner main/section navigation has no Admin links or pinned controls. Admin tools remain reachable on phone/tablet/desktop, with independent groups, current-leaf markers, preserved in-page drafts, history, dismissal, focus return and denial/revocation behavior. Actual authenticated production acceptance requires a genuine session; synthetic browser verification is not that claim.
