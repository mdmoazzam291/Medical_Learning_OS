# Six-question production reset — 4 November 2026

The owner explicitly authorized permanent live deletion of the six remaining questions, their attempts and any NMC question bindings. This supersedes the earlier transition receipt's six-question inventory.

Catalogue v446 → v447. Removed six question versions, their six attempts and four target-only sessions, six confidence events, six schedule decisions, five revision rows, three recommendations, five recommendation transport rows, eighteen question review rows, six question metadata rows, and the single exact six-question import manifest. A first rollback rehearsal identified a transport foreign-key dependency. A corrected rollback rehearsal passed before the matching transaction committed. The existing transaction-scoped learner erasure exception was used with row-count checks. No triggers were disabled.

Independent live readback returned zero questions, notes, attempts, sessions, confidence, schedule, revision, recommendation transport and target import copies. Ten canonical concepts remain. The deployed NMC pack @2 contained none of the six question IDs and the database scan found no question bindings there. The NMC drafts and two proposed source links remain available. Its authored catalogue version remains v446 and the Admin preview can show a catalogue-version change against v447.

This receipt covers live application data. Backup copies and provider retention were outside this operation. Do not restore the deleted batch from a historical copy. Foundation work continues in PR412 before any PYQ import.
