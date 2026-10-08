# PARSE — provisional brand and rollout contract

**Owner selection:** 2026-10-08 (Asia/Kolkata). **Public launch status:** PROVISIONAL, pending trademark clearance. **Change scope:** documentation/design proposal only. No live UI, auth, domain, database or content changes authorized by this document.

## 1. Brand identity (candidate)

- **Wordmark:** PARSE (uppercase).
- **Descriptor:** The Medical Learning OS.
- **Lockup:** PARSE on line one, The Medical Learning OS beneath.
- **Plain text and accessibility:** `PARSE: The Medical Learning OS`.
- **Proposed page title after public clearance:** `PARSE | The Medical Learning OS`.
- **Category:** adaptive medical learning platform across MBBS, examinations, residency and lifelong medical practice.
- **Meaning:** PARSE is a brand name, not a defined acronym. Do not invent an expansion or imply exclusivity.

## 2. Visual identity proposal, not approved production artwork

Direction: **precision medical intelligence**. Convey connected knowledge, evidence, adaptation and progress; prioritize clarity and clinical trust over visual decoration.

| Token | Role | Hex |
| --- | --- | --- |
| midnight | Primary dark surface | `#0C1425` |
| cyan | Primary action and active focus | `#24D3E1` |
| violet | AI assistance / secondary emphasis | `#8C7CF2` |
| paper | Light-mode surface | `#F5F8FA` |

- **Symbol candidate:** a distinct flowing letter P assembled from 3–4 connected nodes and one continuous path, denoting concept → evidence → intervention. This is *not* a protected/verified final logo.
- **Typography:** accessible geometric sans with clear distinction of 1/I/l and 0/O in medical dosage, questions and exam timers. No third-party font is required.
- **Modes:** high contrast dark/light, reduced motion, keyboard focus visibility, WCAG-conformant text contrast and a monochrome mark.
- **Don't:** generic medical cross, caduceus, ECG-heart, unrealistic 3D particle animations, glow behind question stems or continuous motion near a timed exam.
- **Critical UX principle:** preserve the already established Aperture interface direction. On Home, **Study Now** is the primary action; QBank, Vault, Exams and Progress remain legible and minimal. Branding does not create a new learner flow.
- **Deliverables once cleared:** clean source/vector logo, standalone icon, responsive wordmark, monochrome/dark/light variants, favicon, PWA icons, email header assets and usage rules; don't treat an AI-generated concept image as ready-to-publish source artwork.

## 3. Naming due diligence, performed 2026-10-08

**Finding: material naming overlap. PARSE is not an established exclusively available name.**

1. `parse.com` is registered to Meta Platforms, Inc. Source: https://www.whois.com/whois/parse.com
2. Parse Biosciences uses the PARSE trademark for sequencing products and software. Its own notice: https://www.parsebiosciences.com/legal/trademarks/ . A U.S. Class 9 PARSE registration is also reported: https://www.trademarkia.com/parse-90268793
3. Open-source **Parse Platform** also uses the exact name for backend software: https://docs.parseplatform.org/
4. A 2026 U.S. PARSE SaaS application by Milliman concerns medical/prescription claims. Source: https://trademarks.justia.com/996/38/parse-99638586.html
5. Historic Indian Class 9 and 42 PARSE entries appear in secondary records; their reported status varies and requires verification in official IP India records: https://www.indiafilings.com/search/parse-tm-3011749 and https://www.indiafilings.com/search/parse-tm-3011750 .

**Status:** preliminary web due diligence, **not** a trademark clearance or certification of non-infringement. Distinguish exact marks, similar marks, goods/services overlap and jurisdiction. For India, examine classes **41 (education), 42 (SaaS), 9 (downloadable software)** and related marks in the official register: https://ipindia.gov.in/ . For global expansion investigate target countries separately.

**Domain verification:** `parse.com` is taken. `parsemedicalos.com`, `learnparse.com`, `parselearn.com`, and `getparse.in` are merely *candidate strings*: their registration status has **not** been verified, and no name/domain has been purchased or reserved.

**Hard release gate:** Do not claim brand exclusivity, file trademark applications, buy a domain as a final brand asset, change public social profiles or deploy a PARSE-branded live application until jurisdiction-appropriate clearance and the owner's explicit release decision. If clearance fails, choose a more distinctive new name without altering the underlying product architecture.

## 4. Future UI transition: presentation only, subject to clearance

**Phase 0, now:** keep legacy production identity/URLs. Maintain brand concept, due diligence and design tokens in docs. No live rebrand.

**Phase 1, after clearance:** implement a centralized `productDisplayName`/brand-presentational contract rather than scattering hardcoded text. Update learner-visible:
- page headers, sign-in/out, Home, Study, Exams, Vault, admin chrome only where appropriate;
- browser titles, meta descriptions, favicon, install/PWA manifest, icon sizes and accessible alt labels;
- errors, loading, empty states, emails and onboarding; don't replace clinical or legal text without review.

**Phase 2:** accessible visual integration of logo and tokens in the current Aperture UI; preserve layouts, existing study behavior and all published medical content.

**Phase 3:** bounded deployment only with QA for phone/tablet/desktop, keyboard/contrast, PWA install/reload, real account sign-in, Google OAuth/password recovery, admin permissions, email sender identity, old URL compatibility and rollback.

## 5. Technical identities explicitly protected

Do **not** rename/rekey:
- GitHub repo `Medical_Learning_OS`, package name, historical directories/commits/PRs;
- Supabase tenant/project, DB tables, RLS rules or canonical medical concept and question/version IDs;
- Cloudflare Worker/Pages service names, current origin URLs, OAuth redirects and Sentry/PostHog identifiers;
- event names, evidence ledger, audit records, source-rights provenance, existing linked note IDs, backup archive paths;
- deep links, stored local preferences, API endpoints, auth identities and existing redirects.

If a later identifier must move for a separate operational reason, use a backward-compatible migration with individual verification; never bundle it into cosmetic branding.

## 6. Product invariants

The same Medical Knowledge Graph, Preparation Digital Twin, Study Now, Question Intelligence, Exam DNA, Mistake Intelligence, Memory Engine, NeuralVault, Adaptive Teaching, clinical-reasoning engine, examination adapters and content review gates continue unchanged. **Maximum durable medical mastery per learner minute** remains the product's north star.
