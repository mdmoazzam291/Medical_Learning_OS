# Published learner content: unmapped-goal fallback release — 25 October 2026

Owner action: fix visibility of already-published imported content to learners with selected preparation goals.

## Production evidence

- PR [#321](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/321) merged as `c264eb1bfcd23e3158760ff721d7979fc3148181`. The release source is based on the current main; it does not overwrite concurrent Admin or infrastructure work.
- Full feature-run [Foundation 40141314085](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/40141314085) completed successfully: Node/check, Chromium and native WebKit. The responsive preparation checks include phone, split-screen, iPad portrait/landscape and desktop synthetic authenticated flows. Synthetic verification is not genuine learner-account acceptance.
- Cloudflare production checks on the merge commit reported SUCCESS: `medical-learning-os-web` build `5372881f-306f-47f9-b936-218989ec3b4a`, `medical-learning-os` build `c88ac15c-6930-483b-ab4a-deebbebc46c1`, and untouched `mlos-cashfree-sandbox` build `6b5be00f-67f1-43ca-836c-f12d7cb0f9d9`. These are provider build/deploy checks, not an independently fetched served-asset byte comparison.
- The manually deployed Supabase `study-api` advanced from v52 to **v53**, status ACTIVE, bundle digest `153b1fd4db6c18b80afffea056855ffdcae42f0c2cf8e0ae37481909d45b8900`. All ten prior bundled file identities were preserved; only `index.ts` and shared `preparation-pathways.js` changed. `verify_jwt=false` remains unchanged, with application token verification retained.
- Read-only live DB after deployment: catalog v446 with 6 published questions, 6 published notes and 1 published import. No publication, rights, permission, migration, exam artifact or learner data writes.

## Behavior and boundaries

- A valid configured goal with **no approved requirement mappings** displays published content in Library and uses it in newly created Study Now plans as explicitly **unmapped general practice**, never implied NEET-PG/INI-CET verified relevance.
- Invalid profiles fail closed; Needed foundations has no invented prerequisite scope; genuine approved objective and exact-version artifact mappings control recommendation scope once present. Existing sessions resume before new recommendation decisions; no history is reset.
- The real production signed-in learner UI and saved-session journey have **not** been authenticated with a genuine learner account in this release; use a separately authorized acceptance session and ensure all six questions/notes appear under normal learner navigation.

## Remaining engineering work

Acquire and approve real exam-objective mappings/teaching-assessment bindings separately, without inferring exam suitability from source origins. Retain exact medical, rights and evidence gates. This repair does not assert official syllabus coverage, mastery inference or full-mock readiness.
