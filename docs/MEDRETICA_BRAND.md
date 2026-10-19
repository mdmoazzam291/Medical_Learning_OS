# Medretica brand contract

Current owner direction: 19 October 2026. Replaces provisional PARSE as the public brand; old PARSE branches/PRs are not release sources.

- Name: **Medretica**. Preserve this capitalization.
- Tagline: **Your Medical Learning Operating System**.
- Explanatory descriptor: **integrated medical learning platform**.
- Public site: https://medretica.com . Evrani remains a backup name only.
- Repository, deployment resources, learner IDs, storage keys, permissions and API names retain their existing technical identifiers.

## Logo version 2 — Open Knowledge

Owner selected concept 26 on 20 October 2026 and requested automatic compatibility with existing and future palettes. This supersedes the three-leaf mark in ADR-117. The canonical 64 × 64 vector is `web/medretica-mark.svg`: two opening page forms suggest an M. Geometry is a carefully redrawn interpretation of the selected concept, not a pixel-exact tracing of the raster preview. `web/medretica-fold.svg` overlays only the right-page fold; it shares the same coordinate space.

All learner/admin shared headers, public brand links and account previews use `.mlos-brand-mark`. Two aligned CSS masks keep geometry independent of colour. Primary follows semantic `--accent`; the fold mixes 85% of that colour with 15% `--surface`. Browsers without colour-mix use the same single-colour silhouette. Forced-colours mode uses LinkText and hides the overlay. Decorative marks remain hidden from screen readers, with Medretica named on the home link.

### Future palettes and surfaces

- Define contrast-safe `--accent`, `--surface` and `--bg` for each light/dark appearance as required by the UI. No palette-name switch or alternate SVG is needed for the logo.
- Verify both logo tones at least 3:1 against the actual adjacent surface; theme inheritance cannot guarantee contrast for arbitrary future colours. Keep image/hero backgrounds suitably quiet.
- A special surface may override `--logo-primary` and `--logo-secondary` locally. Otherwise leave them unset so theme changes propagate immediately. Keep the wordmark in the theme's normal text colour.
- Never bake violet, green or preview-image colours into the SVG paths. Preserve generous central space and test at 26–36 px.

Browser tab icons cannot inherit a webpage's CSS variables. `web/favicon.svg` uses the same silhouette with browser/OS light-dark contrast and a default sage tile. `web/apple-touch-icon.png` is its static 180 × 180 light export. Installed/bookmarked icons and third-party Google branding are separate assets; they cannot change with in-app palette switches. Version-2 icon links request refreshed artwork, while device cache refresh remains browser-controlled. No web-app manifest or native app is introduced.

Titles, descriptions, application names and primary Open Graph text use Medretica. Public policies retain their approved operator and service copy; paid plans remain unavailable. Payment-provider display-name approval and provider-hosted logos are separate account state and are not changed by this website update.
