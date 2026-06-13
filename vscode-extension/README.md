# HD Format — VS Code Extension

View `.hd` documents ([HD format](https://github.com/willwish/hd-format)) rendered directly in VS Code: charts, Mermaid diagrams, tabs, callouts — with one-click toggle between preview and source.

## Features

- **Rendered preview** of `.hd` files via a custom editor (the same engine and security model as `viewer.html`)
- **Toggle buttons** in the editor title bar: open preview from source (`Cmd/Ctrl+Shift+V`) and jump back to source from preview
- **Live update** — preview re-renders as you type (250 ms debounce)
- **Plugin auto-loading** — HD component plugins (`*.hd.js`) are loaded automatically:
  - *Repo-based:* from `plugins/`, `hd-plugins/`, or `.hd/plugins/` in your workspace (configurable via `hd.pluginGlobs`)
  - *Global:* from the folder set in `hd.globalPluginFolder`
  - Previews refresh automatically when a plugin file changes
- **Theme-aware** — preview follows your VS Code light/dark theme
- HTML syntax highlighting for `.hd` source

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `hd.pluginGlobs` | `["plugins/*.hd.js", "hd-plugins/*.hd.js", ".hd/plugins/*.hd.js"]` | Workspace-relative globs of plugins to auto-load |
| `hd.globalPluginFolder` | `""` | Absolute path to a folder of global plugins |

## Security note

HD documents are inert data — sanitized, never executed. Plugins **are** code and run inside the preview webview. Only put plugin files you trust into your plugin folders; treat them like any other dependency you add to a project.

## Install / develop

Not yet on the Marketplace. Two ways to run it:

**Development (F5):** open the `vscode-extension/` folder in VS Code → press `F5` (Run Extension) → in the dev window, open any `.hd` file.

**Package and install:**

```bash
npm install -g @vscode/vsce
cd vscode-extension
vsce package
code --install-extension hd-format-0.1.0.vsix
```

No build step — the extension is plain JavaScript.

## Usage

1. Open a `.hd` file — it opens as source (text) by default.
2. Click the preview icon in the editor title bar (or `Cmd/Ctrl+Shift+V`) to switch to the rendered view.
3. Click the source icon to switch back and edit; reopen preview to see changes (or keep two editors side by side — the preview live-updates as you type).
4. Drop plugin files (e.g. `mindmap.hd.js`) into your project's `plugins/` folder — components render immediately.
