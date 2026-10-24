# Responsive Master Admin entry

Owner clarified and explicitly selected: show Master Admin in the top master row on tablet/iPad and desktop for server-authorized admins; keep the phone entry in the avatar. This supersedes only the all-device avatar placement from ADR-129.

Above700px use the existing global master row and one Admin destination link. Do not add Admin tool disclosures to learner menus. Admin's own local toolbar, five groups, draft-safe history, denial and legacy pin isolation stay intact. On phone/narrow split widths700px or below, keep one avatar entry and no Admin row in the learner drawer. Avoid duplicate desktop avatar/top-row entries. No learner destination, backend, permission, content or experimental feature change.

The complete Admin feature map and recommendations are documentation based on current code. Suggested broader Admin changes are not authorized implementation in this task.
