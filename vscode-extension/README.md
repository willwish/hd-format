# HD Format — VS Code Extension

View `.hd` documents ([HD format](https://github.com/willwish/hd-format)) rendered directly in VS Code: charts, Mermaid diagrams, tabs, callouts — with source, preview, and split source/preview modes.

## Features

- **Rendered preview** of `.hd` files via a custom editor (the same engine and security model as `viewer.html`)
- **Editor modes** in the editor title bar and command palette: source, split source/preview, and preview
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

1. Open a `.hd` file — it opens in the rendered HD viewer by default.
2. Use the editor title buttons or command palette to switch modes:
   - `HD: Source Mode` opens editable source.
   - `HD: Split Source / Preview` opens source on the left and preview on the right (`Cmd/Ctrl+K`, then `V`).
   - `HD: Preview Mode` opens the rendered preview (`Cmd/Ctrl+Shift+V` from source).
3. The preview live-updates as you type in source mode or split mode.
4. Drop plugin files (e.g. `mindmap.hd.js`) into your project's `plugins/` folder — components render immediately.
