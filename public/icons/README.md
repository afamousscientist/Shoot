# Vista icon placeholders

This folder holds the image files used by the UI buttons. Each file currently ships as a simple placeholder SVG so the layout has something to render. Drop your own Vista-style icons here and keep the filenames the same to immediately reskin the app:

- `app.svg`
- `profile.svg`
- `new.svg`
- `open.svg`
- `save.svg`
- `settings.svg`
- `orientation.svg`
- `plugins.svg`
- `page.svg`

Recommended format: 64×64 (or higher) PNG, ICO, or SVG with transparent background. `.ico` files with the same names work as direct drop-ins; the CSS now looks for `.ico` first and falls back to the bundled SVGs. If you prefer a different pack, update the `data-icon` mappings in `public/styles.css` or swap the sources in `public/index.html`.
