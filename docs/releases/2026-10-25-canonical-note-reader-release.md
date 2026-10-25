# Canonical note reading and section navigation — release receipt (25 October 2026)

## Authority / scope
Owner selected Build now for properly formatted canonical notes, navigable sections and clean reading layout after examining an iPad NeuralVault screenshot. The screenshot's apparent narrow size was intentional browser zoom-out, **not** a reason to alter viewport geometry.

## Source / release
- Feature [PR #328](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/328) merged as `345ac4e112c1b30ed7bbdc17e1f766998e2c8866`.
- Final feature [Foundation checks run 40145021645](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/40145021645) completed **success** in all three jobs: Node/check/build, full Chromium learner suite including Vault and Library and native WebKit with iPad portrait/landscape/split-screen navigation. Earlier red test runs identified and fixed a Library route-handler interaction and test-harness compatibility; there was no bypass or test removal.
- Cloudflare production build checks on the merge SHA succeeded: `medical-learning-os` build `2c4d257b-1b2b-4d11-831b-3632b796f3ce` and `medical-learning-os-web` build `63a4e332-4728-404b-9868-b88b30749b93`. These checks verify provider build/deploy status; genuine signed-in live browser acceptance and byte-exact served-asset comparison were **not** performed here.

## Changed behavior
- Shared `web/canonical-note-reader.js` converts Markdown source into inert, escaped HTML: headings, paragraphs, emphasis, lists, block quotations, code and HTTPS-only reference links; raw source HTML cannot execute.
- Each exact note version gets stable, unique heading links under **On this page**. Vault and Library scroll and focus the precise heading without reloading or changing filters, including Back/Forward compatibility.
- Opaque palette-aware CSS in `web/canonical-note-reader.css` provides a readable text measure, section rhythm, responsive outline and meaningful keyboard focus. No new framework, third-party asset or provider dependency.
- Actual six published note texts were checked read-only: each yields six headings; all persisted draft/provenance disclaimers remain visible for issue [#326](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/326). No source or clinical claims were fabricated and no content, approval, revision history, note hash, authentication or payment changes were made.

## Remaining acceptance and next priority
- Test the actual production NeuralVault and Library routes using a genuine authenticated learner account on iPad/iPhone. The automated browser evidence uses synthetic authenticated fixtures, not a private live account.
- Continue issue #326 independent source-rights and human clinical review. **Do not** remove warning text or recast an unverified source as public domain through UI presentation.
- Improvements to structured medical media and question/graph integration are separate, optional work; the current release changes note presentation only.
