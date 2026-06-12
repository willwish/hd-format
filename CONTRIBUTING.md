# Contributing to HD

Thanks for your interest! There are three ways to contribute, in order of impact:

## 1. Write a plugin (the main contribution path)

New components are the heart of HD. A plugin is a single JS file — no build step:

```js
/* myplugin.hd.js */
(function () {
  "use strict";
  window.HD.register("hd-mytag", {
    version: "1.0",
    render(el, ctx) {
      // el: the source element (read attributes + textContent)
      // ctx: helpers — ctx.h(), ctx.svg(), ctx.sanitize(el), ctx.error(), ctx.theme
      return ctx.h("div", {}, "Hello from <hd-mytag>");
    }
  });
})();
```

Rules (see `docs/HD-SPEC.md` §6):

- Component **data must be declarative** (JSON or simple indented text in the tag body) so AI tools can edit documents without understanding your code.
- Never `innerHTML` document-derived strings — build DOM nodes or use `ctx.sanitize`.
- Never throw: catch errors and return `ctx.error(message, source)`.
- File name: `<name>.hd.js`. Test it with `viewer.html` → **Load plugin**.

Submit via PR adding your plugin to `plugins/` with a demo `.hd` file in `examples/`. Reference implementation: `plugins/mindmap.hd.js`.

## 2. Improve the viewer

`viewer.html` is intentionally a single file with zero dependencies (Mermaid via CDN is the one exception, with offline fallback). PRs should preserve that: no build step, no frameworks, works from `file://`.

## 3. Propose spec changes

Open an issue first. The spec (`docs/HD-SPEC.md`) follows `major.minor`: minor versions may only **add** components/attributes, never break existing documents. Unknown tags must degrade to placeholders, never errors.

## Ground rules

- Documents are data, not code — nothing may weaken the sanitizer or execute document content.
- Keep source AI-editable: strict tags, explicit closes, declarative data.
- Match existing code style; keep diffs focused.

## Bugs

Open an issue with the `.hd` source that reproduces it (that's the nice thing about a text format).
