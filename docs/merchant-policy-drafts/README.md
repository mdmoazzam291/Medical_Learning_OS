# Medretica merchant policy review package

Prepared 19 October 2026 (Asia/Kolkata). **DRAFT — not published, not effective, not a claim of Cashfree readiness.**

Owner asked to complete the public website requirements shown in Cashfree whitelisting and explicitly include future changes to terms. This package prepares customer copy; it does not activate payments or change merchant details. Tracking: issue #266. Medretica is the owner-selected public brand; Medical Learning OS remains the descriptor and technical project identity.

## Review copy
- [Terms & Conditions](terms.md), including future changes and existing-purchase protection.
- [Privacy Notice](privacy.md).
- [Refunds & Cancellations](refunds.md), current unpaid-release notice only.
- [Future paid-launch refund proposal](future-refund-proposal.md), internal review only, not current customer terms.
- [Contact Us / operator disclosure](contact.md).
- [Digital Service Delivery](delivery.md).
- [Services & Pricing](services.md).

Every OWNER INPUT marker is intentional and blocks publication. They must not be presented as completed policies to Cashfree. Proposed customer commitments are drafts requiring owner confirmation, not existing operational capabilities.

## Owner-confirmed facts — 19 October 2026
- Operator: **Md Moazzam**, **sole proprietorship**; exact legal-name match to Cashfree confirmed by owner. No independent KYC-document inspection; none requested.
- Public address supplied for this task: **Bhogari, Bettiah, Bihar, Bharat (India) — 845454**.
- Owner asks whether Dr. Moazzam can be used as display name: keep any accurate professional/personal display name separate from exact legal operator disclosure. Do not replace Md Moazzam in the operator line or Cashfree KYC. Use the approved operator wording below, without trading-as phrasing.
- Public support email: **support@medretica.com**; administration email: **admin@medretica.com**. Owner confirms support@medretica.com can receive messages and send replies. No independent mailbox test was performed.
- Paid plans must **remain unavailable**. Final premium prices are not needed to describe the current unpaid release; they remain a prerequisite for a future paid launch.
- Current unpaid-service notice is in refunds.md; detailed future paid rules remain unapproved internal proposals only. Future terms-change clause remains intact.

## Remaining facts required from the owner
1. Legal operator/type/name-match and public address are now owner-confirmed; do not ask for them again. No KYC document/number needed.
2. No public phone is available: state email-only support honestly. Do not invent or reuse a personal number. Address is supplied. Confirm support hours/complaint commitments and designated grievance contact; owner confirms receipt and reply capability; independent delivery not tested. Email-only disclosure is not proof that Cashfree will accept the site without a phone.
3. Owner clarified refunds/cancellation are for later, with no paid subscriptions currently. refunds.md now contains only the current unpaid-release notice. Future detailed policy is preserved separately in future-refund-proposal.md, excluded from current customer policy and still unapproved. Do not ask for approval of paid-launch commitments as a prerequisite to an unpaid-release page.
4. Current paid status is confirmed unavailable; any future paid launch still requires final INR prices/period/taxes/inclusions/limits/delivery target. Do not turn proposed existing prices into offers.
5. Privacy retention periods, processors/locations and safeguards, request handling, age eligibility/parental handling and any AI data use. Confirm actual deployments; source alone does not prove current runtime settings.

## Public page implementation prepared for review — 19 October 2026
Six static HTML pages now exist under web/terms.html, privacy.html, refunds.html, contact.html, delivery.html and services.html, with public-policies.css and links outside the dynamic root/account/plans containers. The public allowlist includes these files. Public release remains pending review/merge/deployment; no live URL is claimed by a source change. Browser/HTTP verification is recorded in handoff. The review drafts below remain working history, not the exact public release copy; the HTML is the proposed release text.

Owner approved descriptor: **Medretica — Your Medical Learning Operating System**, explained as an integrated medical learning platform. Operator wording: **Medretica is an integrated Medical Learning Operating System for medical education and exam preparation, owned and operated by Md Moazzam as a sole proprietor.** Do not append trading-as wording or imply incorporation. A mobile app is planned, not launched. Owner confirms support email can both receive and reply; no test email sent by this task.

## Implementation and release design
Use the existing static Pages build/public-file allowlist, no new policy backend or dependencies. Render six semantic, accessible static pages under /web/, linking each other and visible footers on root/account/plans. They must render without JavaScript or login, use existing Sage/Lavender tokens, avoid changing navigation/auth/domain configuration, and preserve paid buttons disabled. Do not add a terms-acceptance checkbox without durable versioned consent handling when paid checkout is later built.

Implemented routes (NOT verified live): /web/terms.html, /web/privacy.html, /web/refunds.html, /web/contact.html, /web/delivery.html, /web/services.html. Do not send these proposed URLs for review before deployment verification. Broader brand replacements and the optional retention issue #265 stay separate.

## Publication gate
- Resolve all owner-input markers and review copy for accuracy/actual support capacity.
- Put exact legal operator name on Contact and Terms; clear relationship: Medretica is operated by that entity. Preserve KYC legal identity.
- Approve an effective date and version; retain dated historical versions. Mark whether any prior customer terms existed; do not backdate this draft.
- Audit privacy against actual auth/study/storage/monitoring integrations and current law; these drafts do not certify legal compliance.
- Add allowlisted pages and footer links; verify build, unauthenticated HTTP responses, no redirect-to-login, all links, phone/tablet/desktop layouts, keyboard focus, readable headings and no horizontal overflow. Recheck login/navigation remain working.
- Confirm services/prices in INR match capabilities genuinely available. A paid service still disabled is not an active offer; do not remove truthful warnings to obtain approval.
- Main merge/publication requires the owner's release decision. Feature-branch saving is authorized; no production release performed here.
- Only after live verification submit medretica.com for whitelisting; merchant website registration, display-brand review and Subscriptions activation remain separate account checks.

## Evidence and limits
Source baseline: e46b3cc1cb6d42025e576f7a5a0047e150f39392. Main inspected 18 October UTC / 19 October IST. The main public allowlist has no dedicated public legal pages. web/plans.html labels premium prices proposed and checkout disabled. docs/PRIVACY.md is a technical erasure contract, not a public privacy notice. Source has Supabase authentication/study adapters, browser local session storage, and hostname-gated Sentry bootstrap on onrender.com; do not claim Sentry runs on medretica.com without runtime evidence. Actual hosting/subprocessor logs, retention and account closure were not independently audited. No patient-data collection is authorized.

Sources checked 19 October 2026:
- Owner Cashfree whitelisting screenshot: Contact Us, Terms & Conditions, Refunds & Cancellations, listed services and INR prices.
- https://www.cashfree.com/blog/merchant-onboarding-process/ — website review and complete customer-facing policies (especially website-review/customer-facing sections).
- https://www.cashfree.com/blog/test-cases-for-payment-gateway/ — contact, privacy, refund and terms preflight.
- https://consumeraffairs.gov.in/pages/consumer-protection-acts — official consumer protection legislation index; current applicability requires review before publication. No blanket compliance assertion is made.
