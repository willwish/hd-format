/* ===========================================================================
   HD plugin: mindmap 1.0  —  registers <hd-mindmap>
   Data format (component body): indented "-" list, 2 spaces per level.

     <hd-mindmap>
     - Root
       - Branch A
         - Leaf 1
       - Branch B
     </hd-mindmap>

   Declarative data only — AI-editable as plain text. See docs/HD-SPEC.md §6.
   =========================================================================== */
(function () {
  "use strict";
  if (!window.HD) { console.error("mindmap.hd.js: HD viewer not found"); return; }

  function parseTree(text) {
    const lines = text.split("\n")
      .map(l => l.replace(/\t/g, "  "))
      .filter(l => l.trim().startsWith("-"));
    if (!lines.length) return null;
    const baseIndent = lines[0].search(/\S/);
    const root = { label: "", children: [], depth: -1 };
    const stack = [root];
    for (const line of lines) {
      const depth = Math.floor((line.search(/\S/) - baseIndent) / 2);
      const node = { label: line.trim().replace(/^-\s*/, ""), children: [], depth };
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root.children.length === 1 ? root.children[0] : { label: "•", children: root.children, depth: -1 };
  }

  const ROW = 34, GAP_X = 56, PAD_X = 14, FONT = 13, CHAR_W = 7.4;
  const COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#dc2626"];

  function measure(label) { return Math.max(40, Math.round(label.length * CHAR_W) + PAD_X * 2); }

  /* assign y by leaf order; x by column (max node width per depth) */
  function layout(root) {
    const colW = [];
    let leaf = 0;
    (function walk(n, d) {
      n.w = measure(n.label);
      colW[d] = Math.max(colW[d] || 0, n.w);
      if (!n.children.length) { n.y = leaf * ROW; leaf++; }
      else { n.children.forEach(c => walk(c, d + 1)); n.y = (n.children[0].y + n.children[n.children.length - 1].y) / 2; }
      n.d = d;
    })(root, 0);
    const colX = [0];
    for (let i = 1; i < colW.length; i++) colX[i] = colX[i - 1] + colW[i - 1] + GAP_X;
    (function place(n) { n.x = colX[n.d]; n.children.forEach(place); })(root);
    return { width: colX[colW.length - 1] + colW[colW.length - 1], height: Math.max(leaf, 1) * ROW };
  }

  window.HD.register("hd-mindmap", {
    version: "1.0",
    render(el, ctx) {
      const root = parseTree(el.textContent);
      if (!root) return ctx.error("hd-mindmap: body must be an indented '-' list", el.textContent.trim());

      const size = layout(root);
      const M = 10;
      const svg = ctx.svg("svg", {
        viewBox: "0 0 " + (size.width + M * 2) + " " + (size.height + M * 2),
        width: size.width + M * 2, height: size.height + M * 2, role: "img"
      });
      svg.style.maxWidth = "100%"; svg.style.height = "auto";

      (function draw(n) {
        const yc = n.y + ROW / 2 + M, x = n.x + M;
        for (const c of n.children) {
          const cyc = c.y + ROW / 2 + M, cx = c.x + M;
          const x1 = x + n.w, mx = (x1 + cx) / 2;
          svg.appendChild(ctx.svg("path", {
            d: "M " + x1 + " " + yc + " C " + mx + " " + yc + ", " + mx + " " + cyc + ", " + cx + " " + cyc,
            fill: "none", stroke: "var(--border, #ccc)", "stroke-width": 1.6
          }));
          draw(c);
        }
        const color = COLORS[Math.min(n.d, COLORS.length - 1)];
        const isRoot = n.d === 0;
        svg.appendChild(ctx.svg("rect", {
          x: x, y: yc - 13, width: n.w, height: 26, rx: 13,
          fill: isRoot ? color : "var(--bg-soft, #f4f4f5)",
          stroke: color, "stroke-width": isRoot ? 0 : 1.4
        }));
        const t = ctx.svg("text", {
          x: x + n.w / 2, y: yc + 4.5, "text-anchor": "middle",
          "font-size": FONT, "font-weight": isRoot ? 600 : 500,
          fill: isRoot ? "#fff" : "var(--fg, #222)"
        });
        t.textContent = n.label;
        svg.appendChild(t);
      })(root);

      svg.style.margin = "0 auto";
      const wrap = ctx.h("div", { class: "hd-chart" }); // reuse chart layout/title styles
      const title = el.getAttribute("title");
      if (title) wrap.appendChild(ctx.h("div", { class: "chart-title" }, title));
      wrap.appendChild(svg);
      return wrap;
    }
  });
})();
