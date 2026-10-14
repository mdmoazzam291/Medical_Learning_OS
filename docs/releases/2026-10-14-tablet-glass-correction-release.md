# Tablet orientation / navigation Glass release

Checked at 2026-10-14T07:01:26.806125+00:00.

PR #235 merged as `0ab1f964a1ccd0245e1d2d5d111e3dbc5394596f` under existing owner release authorization. Verified feature code/test head `25bd210e11985b66ee18ddcf0290835864075827`; docs-only follow-up `7d7a6d33bafcaa6933adcb90599e638acb109e31`. Released tree `a1e5c6ccdc52a009814aab36ed91b7da6478f90a` matches the accepted feature tree.

Tablet portrait and landscape now keep labeled top workspace links/disclosures above 700px. Narrow rows compress decoration while retaining 44px controls. Glass tint is translucent, cluster paint avoids opaque stacking, and header frost is separate from the unfiltered popup container. Standard/default, opaque reading surfaces, phone behavior, all routes, permissions, focus and saved state remain.

## Verification

- Feature Foundation [38523244802](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38523244802): check, composited Chromium and native macOS WebKit flows pass.
- Fresh merged-tree local Node: 1,227/1,227 pass; repository checks and 77-file build pass.
- Main Foundation [38524890281](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38524890281): check, Chromium and native WebKit all pass.
- All eight appearance combinations, portrait/landscape/phone/Split View, width fit, touch/keyboard/rotation, persistence, role/focus/history/drafts, 172 rendered catalog leaves and opaque fallbacks covered.
- Ordinary-main Chromium contrast: tablet .0065698 vs .0976892 clear; desktop .0066060 vs .097519 clear, about 93% suppression. This uses normal main-content paint, not a new fixed backdrop layer.
- Actual fresh initial Sage and final palette/style/light/dark menus inspected; reviewer finds no Critical/Important source issue.

## Production

| Service | Successful build |
| --- | --- |
| Learner web | `460c4cc4-ac39-4506-92d9-45db394f096d` |
| Heartbeat | `c16e6faa-a7e3-45a9-9f56-4915c44e856d` |

Fresh public inspection of [Medical Learning OS](https://medical-learning-os-web.medicalos.workers.dev/) confirmed the new narrow-tablet CSS, header ::before frost layer, 76% menu tint/32px blur assets, visible authorized master links and functioning Library contextual menu. Signed-out Standard default is confirmed; hosted real-account Glass switching is not claimed.

## Limits / remaining scope

Native WebKit's independent plain-pane snapshot control cannot render blur; its touch/rotation/paint/fallback checks pass, but frosting is explicitly unavailable. Physical iPad/OS-setting acceptance remains unverified. Faint sharp margin bleed remains a Minor capture/rendering observation with source cause unproven; it is not a general frosting failure and a fullPage-only cause is not established.

Cloudflare preview Issue #211 remains open/separate. Dashboard sign-in failures remain; production integration succeeded. No backend, content, Auth/security, heartbeat source or unrelated OAuth/PARSE change.
