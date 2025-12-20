# Shoot

A lightweight web workspace that runs on your home PC and can be reached across your network. It stores projects, remembers recent activity per profile, and provides a simple screenplay-friendly editor.

## Getting started

1. Ensure you have Node.js 18+ installed.
2. From the repository root, run:

```bash
npm start
```

The server listens on `0.0.0.0:3000` so other devices on your network can reach it if your firewall allows.

Data is stored locally in `data/profile.json` and `data/projects.json`. They are created automatically if missing.

## Features

- Lobby screen showing the three most recently accessed projects and quick new/open actions.
- Profile bar that remembers your display name, plugin toggles, and recent projects.
- Simple project table view where each row is a page with block type, labels, and text content.
- Double-click a page to open it in the sidebar editor with screenplay-friendly block choices (action, character, dialogue, scene header).
- Toggle sidebar orientation (side-by-side or stacked) with a responsive tool shelf that can collapse.
- Ctrl/Cmd + S support and Save button for quick persistence to disk.
- Plugin placeholders per profile that stay enabled/disabled based on user preference.
