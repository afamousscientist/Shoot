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
- Drag-and-drop rows to reorder shots in the table while keeping the Vista glass depth on each row.
- Double-click a page to open it in the sidebar script editor. Start typing to build multiple screenplay blocks (scene headers, action, character, dialogue) with tab-to-character and enter-to-dialogue flows.
- A dedicated director toolkit: build colored instruction cards, drag them into the per-page director box (stored separately from the script), and review them beneath the editor.
- Double-click any toolkit or director note to edit its title, color, or text in the builder, then apply changes back to the saved card.
- Rename the active project from the workspace chrome without leaving the editor.
- Continuous screenplay document feel in the editor (no per-line boxes) while preserving the classic scene/action/character/dialogue alignment.
- Toggle sidebar orientation (side-by-side or stacked) with a responsive tool shelf that can collapse.
- Ctrl/Cmd + S support and Save button for quick persistence to disk.
- Plugin placeholders per profile that stay enabled/disabled based on user preference.

### Vista look and icon pack

- The UI now uses a glassy Windows Vista-inspired palette (soft blues, gradients, and Segoe UI typography), brighter depth on the page table, and larger icon-only controls nested in the top header chrome.
- Icon files are **not** committed to the repo to keep things binary-safe. Add your own Vista-style icons under `public/icons/` (or via data URIs in `public/icons/overrides.css`). Current icon hook names the UI looks for (icons render without button backgrounds, so transparent assets fit best):
  - `app` (brand glyph)
  - `profile`
  - `new`
  - `open`
  - `save`
  - `settings`
  - `orientation` (layout toggle)
  - `rename`
  - `pdf` (draft preview/export)
  - `download` (draft download)
  - `scroll` (draft scroll view)
  - `spread` (draft side-by-side view)
  - `plugins` (toolbar toggle)
  - `page` (page list and script header)
  - `note` (object builder + director notes)
  - `insert` (inline page add next to row numbers)
  - `add` (toolkit save/add)
- If you cannot add binaries, paste data URIs into `public/icons/overrides.css` to point the CSS variables at your icon sources without checking assets in.

Use the PDF drafts button in the top header to preview the assembled script in Courier New (lines containing `CONT.` are removed for cleaner page breaks), switch between continuous scroll and side-by-side page views, add optional title pages/watermarks, and save named versions for later comparison. The preview adds screenplay-friendly margins, page numbers, and your project title in the header/footer, and the **Download PDF** control opens a print-ready view you can save as PDF.

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
