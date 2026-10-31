# Medicine and OBGYN count reconciliation
Checked 2026-10-30T11:17:58Z. Metadata investigation only; PR346 remains draft.

## Source/method
Official https://nmc.org.in/rules-regulation-nmc/33/file downloaded in preceding checkpoint; SHA256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c.
Used pdftotext -layout; whitespace-tolerant code regex, independently constrained to line-start code cells and subject defining ranges. All529 GM and142 OG distinct candidates occur as line-start defining-table tokens; none is eliminated as an outside-section cross-reference by this method.
Visually inspected official PDF295,297,304,321,322,323,439 at full-page rendering. This is targeted AI-assisted source inspection, not complete human-reviewed code enumeration.

## General Medicine
Official PDF281-327 (printed40-86),29 topics. Subject heading525; sum of29 topic-header counts531;529 unique GM codes /532 code occurrences.
Confirmed actual printed duplicate rows:
- GM9.8 occurs twice on PDF297, printed56.
- GM14.1 and GM14.2 each occur twice on PDF304, printed63.
These repeats do not account for529 versus525: unique count is already deduplicated.
Topic differences:
- Topic8 header19, observed18 unique codes. PDF295,printed54 visibly jumps GM8.8 to GM8.10. GM8.9 was not located by extraction anywhere in this source. Do not synthesize its definition or assert intended deletion.
- Topic9 header21, observed17 unique codes (18 row occurrences because GM9.8 repeats). PDF296-297,printed55-56.
- Topic27 header15, observed18 unique codes GM27.1-GM27.18. PDF321-323,printed80-82; visually confirmed endpoint and heading.
Other topic unique counts agree with their declared counts by extraction. Arithmetic:531-1-4+3=529. Thus subject headline, topic totals, unique codes and physical row occurrences are four distinct quantities. No verified official correction established.

## Obstetrics and Gynaecology
Official PDF427-442 (printed57-72),38 topics. Subject headline141;142 unique defining-table codes;142 row occurrences; no duplicate IDs found.
Topic headers sum142 when the wrapped Topic33 count05 is included (official PDF439,printed69); a same-line-only header parser omits that wrapped count and returns137.
All38 observed topic code counts agree with their topic-header counts. The one-code discrepancy is therefore between the subject headline and internally consistent topic/row totals, not an identified spurious extra code. No basis to delete one arbitrary record to reach141.

## Consequences/next action
Published expected525/141 remain unchanged audit targets; extracted529/142 are separately recorded observations. Do not silently certify revised totals or discard source rows. No source descriptions, complete code list, PDF bytes or protected tables committed.
No runtime code, DB records, competency approvals, concept mappings or learner recommendations changed. No runtime tests rerun for this documentation-only checkpoint; fresh CI not verified.
Next: inspect remaining subject defining ranges, DR/DE and RD/RT aliases, then assemble an edition-qualified metadata discrepancy ledger that applies PS9.2 deletion and PY9.1/PE6.4 amendment status. Supplements/later-amendment and independent review gates remain open.
