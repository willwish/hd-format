"use strict";
/* HD Format — VS Code extension host.
   Registers the hd.viewer custom editor (webview preview), the
   preview<->source toggle commands, and auto-loading of HD component
   plugins (*.hd.js) from the workspace and a global folder. */

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/* ---------------- plugin collection ---------------- */
async function collectPlugins(docUri) {
  const cfg = vscode.workspace.getConfiguration("hd", docUri);
  const seen = new Set();
  const plugins = [];

  const addFile = (fsPath) => {
    const norm = path.normalize(fsPath);
    if (seen.has(norm)) return;
    seen.add(norm);
    try {
      plugins.push({ name: path.basename(norm), code: fs.readFileSync(norm, "utf8") });
    } catch (e) {
      /* unreadable plugin file — skip silently */
    }
  };

  // 1) workspace (repo-based) plugins, via configurable globs
  const folder = vscode.workspace.getWorkspaceFolder(docUri);
  if (folder) {
    const globs = cfg.get("pluginGlobs") || [];
    for (const glob of globs) {
      try {
        const files = await vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, glob), "**/node_modules/**", 200);
        files.forEach((f) => addFile(f.fsPath));
      } catch (e) { /* bad glob — skip */ }
    }
  }

  // 2) global plugins folder
  const globalDir = (cfg.get("globalPluginFolder") || "").trim();
  if (globalDir) {
    try {
      for (const name of fs.readdirSync(globalDir)) {
        if (name.endsWith(".hd.js")) addFile(path.join(globalDir, name));
      }
    } catch (e) { /* folder missing — skip */ }
  }

  return plugins;
}

/* ---------------- custom editor provider ---------------- */
class HdViewerProvider {
  constructor(context) {
    this.context = context;
    this.sessions = new Set();
  }

  async resolveCustomTextEditor(document, panel) {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")]
    };
    panel.webview.html = this.getHtml(panel.webview);

    let timer = null;
    const update = async () => {
      const plugins = await collectPlugins(document.uri);
      panel.webview.postMessage({ type: "render", text: document.getText(), plugins });
    };
    const debounced = () => { clearTimeout(timer); timer = setTimeout(update, 250); };

    const session = { update };
    this.sessions.add(session);

    const subs = [
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === document.uri.toString()) debounced();
      }),
      panel.webview.onDidReceiveMessage((msg) => {
        if (msg && msg.type === "ready") update();
      })
    ];
    panel.onDidDispose(() => {
      this.sessions.delete(session);
      subs.forEach((d) => d.dispose());
      clearTimeout(timer);
    });
  }

  refreshAll() {
    for (const s of this.sessions) s.update();
  }

  getHtml(webview) {
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "preview.js"));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "preview.css"));
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} https://cdn.jsdelivr.net 'unsafe-eval'`,
      `font-src ${webview.cspSource}`,
      "connect-src https://cdn.jsdelivr.net"
    ].join("; ");
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div id="plugin-banner" hidden></div>
  <article id="doc"></article>
  <script src="${jsUri}"></script>
</body>
</html>`;
  }
}

/* ---------------- preview <-> source toggle ---------------- */
function activeHdUri() {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  const input = tab && tab.input;
  if (input && input.uri) return input.uri; // TabInputText | TabInputCustom
  const ed = vscode.window.activeTextEditor;
  return ed ? ed.document.uri : undefined;
}
function reopenWith(viewType) {
  const uri = activeHdUri();
  if (uri) vscode.commands.executeCommand("vscode.openWith", uri, viewType);
}

/* ---------------- activation ---------------- */
function activate(context) {
  const provider = new HdViewerProvider(context);

  // re-render open previews when any plugin file changes (repo or edited globally)
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.hd.js");
  watcher.onDidChange(() => provider.refreshAll());
  watcher.onDidCreate(() => provider.refreshAll());
  watcher.onDidDelete(() => provider.refreshAll());

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider("hd.viewer", provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true
    }),
    vscode.commands.registerCommand("hd.showPreview", () => reopenWith("hd.viewer")),
    vscode.commands.registerCommand("hd.showSource", () => reopenWith("default")),
    watcher
  );
}
function deactivate() {}

module.exports = { activate, deactivate };
