# HD — a rich, AI-editable text document format

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0-green.svg)](docs/HD-SPEC.md)

> Markdown is easy to write but plain to read. HTML is rich but messy to edit. **HD is both.**

**HD stands for *HTML Doc*** — a document format *based on* HTML (a safe subset of it) but used like Markdown: one plain-text file, no scripts, no styles, no boilerplate. Source is simple for humans and AI to edit; output renders with real design and rich components — charts, diagrams, tabs, callouts, mindmaps, and anything a plugin adds.

## Live demo

Once GitHub Pages is enabled on this repo (Settings → Pages → deploy from `main`):

**https://willwish.github.io/hd-format/viewer.html?doc=examples/welcome.hd**

## Install

```bash
git clone git@github.com:willwish/hd-format.git
cd hd-format
# open viewer.html in a browser — that's it
```

## Quick start (local)

1. Open `viewer.html` in any browser — no install, no server, no build step.
2. Click **Sample**, or drag `examples/welcome.hd` onto the page.
3. Click **Load plugin** and pick `plugins/mindmap.hd.js` to see the extension system in action.

## What's here

| Path | What |
|------|------|
| `viewer.html` | Single-file viewer (zero dependencies) |
| `docs/HD-SPEC.md` | Format specification v1.0 |
| `docs/AUTHORING-GUIDE.md` | Skill-ready guide that teaches an AI to write `.hd` files |
| `examples/welcome.hd` | Showcase document |
| `plugins/mindmap.hd.js` | Example extension: `<hd-mindmap>` |
| `vscode-extension/` | VS Code extension: rendered preview, source/preview toggle, plugin auto-loading |

## A document looks like this

```html
<!hd 1.0>
<hd-doc title="Q2 Report" author="Will" date="2026-06-12" theme="auto">
  <hd-body>

    <h1>Q2 Report</h1>

    <hd-callout type="tip" title="TL;DR">
      <p>Revenue up 23% — details in the chart.</p>
    </hd-callout>

    <hd-chart type="bar" title="Revenue by quarter">
    { "labels": ["Q1", "Q2"], "series": [ { "name": "2026", "data": [140, 180] } ] }
    </hd-chart>

  </hd-body>
</hd-doc>
```

## Core ideas

- **Documents are data, not code.** A whitelist sanitizer strips everything unsafe; documents can never execute anything.
- **Components are tags.** Built-ins: `<hd-callout>`, `<hd-tabs>`, `<hd-details>`, `<hd-chart>` (JSON → SVG, zero dependencies), `<hd-mermaid>` (CDN, graceful offline fallback).
- **Extensions are plugins.** Any `<hd-yourtag>` works once a plugin calls `HD.register("hd-yourtag", {render})`. Documents declare needs via `<hd-use>`; users approve plugin loading explicitly. Unknown tags degrade to placeholders, never errors.
- **AI-first.** Strict, regular syntax + declarative component data = editable with simple text operations. Install `docs/AUTHORING-GUIDE.md` as an AI skill and any assistant can write `.hd`.

## Contributing

The main contribution path is **writing plugins** — one JS file, no build step. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
