# NMC source-linked catalogue reset — 4 November 2026

Owner /root. The user authorized deleting concepts and objectives outside the current NMC mapping. Applied criterion: keep concepts and objective versions reachable from an explicit source proposal in the deployed pack. This criterion reflects current mapping evidence, not whether a topic belongs to the full curriculum.

Owner API v18 deployed the @3 pack. All 25 files matched deployment readback. Removed 19 unlinked objectives, including the second Brown-Sequard objective. Kept the Brown-Sequard localization objective and proposals AN57.5 and PY10.10. Both source-row digests passed verification. Both proposals remain pending review.

Catalogue v447 → v448: removed nine unlinked concept identities and their nine classification rows. The live readback returned one concept and one classification, with zero questions and attempts. The retained concept is Brown-Sequard syndrome. Earlier inventory found no other app references to the nine IDs beyond those classification rows. Historical backups and Git revisions were outside the live cleanup.

Code 0f4379398d96eeb6b0eb4dfc0df6d33c5d9889f5, branch feat/nmc-linked-only-20261104, base 2e76e785. Focused API/domain tests passed (12). Hosted CI is pending. Next action: reconcile main with the deployed pack after hosted verification, then continue mapping the pinned NMC catalogue. PR412 records historical candidate evidence and must not be used to restore deleted identities.
