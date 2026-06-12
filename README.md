# HD — a rich, AI-editable text document format

HD (`.hd`) sits between Markdown and HTML: plain-text source that's easy for humans and AI to edit, rendered with real design and rich components (charts, diagrams, tabs, callouts, mindmaps, …).

## Quick start

1. Open `viewer.html` in any browser.
2. Click **Sample** — or drag `examples/welcome.hd` onto the page.
3. Click **Load plugin** and pick `plugins/mindmap.hd.js` to see the extension system in action.

## What's here

| Path | What |
|------|------|
| `viewer.html` | Single-file viewer — no install, no server, no build step |
| `docs/HD-SPEC.md` | Format specification v1.0 |
| `docs/AUTHORING-GUIDE.md` | Skill-ready guide that teaches an AI to write `.hd` files |
| `examples/welcome.hd` | Showcase document |
| `plugins/mindmap.hd.js` | Example extension: `<hd-mindmap>` |

## Core ideas

- **Documents are data, not code.** A whitelist sanitizer strips everything unsafe; documents can never execute anything.
- **Components are tags.** Built-ins: `<hd-callout>`, `<hd-tabs>`, `<hd-details>`, `<hd-chart>` (JSON → SVG, zero dependencies), `<hd-mermaid>` (CDN, graceful offline fallback).
- **Extensions are plugins.** Any `<hd-yourtag>` works once a plugin calls `HD.register("hd-yourtag", {render})`. Documents declare needs via `<hd-use>`; users approve plugin loading explicitly.
- **AI-first.** Strict, regular syntax + declarative component data = editable with simple text operations.
