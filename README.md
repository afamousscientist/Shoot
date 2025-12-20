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
- Simple project table view where each row is a page with block type, labels, and text content.
- Double-click a page to open it in the sidebar editor with screenplay-friendly block choices (action, character, dialogue, scene header).
- Toggle sidebar orientation (side-by-side or stacked) with a responsive tool shelf that can collapse.
- Ctrl/Cmd + S support and Save button for quick persistence to disk.
- Plugin placeholders per profile that stay enabled/disabled based on user preference.

## How to test it now

1. Start the app with `npm start` and open [http://localhost:3000](http://localhost:3000) (or replace `localhost` with the LAN IP of your PC on other devices).
2. In the lobby, create a new project and confirm it appears in the "Recent projects" bar. Open it and verify the page list populates.
3. Double-click a page row to edit it in the screenplay sidebar. Change the block type, edit the text, and press **Ctrl/Cmd + S** (or click **Save**) to persist. Refresh the page to confirm your edits remain.
4. Use the orientation toggle to flip between side-by-side and stacked views and check that the toolbar follows the layout.
5. Toggle plugin placeholders in the toolbar and refresh; your choices should stick per profile.

For API spot-checks without the UI:

```bash
curl http://localhost:3000/api/profile
curl -X POST http://localhost:3000/api/projects -H "Content-Type: application/json" -d '{"name":"Test"}'
```

The first call returns profile data; the second creates a project and stores it on disk.
