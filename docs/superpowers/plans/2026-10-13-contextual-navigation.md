# Approved navigation mockup implementation

Owner approved the in-chat design and attached mockup on 2026-10-13. Implement inline on feat/contextual-navigation-20261013 from main d80fd99. Preserve both saved themes, existing destination IDs, all tools and server authorization. No branding merge or clinical writes.

1. Account: remove Account from primary header rendering, retain its route model and sidebar. Native accessible avatar disclosure links Profile and Account & Security to the real account page, Preferences to its existing workspace. Signed-in Sign out uses the existing auth adapter; signed-out visitors receive Sign in. Dismiss outside/Escape and restore focus.
2. Study: prioritize Study Now, Subjects & Topics (19 canonical subjects), Questions and Mistake Review. Keep remaining tools in an independent disclosure; retain existing IDs/pins. Subject URLs keep Study context without copying content.
3. Layout: 72px header, 64px rail, 256px expanded desktop sidebar. At <=1050px expansion overlays unchanged content width, with scrim, scroll lock, focus management and outside/Escape dismissal. Default new desktop preferences to expanded; preserve existing explicit preferences. Portrait drawer state is transient and never rewrites desktop preference. Rotation restores desktop state.
4. Verify: regressions RED→GREEN; full npm test, npm run check, npm run build:pages; update existing Chromium/iPad WebKit CI for avatar destinations, touch dismissal, layout width, rotation, palettes, auth and admin denial. Push feature checkpoint/handoff; create reviewable PR and inspect CI. Local browser capability must be checked, with limitations accurately recorded.

Review focus: role revocation while menus open; stored collapsed preference across rotation; no duplicated same-workspace pins; subject links preserve context; failed signout clears local access and returns to Account.
