# PLAYLAB — poster browsing design study

Open `/design/streaming-v1/index.html#home` on the existing development server.

Five sample pages: `#home`, `#prompts`, `#films`, `#games`, `#detail`. Work-specific detail links use `#detail?work=garden`.

This is a standalone HTML/CSS/JavaScript design study, isolated from the production application. Fictional creator names, work descriptions and comments are marked as sample content. It does not call generation providers, databases or ad networks. Video entries are poster concepts, not playable video files. The game modal loads existing local HTML games with `sandbox="allow-scripts"`.

Interactions: navigation, artwork details, category filtering, horizontal rails, title/creator search, local browser collection, prompt copy, detail tabs and game player. Shared production links remain available for Academy and AI Tools.

## Visual assets

- `assets/midnight-station.png` and `assets/glass-garden.png`: generated for this sample using the built-in image generation tool, 2026-10-06. Exact prompts are in `asset-provenance.json`.
- `/uploads/seed/*` and `/games/thumbs/*`: existing project artwork.
- All labels, typography, navigation, buttons and layouts are real HTML/CSS, not a generated screenshot.

## Verification

- `node --check public/design/streaming-v1/app.js`: passed.
- Desktop pages inspected in the in-app browser; no broken images observed.
- All five routes checked at 344 CSS px: no page-level horizontal overflow.
- Space Raider iframe opened, and clicking `게임 시작` removed its start screen and displayed the live HUD.
- Save button changes `aria-pressed` to true; collection is stored under the isolated `playlab-streaming-study-saved` localStorage key.
- Prompt copy displays its success state. Clipboard contents were not independently confirmed by the browser automation clipboard API.
- Final screen captures: `preview/verification/streaming-v1/01-home.jpg` through `05-detail.jpg`; mobile example: `06-mobile-home.jpg`.

This is a reviewable design prototype, not a production integration or deployment.
