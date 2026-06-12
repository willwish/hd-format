# HD Authoring Guide (skill-ready)

> This guide is written so it can be installed as an AI skill ("write-hd"). Give it to any AI assistant and it can author or edit `.hd` documents correctly. Full reference: `docs/HD-SPEC.md`.

## When to use

Use the HD format when the user wants a document that is readable as plain text AND renders with design: reports, guides, dashboards-as-docs, anything needing charts, diagrams, tabs, callouts or mindmaps. Output file extension: `.hd`. View with `viewer.html`.

## Document skeleton — always start from this

```html
<!hd 1.0>
<hd-doc title="TITLE" author="AUTHOR" date="YYYY-MM-DD" theme="auto">

  <hd-body>

    <h1>TITLE</h1>

    <p>...</p>

  </hd-body>
</hd-doc>
```

## Hard rules

1. First line is always `<!hd 1.0>`.
2. **Close every tag explicitly**, including all `hd-*` tags. Never self-close (`<hd-use/>` is wrong; `<hd-use ...></hd-use>` is right).
3. Allowed HTML tags only: `h1–h6 p blockquote pre hr section div figure figcaption ul ol li dl dt dd table thead tbody tfoot tr th td caption a strong em b i u s mark code kbd sup sub span br img`. No `script`, `style`, `iframe`, forms, or `on*`/`style` attributes — the viewer strips them.
4. There is no inline styling. Structure is the design: use headings, callouts, tabs and tables instead of styled divs.
5. One `h1`, at the top. Then `h2`/`h3` in order (`h2` builds the table of contents).
6. Blank line between block elements; 2-space indent inside components.
7. In component data bodies, escape `<` as `&lt;` and `&` as `&amp;`.
8. Validate JSON before emitting a chart.

## Components cheat sheet

Callout (`type`: note | info | tip | warning | danger):

```html
<hd-callout type="warning" title="Heads up">
  <p>Body takes the normal HTML subset.</p>
</hd-callout>
```

Tabs:

```html
<hd-tabs>
  <hd-tab title="A"><p>...</p></hd-tab>
  <hd-tab title="B"><p>...</p></hd-tab>
</hd-tabs>
```

Collapsible:

```html
<hd-details title="More" open>
  <p>...</p>
</hd-details>
```

Chart (`type`: bar | line | pie; body = one JSON object):

```html
<hd-chart type="bar" title="Title" height="300">
{
  "labels": ["A", "B", "C"],
  "series": [ { "name": "2026", "data": [10, 20, 30] } ]
}
</hd-chart>
```

Pie uses only the first series. Optional per-series `"color": "#hex"`.

Mermaid diagram (body = Mermaid syntax):

```html
<hd-mermaid>
flowchart TD
  A --> B
</hd-mermaid>
```

Mindmap (extension — requires plugin declaration; body = `-` list, 2-space indent):

```html
<hd-use name="mindmap" src="plugins/mindmap.hd.js"></hd-use>
...
<hd-mindmap title="Topic">
- Root
  - Branch
    - Leaf
</hd-mindmap>
```

`<hd-use>` goes inside `<hd-doc>`, before `<hd-body>`, one per extension.

## Editing existing documents

- Edit with plain text operations; the format is designed for exact-string find/replace.
- Preserve the existing indentation and blank-line rhythm.
- When adding a component the document doesn't use yet, no declaration is needed for built-ins (`hd-callout`, `hd-tabs`, `hd-details`, `hd-chart`, `hd-mermaid`); add `<hd-use>` only for extensions.
- Never convert content to raw styled HTML; use components.
- An unknown `hd-*` tag is not an error — it renders as a "plugin required" placeholder — but only emit tags the document's declared plugins or built-ins cover.

## Quality checklist before delivering

- [ ] `<!hd 1.0>` header present
- [ ] All tags closed, including `hd-*`
- [ ] Only whitelisted HTML tags used
- [ ] Chart JSON parses; `labels` length matches each `data` length
- [ ] `<hd-use>` present for every non-built-in component
- [ ] Headings hierarchical (one `h1`, `h2` sections)
