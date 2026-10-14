# Final tablet and desktop navigation / appearance contract

Accepted owner decision: 2026-10-14, Asia/Kolkata.
Status: PR #233 released; owner-requested portrait/landscape parity and clearer Glass refinement in progress on PR #235.
Owner confirmed implementation, palette-following Glass and opaque reading surfaces on 2026-10-14 (Q1/Q2/Q3). Owner subsequently approved the plan and direct execution.
Reference: owner-selected IMG_5182.png, "Centered glass navigation — Refined", in the Medical Learning OS conversation. The raster is a visual reference, not route/schema authority.

## One layout, two surface styles

Use the selected centered top navigation and single contextual page menu for tablet and desktop. Brand at left; major workspaces centered; search, appearance and avatar at right. Above phone width (700px), portrait and landscape use the same visible master links and contextual disclosures. Narrow top rows may compress decorative icons/brand spacing, but must not hide workspace labels inside a launcher. Phone and very narrow Split View retain the existing phone layout. Do not reserve a permanent left/right navigation rail or sidebar in this selected layout.

Home, Study, Library and Exams retain their real canonical destinations. Master Admin remains visible only after server-confirmed authorization. Account utilities, including Preferences, stay in the avatar menu. Each workspace exposes its existing contextual tools from a separate disclosure affordance anchored under its top button. A main destination link still navigates; the adjacent chevron opens its tools.

The image's five Library rows illustrate grouping only. Preserve ALL registered Library/Study/Exams/Admin routes and nested subject/module/reference groups from src/domain/app-navigation.js, not only the mockup labels. Use scrollable bounded menus, independent nested disclosures and correct current-workspace/current-page markers. Opening a submenu must not close unrelated nested groups.

## Settings > Appearance

Three independent choices:
- Color palette: existing Sage Precision / Lavender Precision, using their canonical existing tokens.
- Surface style: Standard (option 1, default) / Glass (option 2, opt-in).
- Appearance: existing Light / Dark.

Both surface styles use the SAME layout, destinations, ordering and menu behavior. Glass does not become a third color palette or a separate route tree. Lavender + Glass matches the selected glass reference; Sage + Glass derives tint from existing Sage tokens rather than adding a replacement palette. Standard uses existing opaque Sage/Lavender surfaces with no blur, refraction, glossy edge or glass effect. Switching style must not reset palette, light/dark preference, subject selections, pins, expanded groups, private drafts, answers or sessions.

Glass uses tinted translucent top navigation, contextual menus and account/search surfaces; no white navigation-panel backgrounds. Preserve lavender/periwinkle tint for Lavender Glass and readable contrast in both appearances. Note/question/explanation surfaces remain opaque using the existing palette's card/surface tokens; no blur or backdrop effects on reading content. Do not animate gradients behind study text. Use a stable tinted opaque fallback when blur/transparency is unavailable or reduced transparency is requested.

Persist the surface choice through the existing validated device-preference store, default old/missing/invalid values to Standard, and retain its page-memory fallback when storage is blocked. Do not imply cross-device sync; current navigation preferences are device-local.

## Responsive behavior and interaction

Preserve released phone behavior from PR #232; this owner decision targets tablet and desktop only. At narrow tablet/split widths, use available-width adaptation and labeled overflow/current-workspace controls rather than squeezing controls or overflowing horizontally. Keep current page and all destinations reachable. Center major navigation when width permits; fit and touch usability take precedence over mathematical centering.

Menus open on tap/click and keyboard, not hover alone. One outer menu open at a time; nested disclosures open independently. Support Escape/outside dismissal, focus return, sensible keyboard traversal and scroll within the viewport. Controls aim for at least 44 CSS px touch targets. Resolve menu positioning from the actual trigger and viewport; do not obscure content when closed. Preserve Back/Forward, library filter semantics, admin draft DOM and existing access gates.

## Implementation acceptance

- Verify all canonical contextual leaves and admin role/error states.
- Standard/Glass x Sage/Lavender x Light/Dark with Settings persistence and reload.
- Missing/invalid preference migration and blocked-storage fallback.
- Tablet portrait/landscape/split widths, desktop, narrow authorized-admin headers; no horizontal overflow.
- Centered header optical alignment, touch/keyboard/dismissal, long labels, nested index scrolling.
- Phone navigation unchanged.
- Existing Study, exam locks, Notes/Graph, private notes, admin workspaces and logout unaffected.
- Run repository checks, appropriate Node tests, build and Chromium/iPad WebKit flows against the actual code commit.

## Boundary / next action

PR #233 is released. The owner-requested portrait/landscape parity and visible Glass correction are implemented in PR #235. Runtime checkpoint a66f43ed69c66dcfa534878fcc25876fda6af4db passed Foundation run 38518676290 (check, Chromium and iPad WebKit), including 1,227 Node tests, all eight appearance combinations, tablet rotation, touch fit and fallback checks. Screenshot review identified sharp underlying text despite declared blur; a rendered-pixel frosting regression is being added before release. Final exact-head browser acceptance remains required. Physical-device/OS-setting acceptance is not claimed. Use the owner's existing GitHub -> Cloudflare release authorization; preserve unrelated OAuth/PARSE drafts and content intake/reset boundaries.
