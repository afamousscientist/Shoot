# Vista icon pack (bring your own)

This folder is intentionally empty so no binary assets are committed. Add your own transparent/edge-softened icons using these filenames so the UI picks them up automatically (buttons no longer paint their own backgrounds):

- `app` (brand glyph)
- `profile`
- `new`
- `open`
- `save`
- `settings`
- `orientation` (layout toggle)
- `rename`
- `pdf` (draft preview/export)
- `download` (PDF download)
- `scroll` (preview scroll view)
- `spread` (preview side-by-side)
- `director` (director view toggle)
- `plugins` (toolbar toggle)
- `page` (page list + headers)
- `note` (builder + director notes)
- `insert` (inline page add)
- `add` (toolkit save/add)

Formats supported by the CSS include `.ico`, `.svg`, and `.png`; pick the one your pack provides (for example, `new.ico`). If your workflow blocks binaries, paste data URIs into `public/icons/overrides.css` to set the icon variables without adding files.
