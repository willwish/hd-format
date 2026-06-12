# HD Document Format — Specification v1.0

**HD** stands for **HTML Doc**: a document format built on a safe subset of HTML, used like Markdown. It is a plain-text document format that sits between Markdown and full HTML. It keeps the readability and AI-editability of Markdown source, while adding real layout, design, and rich interactive components (charts, diagrams, tabs, mindmaps, …) that Markdown cannot express.

File extension: **`.hd`** · Encoding: **UTF-8** · MIME (unofficial): `text/vnd.hd+html`

---

## 1. Design goals

1. **Readable rendered output** — proper typography, callouts, tabs, charts; not a wall of text.
2. **Readable source** — plain text, tag-based, diff-friendly, version-controllable.
3. **AI-first editing** — strict, regular syntax with a small vocabulary. An AI (or human) can edit any part of the document with simple text operations. Component data is declarative (JSON / indented text), never code.
4. **Extensible** — new components are just new tags (`<hd-anything>`). A plugin registers a renderer for a tag; documents declare which plugins they need.
5. **Safe** — no scripts, no event handlers, no styles in documents. Documents are *data*. Only installed/approved plugins contain code.
6. **Zero infrastructure** — a single-file viewer (`viewer.html`) renders any `.hd` file locally; no server or build step.

## 2. File structure

```html
<!hd 1.0>
<hd-doc title="Document title" author="Name" date="2026-06-12" theme="auto">

  <hd-use name="mindmap" src="plugins/mindmap.hd.js"></hd-use>

  <hd-body>
    ... content: HTML subset + components ...
  </hd-body>

</hd-doc>
```

### 2.1 Header line

The first non-blank line MUST be the HD declaration:

```
<!hd 1.0>
```

`1.0` is the spec version. Viewers MUST accept any `1.x` document.

### 2.2 `<hd-doc>` — root element

| Attribute | Required | Description |
|-----------|----------|-------------|
| `title`   | yes      | Document title (shown in viewer header / browser tab) |
| `author`  | no       | Author name |
| `date`    | no       | ISO date `YYYY-MM-DD` |
| `theme`   | no       | `light` \| `dark` \| `auto` (default `auto`) |
| `lang`    | no       | BCP-47 language code, e.g. `en`, `zh-HK` |

### 2.3 `<hd-use>` — extension declaration

Declares that the document uses a non-built-in component. One per plugin, placed before `<hd-body>`.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `name`    | yes      | Plugin name; by convention the tag it provides minus the `hd-` prefix (plugin `mindmap` → tag `<hd-mindmap>`) |
| `src`     | no       | Path/URL to the plugin `.js`, relative to the document |
| `version` | no       | Minimum plugin version, e.g. `1.2` |

Viewers never auto-execute plugin code from a document without user consent (see §7).

### 2.4 `<hd-body>` — content

Contains the document content: the allowed HTML subset (§3) plus components (§4–§5).

## 3. Allowed HTML subset

Only these tags are allowed inside `<hd-body>`. Viewers MUST strip everything else.

| Category | Tags |
|----------|------|
| Headings | `h1` `h2` `h3` `h4` `h5` `h6` |
| Blocks | `p` `blockquote` `pre` `hr` `section` `div` `figure` `figcaption` |
| Lists | `ul` `ol` `li` `dl` `dt` `dd` |
| Tables | `table` `thead` `tbody` `tfoot` `tr` `th` `td` `caption` |
| Inline | `a` `strong` `em` `b` `i` `u` `s` `mark` `code` `kbd` `sup` `sub` `span` `br` |
| Media | `img` |

**Allowed attributes**

- All elements: `id`, `class`, `title`
- `a`: `href` — only `https:`, `http:`, `mailto:`, and `#anchor` URLs
- `img`: `src` (`https:`, `http:`, `data:image/*`), `alt`, `width`, `height`
- `th`/`td`: `colspan`, `rowspan`, `align`
- `ol`: `start`

**Forbidden — always stripped:** `script`, `style`, `iframe`, `object`, `embed`, `form`, inputs, `link`, `meta`, all `on*` event attributes, `style` attributes, `javascript:` URLs.

## 4. Components — general rules

A component is any tag starting with `hd-`. Rules:

1. **Every `hd-*` tag MUST have an explicit closing tag** (`<hd-use ...></hd-use>`, never self-closing). The HTML parser does not treat unknown tags as void; omitting the close tag swallows the following content.
2. Configuration goes in **attributes**; data goes in the **body** (JSON or indented plain text, by component).
3. Inside component data bodies, escape `<` as `&lt;` and `&` as `&amp;` if they appear in the data.
4. An unrecognized `hd-*` tag renders as a visible placeholder ("Unknown component — plugin required"), never as broken output, and never executes anything.

## 5. Built-in components

### 5.1 `<hd-callout>` — highlighted box

```html
<hd-callout type="warning" title="Heads up">
  <p>Body supports the full HTML subset.</p>
</hd-callout>
```

`type`: `note` (default) | `info` | `tip` | `warning` | `danger`. `title` optional.

### 5.2 `<hd-tabs>` / `<hd-tab>` — tabbed sections

```html
<hd-tabs>
  <hd-tab title="Overview"><p>...</p></hd-tab>
  <hd-tab title="Details"><p>...</p></hd-tab>
</hd-tabs>
```

First tab is active by default; add `active` attribute to a tab to override.

### 5.3 `<hd-details>` — collapsible block

```html
<hd-details title="Click to expand" open>
  <p>...</p>
</hd-details>
```

`open` attribute = expanded initially.

### 5.4 `<hd-chart>` — declarative chart (no dependencies, rendered as SVG)

```html
<hd-chart type="bar" title="Revenue by quarter" height="320">
{
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "series": [
    { "name": "2025", "data": [120, 150, 170, 210] },
    { "name": "2026", "data": [140, 180, 205, 240] }
  ]
}
</hd-chart>
```

| Attribute | Values |
|-----------|--------|
| `type` | `bar` \| `line` \| `pie` (default `bar`) |
| `title` | optional chart title |
| `height` | pixels, default `300` |

Body is a single JSON object: `labels` (array of strings) and `series` (array of `{name, data[, color]}`). `pie` uses only the first series. `color` is any CSS color; omitted = palette. Invalid JSON renders an error box showing the message and source — the document never breaks.

### 5.5 `<hd-mermaid>` — diagrams (Mermaid syntax)

```html
<hd-mermaid>
flowchart TD
  A[Write .hd] --> B{Valid?}
  B -->|yes| C[Render]
  B -->|no| D[Error box]
</hd-mermaid>
```

Rendered via the Mermaid library (loaded from CDN on demand). Offline fallback: the source is shown as a code block with a notice.

## 6. Extension API (plugins)

A plugin is a single `.js` file that registers renderers for one or more `hd-*` tags:

```js
/* myplugin.hd.js */
(function () {
  "use strict";
  window.HD.register("hd-mindmap", {
    version: "1.0",
    render(el, ctx) {
      // el  = the source element from the parsed document (read-only)
      // ctx = helper API, see below
      const node = document.createElement("div");
      // ... build DOM/SVG from el's attributes and textContent ...
      return node; // return a DOM node (or null to render nothing)
    }
  });
})();
```

### 6.1 `ctx` helper API

| Member | Description |
|--------|-------------|
| `ctx.sanitize(el)` | Sanitizes an element's children through the §3 whitelist and returns a `DocumentFragment` — use when your component contains rich content |
| `ctx.h(tag, attrs, ...children)` | DOM-builder helper (`children`: nodes or strings) |
| `ctx.svg(tag, attrs)` | Creates an SVG-namespaced element |
| `ctx.error(message, source?)` | Returns a standard error box node |
| `ctx.theme` | `"light"` or `"dark"` at render time |

### 6.2 Rules for plugin authors

- Never use `innerHTML` with document-derived strings; build DOM nodes or use `ctx.sanitize`.
- Component **data must stay declarative** so AI tools can edit documents without understanding your code. Prefer JSON or simple indented text.
- Renderers must not throw: catch and return `ctx.error(...)`.
- File naming convention: `<name>.hd.js`.

### 6.3 Loading

The viewer loads plugins only by explicit user action (file picker / approval prompt), or auto-resolves relative `src` URLs when the document itself was loaded over HTTP(S) — after a per-document confirmation. Unknown components render placeholders until the plugin loads, then the document re-renders.

## 7. Security model

- Documents are inert data: sanitized through a whitelist; no scripts, styles, or event handlers survive parsing.
- All code lives in plugins, which the user installs/approves explicitly — analogous to installing an editor extension.
- `hd-use` is a *declaration*, not an import: it tells the viewer what's needed; it grants nothing.

## 8. Authoring rules for AI tools

1. Always emit the header line and full skeleton (§2).
2. Close every tag explicitly, including all `hd-*` tags.
3. One blank line between block elements — keeps diffs clean.
4. 2-space indentation inside components.
5. Use semantic headings in order (`h1` once, then `h2`/`h3`).
6. Prefer built-ins over raw `div`/`span` styling — there is no styling; structure *is* the design.
7. Validate JSON bodies before emitting.
8. See `docs/AUTHORING-GUIDE.md` for the full authoring skill.

## 9. Versioning

- Spec uses semver-lite `major.minor`. Minor versions only add components/attributes.
- A viewer encountering an unknown *attribute* ignores it; an unknown *tag* renders a placeholder. Documents therefore degrade gracefully, never break.

## 10. Roadmap (non-normative)

Editing mode in the viewer, search, export to PDF/HTML, a `<hd-data>` shared-dataset element, table-from-CSV component, footnotes, cross-references.
