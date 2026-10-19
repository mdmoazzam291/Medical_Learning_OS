# Medretica public service and policy pages

Prepared 19 October 2026, Asia/Kolkata. Release copy implemented on the policy task branch; **not merged, published or merchant-approved** by this record.

## Owner decisions used
- Medretica — Your Medical Learning Operating System; explanation: integrated medical learning platform connecting study, practice, personal notes, revision and progress. Do not present developing AI/personalisation as already available.
- Operator wording: Medretica is an integrated Medical Learning Operating System for medical education and exam preparation, owned and operated by Md Moazzam as a sole proprietor.
- Legal name/type/Cashfree match and address owner-confirmed: Md Moazzam; sole proprietorship; Bhogari, Bettiah, Bihar, Bharat (India)845454.
- support@medretica.com customer support/privacy; admin@medretica.com administration/escalation. Owner confirms receiving and replying through support email. No email sent to test it.
- No public phone currently: state email-only honestly. No number invented or copied from personal screenshots. This does not establish Cashfree acceptance of email-only support.
- Paid plans remain unavailable; current free access INR0; no mandate/checkout/payment collection. Current refunds/cancellation notice says not applicable to unpaid service, with unexpected-charge investigation. No seven-day/processing promises are published. Future proposals remain excluded in docs/merchant-policy-drafts/future-refund-proposal.md.
- Future terms changes must be possible, with revision/effective dating, notice of material changes, prospective effect, existing-purchase rights protection and separate required payment/mandate consent.
- Mobile app planned, no store listing or delivery date promised. Public availability currently website.

## Implemented routes (verify after deployment before sharing with Cashfree)
- /web/services.html — platform description, actual availability boundaries, INR0/unavailable paid offers.
- /web/contact.html — operator, approved public address, email-only support/escalation and safe request information.
- /web/terms.html — educational terms and future updates; no compulsory exclusive forum or blanket consumer-rights waiver.
- /web/privacy.html — plain-language source-grounded account/learning/browser-storage/provider processing and support-assisted requests; no invented instant self-service erasure or blanket security/never-sharing promise.
- /web/refunds.html — current unpaid status, unexpected-charge route and future-policy publication.
- /web/delivery.html — digital-only current access, inventory boundaries, future paid-fulfilment disclosures.

All are semantic static HTML without script, form or auth dependency. Existing styles/navigation CSS supply approved colour tokens. A scoped public-policies.css adds responsive document layout and footer links. Theme-control functionality is not added; these pages render without JS. Static footer links persist outside dynamic app/account containers; CSS explicitly keeps policy footer visible when account landing hides its legacy footer. Root/account/plans metadata updated; broader visual rebranding remains #266 work. Technical IDs, origins, DNS/auth, paid controls, future policy draft and cancelled/erased material unchanged.

## Review before publication
The owner must review the actual HTML customer copy, especially privacy retention criteria, provider disclosures, account eligibility wording and complaints handling; no legal-compliance certification or Cashfree approval is claimed. The preparation date is not a backdated acceptance event; terms apply from first publication. Record the deployment/effective date and retain the versioned text before later revisions. No consumer agreement acceptance or durable paid consent is implemented by static pages.

Cashfree's official website review guidance requires accurate services/prices, delivery, refunds, privacy/terms and reachable support: https://www.cashfree.com/blog/merchant-onboarding-process/ (checked19 October2026). Whitelisting, registered merchant website update, display-name verification and recurring-product activation remain separate checks. Do not replace a real app-store listing with the website.

## Verification and release sequence
Use npm test, npm run check, npm run build:pages; regression tests cover bundle allowlist/private-draft exclusion and persistent entry-page links. scripts/public-policies-browser-check.js exercises all six pages without JS/login at390/820/1180/1440widths, link responses/overflow and rendered root/account/plans footer clicks, with external service calls blocked. Existing auth/navigation tests remain relevant.

Merge only after owner review/release decision and hosted checks. Then independently confirm all live medretica.com routes return200 without login, correctly show operator/current unpaid terms, links/keyboard/phone/tablet layouts, and working sign-in before submitting whitelisting or replying to merchant review. Source/CI success alone does not prove live publication. No production charge or merchant submission is authorised by this implementation.
