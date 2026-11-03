# NMC topics to published canonical learning

Owner continuation authorises the next catalogue integration. Reuse the existing authenticated published-library GET and existing canonical concept routes. Do not create concepts or clinical mappings from source headings, duplicate learning material, copy NMC prose, restore pilots or modify backend data.

Each topic has Find learning material. On demand, retrieve the current viewer's published-library projection and return distinct canonical IDs whose labels/aliases exactly match a topic label after spelling/format normalisation. No substring/fuzzy matching, diagnosis inference or merging of concept IDs. Generic headings require subject overlap. Matching is explicitly navigation discovery, not validated NMC equivalence. Multiple same-name IDs remain separate choices.

Show existing canonical labels and unique published question/note counts, with links to Concept, Notes, Questions and Graph. Empty, guest and network-error states are distinct. Guests get a sign-in link to the existing filtered Library. No response, token or learner performance is persisted. Identity must match before and after the read. Clear panels on account/storage/page lifecycle changes and ignore responses after navigation/filter changes. Keep the reference catalogue usable when learning material is unavailable.

Alternatives rejected: copying a concept per subject duplicates content; automatically approving semantic matches confuses navigation with clinical judgment; adding a new service/backend duplicates the published-library projection. No new dependencies or infrastructure.
