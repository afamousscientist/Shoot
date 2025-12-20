# Shoot

A lightweight web workspace that runs on your home PC and can be reached across your network. It stores projects, remembers recent activity per profile, and provides a simple screenplay-friendly editor.

## Getting started

1. Ensure you have Node.js 18+ installed.
2. Install dependencies (none are required today, but this keeps npm happy):

```bash
npm install
```

3. Start the server from the repository root:

```bash
npm start
```

The server binds to `0.0.0.0:3000` so other devices on your local network can reach it if your firewall/router rules allow. Data is stored locally in `data/profile.json` and `data/projects.json`; these files are created automatically on first run.

## Features

- Lobby screen showing the three most recently accessed projects and quick new/open actions.
- Profile bar that remembers your display name, plugin toggles, and recent projects.
- Simple project table view where each row is a page with inline-editable title, type, and synopsis cells.
- Double-click a page to open it in the sidebar script editor. Start typing to build multiple screenplay blocks (scene headers, action, character, dialogue) with tab-to-character and enter-to-dialogue flows.
- Toggle sidebar orientation (side-by-side or stacked) with a responsive tool shelf that can collapse.
- Ctrl/Cmd + S support and Save button for quick persistence to disk.
- Plugin placeholders per profile that stay enabled/disabled based on user preference.

### Vista look and icon pack

- The UI now uses a glassy Windows Vista-inspired palette (soft blues, gradients, and Segoe UI typography).
- Drop your own Vista-style icons into `public/icons/` to reskin the buttons. Replace the placeholder SVGs (e.g., `new.svg`, `open.svg`, `save.svg`, `settings.svg`, `orientation.svg`, `profile.svg`, `plugins.svg`, `page.svg`, `app.svg`) with your preferred pack; filenames are already wired up in the CSS and markup.
- ICO, PNG, and SVG assets are all supported—drop in `.ico` files with the same names (e.g., `new.ico`) and the UI will pick them up automatically while retaining SVG fallbacks.

## How to test it now

1. Start the app with `npm start` and open [http://localhost:3000](http://localhost:3000) (or replace `localhost` with the LAN IP of your PC on other devices).
2. In the lobby, create a new project and confirm it appears in the "Recent projects" bar. Open it and verify the page list populates.
3. Double-click a page row to edit it in the screenplay sidebar. Adjust the title/type/synopsis directly inside the table cells, and type in the script editor using Tab for character lines and Enter for dialogue lines. Press **Ctrl/Cmd + S** (or click **Save**) to persist, then refresh to confirm your edits remain.
4. Use the orientation toggle to flip between side-by-side and stacked views and check that the toolbar follows the layout.
5. Toggle plugin placeholders in the toolbar and refresh; your choices should stick per profile.

For API spot-checks without the UI:

```bash
curl http://localhost:3000/api/profile
curl -X POST http://localhost:3000/api/projects -H "Content-Type: application/json" -d '{"name":"Test"}'
```

The first call returns profile data; the second creates a project and stores it on disk.
