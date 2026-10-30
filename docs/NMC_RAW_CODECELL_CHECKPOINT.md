# Raw code-cell extraction checkpoint
Date2026-10-30. docs/evidence/nmc-codecell-page-receipts.json records263source-page receipts.

## Actual extraction
Ran a second geometry-based method over all263defining pages. Used page rotation matrix to transform word/vector coordinates; inferred code column borders and split candidate regions at horizontal rules. Preserved wrapped/malformed raw tokens before classification rather than rewriting them to satisfy a code regex.
Result:2627standard-form identifier cells,7nonstandard identifier cells =2634identifier candidates. Additional253empty and492header/unclassified regions remain. These745regions are not745missing competencies; headers,continuations and geometry artifacts require classification.
Seven known-token assertions passed atPDF169/172/200/212/217/445/454,including prefixless14.1,wrappedBC14.24,PA.29.1,MI8.,FM2:12,OR2.2.9 malformed cell andASS.4. Actual raw whitespace preserved locally. Also recovered PS2.1* onPDF352 with printed footnote marker; no stripping/normalization automatically applied.
Duplicates count as source appearances.2634 is not a unique/effective competency denominator and does not resolve published2781orother count conflicts.

## Persisted versus transient evidence
Persisted metadata contains per-page category counts,column bounds and digest of detailed cell receipts,bound to exact official source bytes. Detailed local raw-cell extraction includes column text and remains transient; no full code corpus,header snippets,protected descriptions or source tables exported. This is not a durably exported full raw-row inventory.
The saved digest alone cannot reconstruct the raw extraction; a future rerun must use the documented method/exact source and compare receipts. No script/API or automated runtime gate was added by this checkpoint.

## Limits and verification
All263pages produced geometry candidates; none was treated as completed independent review. Known-token assertions establish recovery of those cases only,not accuracy of every first-column region. Need resolve745empty/header regions and compare every source row visually before a no-omission claim.
Validated263unique pages,count sums,per-page receipt hashes and disabled eligibility. No runtime tests rerun/documentation-only; fresh CI unverified.
Next concrete work: inspect/code-classify ambiguous candidate regions and compare geometry identifiers with strict extraction per page,starting with highest disagreement. Preserve PS2.1footnote and source-only row identities; do not infer clinical identity from coordinates alone.
No approvals,ingestion,merge/deploy or learner activation.
