# Installation guide usability

Owner: root. PR380 base1d5f9a3; userrequests nextnecessarytask. Goal: make script-free installation instructions easy to navigate on phones/tablets without browsercontrols.
Files: web/install.html; web/install-guide.css; scripts/public-install-guide.js; scripts/public-install-preview.js; scripts/public-surface.js; tests/pwa-install-help.test.js; existing both-engine guide browser checks.
- [x] RED: both guide profiles provide section navigation with matching targets and shared allowlisted stylesheet; no scripts/forms or account capability in preview.
- [x] GREEN: scoped guide layout with16px top padding, readable list spacing,44px minimum link targets and five section links. Preserve identity/icons/auth/palette/rootHome/privacy. No new JS/storage/provider/prompt.
- [x] Browser: normal and preview guide section navigation/anchor landing, no overflow,44px link heights and compact normal top offset; include820x390 landscape geometry.
- [x] Full tests/check/builds; independent review; save exact source and inspectCI; final receipts/readback.
Review focus: links must land on real section headings without sticky overlays; large touch targets must wrap at narrow width; ordinary auth/frozen content remains unchanged; guide Home must work without Back; physical rotation/reopen/auth remain separate from browser geometry.

Local19focused/full1559tests,check13services250couplings,normal129/public38buildsPASS. Freshreview nofindings;7testsPASS. ExactCI/publishedguide pending; browser assertions authored, no localbrowserclaim.

Verified source8d7100f/Foundation41488981446 all3SUCCESS; normalguide/rendered44pxtargets/anchor/Home/landscape andpreview4viewportchecksPASS. Livepreview66692718 build/deploySUCCESS;5links/min44px/noJS/forms/overflow andAndroidlanding/Homeobserved. No unresolvedfindings; final evidence-onlycheckpointCI separate.
