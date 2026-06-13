"use strict";
/* HD preview renderer for VS Code webview.
   Same rendering rules as the standalone viewer.html (spec docs/HD-SPEC.md).
   Receives {type:"render", text, plugins:[{name,code}]} from the extension host. */
(function () {

  const vscodeApi = acquireVsCodeApi();

  /* ---------- component registry (plugin API, same as viewer.html) ---------- */
  const HD = {
    specVersion: "1.0",
    components: Object.create(null),
    register(tag, def) {
      if (!tag || typeof def !== "object" || typeof def.render !== "function")
        throw new Error("HD.register(tag, {render}) — invalid arguments");
      this.components[String(tag).toLowerCase()] = def;
    }
  };
  window.HD = HD;

  /* ---------- sanitizer whitelist (spec §3) ---------- */
  const ALLOWED_TAGS = new Set([
    "h1","h2","h3","h4","h5","h6",
    "p","blockquote","pre","hr","section","div","figure","figcaption",
    "ul","ol","li","dl","dt","dd",
    "table","thead","tbody","tfoot","tr","th","td","caption",
    "a","strong","em","b","i","u","s","mark","code","kbd","sup","sub","span","br",
    "img"
  ]);
  const DROP_WITH_CHILDREN = new Set([
    "script","style","iframe","object","embed","form","input","button",
    "select","textarea","link","meta","base","template","video","audio","source"
  ]);
  const GLOBAL_ATTRS = new Set(["id","class","title"]);
  const TAG_ATTRS = {
    a: ["href"], img: ["src","alt","width","height"],
    th: ["colspan","rowspan","align"], td: ["colspan","rowspan","align"], ol: ["start"]
  };
  function safeUrl(value, allowDataImage) {
    const v = String(value || "").trim();
    if (/^(https?:|mailto:|#)/i.test(v)) return v;
    if (allowDataImage && /^data:image\//i.test(v)) return v;
    return null;
  }
  function copyAttrs(src, dst) {
    const tag = dst.tagName.toLowerCase();
    for (const a of src.attributes) {
      const n = a.name.toLowerCase();
      if (n.startsWith("on")) continue;
      if (GLOBAL_ATTRS.has(n)) { dst.setAttribute(n, a.value); continue; }
      if ((TAG_ATTRS[tag] || []).includes(n)) {
        if (n === "href") { const u = safeUrl(a.value, false); if (u) dst.setAttribute("href", u); }
        else if (n === "src") { const u = safeUrl(a.value, true); if (u) dst.setAttribute("src", u); }
        else dst.setAttribute(n, a.value);
      }
    }
  }

  /* ---------- ctx helpers (spec §6.1) ---------- */
  function isDark() {
    const c = document.body.classList;
    return c.contains("vscode-dark") || c.contains("vscode-high-contrast");
  }
  function makeCtx() {
    return {
      sanitize(el) {
        const frag = document.createDocumentFragment();
        for (const child of el.childNodes) { const n = sanitizeNode(child); if (n) frag.appendChild(n); }
        return frag;
      },
      h(tag, attrs, ...children) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
          if (k === "class") el.className = v; else el.setAttribute(k, v);
        }
        for (const c of children.flat())
          if (c != null) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        return el;
      },
      svg(tag, attrs) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [k, v] of Object.entries(attrs || {})) {
          // CSS var() is invalid in SVG presentation attributes — route via style
          if ((k === "fill" || k === "stroke") && String(v).includes("var("))
            el.style[k] = v;
          else el.setAttribute(k, v);
        }
        return el;
      },
      error: errorBox,
      get theme() { return isDark() ? "dark" : "light"; }
    };
  }
  function errorBox(message, source) {
    const box = document.createElement("div");
    box.className = "hd-error";
    const t = document.createElement("div"); t.className = "e-title"; t.textContent = "⚠ " + message;
    box.appendChild(t);
    if (source) { const pre = document.createElement("pre"); pre.textContent = source; box.appendChild(pre); }
    return box;
  }

  /* ---------- sanitize / render walk ---------- */
  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = node.tagName.toLowerCase();

    if (tag.startsWith("hd-")) return renderComponent(tag, node);
    if (DROP_WITH_CHILDREN.has(tag)) return null;
    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      for (const child of node.childNodes) { const n = sanitizeNode(child); if (n) frag.appendChild(n); }
      return frag;
    }
    const out = document.createElement(tag);
    copyAttrs(node, out);
    for (const child of node.childNodes) { const n = sanitizeNode(child); if (n) out.appendChild(n); }
    return out;
  }
  function renderComponent(tag, el) {
    if (tag === "hd-use" || tag === "hd-body" || tag === "hd-doc") {
      const frag = document.createDocumentFragment();
      for (const child of el.childNodes) { const n = sanitizeNode(child); if (n) frag.appendChild(n); }
      return frag;
    }
    const def = HD.components[tag];
    if (!def) {
      const ph = document.createElement("div");
      ph.className = "hd-placeholder";
      const code = document.createElement("code");
      code.textContent = "<" + tag + ">";
      ph.appendChild(document.createTextNode("Component "));
      ph.appendChild(code);
      ph.appendChild(document.createTextNode(" needs a plugin — add its .hd.js file to your project's plugins/ folder."));
      return ph;
    }
    try { return def.render(el, makeCtx()) || document.createDocumentFragment(); }
    catch (e) { return errorBox("<" + tag + "> failed to render: " + e.message); }
  }

  /* ---------- built-in components (identical behavior to viewer.html) ---------- */
  HD.components["hd-callout"] = { render(el, ctx) {
    const type = (el.getAttribute("type") || "note").toLowerCase();
    const icons = { note: "✏️", info: "ℹ️", tip: "💡", warning: "⚠️", danger: "⛔" };
    const valid = icons[type] ? type : "note";
    const body = ctx.h("div", { class: "body" });
    const title = el.getAttribute("title");
    if (title) body.appendChild(ctx.h("div", { class: "c-title" }, title));
    body.appendChild(ctx.sanitize(el));
    return ctx.h("div", { class: "hd-callout " + valid },
      ctx.h("div", { class: "ico" }, icons[valid]), body);
  }};

  HD.components["hd-details"] = { render(el, ctx) {
    const d = document.createElement("details");
    d.className = "hd-details";
    if (el.hasAttribute("open")) d.open = true;
    d.appendChild(ctx.h("summary", {}, el.getAttribute("title") || "Details"));
    const body = ctx.h("div", { class: "d-body" }); body.appendChild(ctx.sanitize(el));
    d.appendChild(body);
    return d;
  }};

  HD.components["hd-tabs"] = { render(el, ctx) {
    const tabs = [...el.children].filter(c => c.tagName.toLowerCase() === "hd-tab");
    if (!tabs.length) return ctx.error("<hd-tabs> contains no <hd-tab> children");
    const root = ctx.h("div", { class: "hd-tabs" });
    const nav = ctx.h("div", { class: "tab-nav" });
    const panels = [];
    const active = Math.max(0, tabs.findIndex(t => t.hasAttribute("active")));
    tabs.forEach((tab, i) => {
      const btn = ctx.h("button", {}, tab.getAttribute("title") || "Tab " + (i + 1));
      btn.addEventListener("click", () => {
        nav.querySelectorAll("button").forEach((b, j) => b.classList.toggle("active", j === i));
        panels.forEach((p, j) => p.classList.toggle("active", j === i));
      });
      nav.appendChild(btn);
      const panel = ctx.h("div", { class: "tab-panel" }); panel.appendChild(ctx.sanitize(tab));
      panels.push(panel);
    });
    nav.children[active].classList.add("active");
    panels[active].classList.add("active");
    root.appendChild(nav); panels.forEach(p => root.appendChild(p));
    return root;
  }};

  /* ---------- hd-chart ---------- */
  const PALETTE = ["#4e79a7","#f28e2b","#59a14f","#e15759","#b07aa1","#76b7b2","#edc949","#ff9da7"];
  HD.components["hd-chart"] = { render(el, ctx) {
    const type = (el.getAttribute("type") || "bar").toLowerCase();
    const height = Math.min(800, parseInt(el.getAttribute("height") || "300", 10) || 300);
    let data;
    try { data = JSON.parse(el.textContent); }
    catch (e) { return ctx.error("hd-chart: invalid JSON — " + e.message, el.textContent.trim()); }
    const labels = data.labels, series = data.series;
    if (!Array.isArray(labels) || !Array.isArray(series) || !series.length ||
        series.some(s => !Array.isArray(s.data)))
      return ctx.error('hd-chart: body must be {"labels":[...],"series":[{"name":...,"data":[...]}]}', el.textContent.trim());

    const root = ctx.h("div", { class: "hd-chart" });
    const title = el.getAttribute("title");
    if (title) root.appendChild(ctx.h("div", { class: "chart-title" }, title));
    const colorOf = (s, i) => s.color || PALETTE[i % PALETTE.length];

    if (type === "pie") root.appendChild(pieSVG(ctx, labels, series[0], height));
    else root.appendChild(xySVG(ctx, type, labels, series, height, colorOf));

    if (type === "pie" || series.length > 1) {
      const legend = ctx.h("div", { class: "legend" });
      const items = type === "pie" ? labels.map((l, i) => [l, PALETTE[i % PALETTE.length]])
                                   : series.map((s, i) => [s.name || "Series " + (i + 1), colorOf(s, i)]);
      for (const [name, color] of items) {
        const sw = ctx.h("span", { class: "sw" }); sw.style.background = color;
        legend.appendChild(ctx.h("span", {}, sw, String(name)));
      }
      root.appendChild(legend);
    }
    return root;
  }};
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
    return 10 * p;
  }
  function xySVG(ctx, type, labels, series, H, colorOf) {
    const W = 680, m = { t: 16, r: 16, b: 44, l: 52 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const svg = ctx.svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    const axis = "var(--fg-soft)", grid = "var(--border)";
    const max = niceMax(Math.max(1e-9, ...series.flatMap(s => s.data.map(Number).filter(isFinite))));
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = m.t + ph - (ph * i) / steps;
      const line = ctx.svg("line", { x1: m.l, y1: y, x2: m.l + pw, y2: y, stroke: grid, "stroke-width": i === 0 ? 1.5 : 1 });
      if (i > 0) line.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(line);
      const t = ctx.svg("text", { x: m.l - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: axis });
      t.textContent = formatNum((max * i) / steps); svg.appendChild(t);
    }
    const slot = pw / labels.length;
    labels.forEach((lab, i) => {
      const t = ctx.svg("text", { x: m.l + slot * (i + 0.5), y: H - m.b + 18, "text-anchor": "middle", "font-size": 11.5, fill: axis });
      t.textContent = truncate(String(lab), 14); svg.appendChild(t);
    });
    if (type === "line") {
      series.forEach((s, si) => {
        const color = colorOf(s, si);
        const pts = s.data.map((v, i) => [m.l + slot * (i + 0.5), m.t + ph - (ph * Number(v)) / max]);
        svg.appendChild(ctx.svg("polyline", {
          points: pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" "),
          fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linejoin": "round"
        }));
        for (const [x, y] of pts) svg.appendChild(ctx.svg("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.5, fill: color }));
      });
    } else {
      const groupW = slot * 0.72, barW = groupW / series.length;
      series.forEach((s, si) => {
        const color = colorOf(s, si);
        s.data.forEach((v, i) => {
          const h = (ph * Number(v)) / max;
          if (!isFinite(h)) return;
          svg.appendChild(ctx.svg("rect", {
            x: (m.l + slot * i + (slot - groupW) / 2 + barW * si).toFixed(1),
            y: (m.t + ph - Math.max(0, h)).toFixed(1),
            width: Math.max(1, barW - 2).toFixed(1), height: Math.max(0, h).toFixed(1),
            fill: color, rx: 2
          }));
        });
      });
    }
    return svg;
  }
  function pieSVG(ctx, labels, s0, H) {
    const W = 680, cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 16;
    const svg = ctx.svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    const vals = s0.data.map(Number).map(v => (isFinite(v) && v > 0 ? v : 0));
    const total = vals.reduce((a, b) => a + b, 0);
    if (!total) { svg.appendChild(ctx.svg("circle", { cx, cy, r, fill: "var(--border)" })); return svg; }
    let angle = -Math.PI / 2;
    vals.forEach((v, i) => {
      const frac = v / total;
      if (frac <= 0) return;
      const color = PALETTE[i % PALETTE.length];
      if (frac >= 0.9999) { svg.appendChild(ctx.svg("circle", { cx, cy, r, fill: color })); return; }
      const a2 = angle + frac * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      svg.appendChild(ctx.svg("path", {
        d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
        fill: color, stroke: "var(--bg)", "stroke-width": 1.5
      }));
      const mid = (angle + a2) / 2, lr = r * 0.62;
      if (frac > 0.06) {
        const t = ctx.svg("text", {
          x: (cx + lr * Math.cos(mid)).toFixed(1), y: (cy + lr * Math.sin(mid)).toFixed(1),
          "text-anchor": "middle", "font-size": 12, fill: "#fff", "font-weight": 600
        });
        t.textContent = Math.round(frac * 100) + "%"; svg.appendChild(t);
      }
      angle = a2;
    });
    return svg;
  }
  function formatNum(v) { return Math.abs(v) >= 1000 ? Number(v.toFixed(0)).toLocaleString() : String(Number(v.toFixed(2))); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  /* ---------- hd-mermaid ---------- */
  let mermaidPromise = null, mermaidSeq = 0;
  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (mermaidPromise) return mermaidPromise;
    mermaidPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
      s.onload = () => {
        try {
          window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict",
            theme: isDark() ? "dark" : "default" });
          resolve(window.mermaid);
        } catch (e) { reject(e); }
      };
      s.onerror = () => { mermaidPromise = null; reject(new Error("Could not load Mermaid (offline?)")); };
      document.head.appendChild(s);
    });
    return mermaidPromise;
  }
  HD.components["hd-mermaid"] = { render(el, ctx) {
    const code = el.textContent.trim();
    const holder = ctx.h("div", { class: "hd-mermaid" }, "Rendering diagram…");
    loadMermaid()
      .then(m => m.render("hd-mmd-" + (++mermaidSeq), code))
      .then(({ svg }) => { holder.innerHTML = svg; })
      .catch(e => {
        holder.textContent = "";
        holder.appendChild(ctx.error("Diagram not rendered (" + e.message + ") — source below:", code));
      });
    return holder;
  }};

  /* ---------- plugins from extension host ---------- */
  const executedPlugins = new Map(); // name -> code (skip re-exec if unchanged)
  function executePlugins(plugins) {
    const errors = [];
    for (const p of plugins || []) {
      if (executedPlugins.get(p.name) === p.code) continue;
      try { new Function(p.code)(); executedPlugins.set(p.name, p.code); }
      catch (e) { errors.push(p.name + ": " + e.message); }
    }
    return errors;
  }

  /* ---------- document rendering ---------- */
  function renderDocument(text, pluginErrors) {
    const scrollY = window.scrollY;
    const header = text.match(/^﻿?\s*<!hd\s+([\d.]+)\s*>/i);
    const body = header ? text.slice(text.indexOf(">", text.search(/<!hd/i)) + 1) : text;
    const srcDoc = new DOMParser().parseFromString(body, "text/html");
    const docEl = srcDoc.querySelector("hd-doc");
    const bodyEl = srcDoc.querySelector("hd-body");
    const article = document.getElementById("doc");
    article.textContent = "";

    if (!header) article.appendChild(errorBox("Missing <!hd 1.0> header — rendering anyway."));
    if (!docEl || !bodyEl) {
      article.appendChild(errorBox("Not a valid HD document: <hd-doc> / <hd-body> not found."));
      return;
    }
    const metaBits = [docEl.getAttribute("author"), docEl.getAttribute("date")].filter(Boolean);
    if (metaBits.length) {
      const meta = document.createElement("p");
      meta.className = "doc-meta"; meta.textContent = metaBits.join(" · ");
      article.appendChild(meta);
    }
    for (const child of bodyEl.childNodes) { const n = sanitizeNode(child); if (n) article.appendChild(n); }

    // banner: missing plugins + plugin errors
    const missing = [...srcDoc.querySelectorAll("hd-use")]
      .map(u => (u.getAttribute("name") || "").toLowerCase())
      .filter(name => name && !HD.components["hd-" + name]);
    const banner = document.getElementById("plugin-banner");
    const parts = [];
    if (missing.length) parts.push("Missing plugin" + (missing.length > 1 ? "s" : "") + ": " + missing.join(", ") +
      " — add the .hd.js file to a plugins/ folder in this workspace, or set hd.globalPluginFolder.");
    if (pluginErrors && pluginErrors.length) parts.push("Plugin errors: " + pluginErrors.join(" | "));
    banner.hidden = parts.length === 0;
    banner.textContent = parts.join("  ");

    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }

  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg && msg.type === "render") {
      const pluginErrors = executePlugins(msg.plugins);
      renderDocument(msg.text || "", pluginErrors);
    }
  });

  vscodeApi.postMessage({ type: "ready" });
})();
