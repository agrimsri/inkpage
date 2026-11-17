# Inkpage

[![GitHub Release](https://img.shields.io/github/v/release/agrimsri/inkpage?include_prereleases&style=flat-square&color=indigo)](https://github.com/agrimsri/inkpage/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/agrimsri/inkpage/release.yml?branch=main&label=CI%2FCD&style=flat-square)](https://github.com/agrimsri/inkpage/actions)
[![Linux](https://img.shields.io/badge/platform-Linux%20(.AppImage%2C%20.deb)-blue?style=flat-square&logo=linux)](https://github.com/agrimsri/inkpage/releases)
[![Windows](https://img.shields.io/badge/platform-Windows%20(.exe)-blue?style=flat-square&logo=windows)](https://github.com/agrimsri/inkpage/releases)
[![macOS](https://img.shields.io/badge/platform-macOS%20(.dmg)-blue?style=flat-square&logo=apple)](https://github.com/agrimsri/inkpage/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> A free, open-source, Linux-first OneNote-class note-taking app.

_Inkpage is a free, open-source, local-first notebook for Linux, Windows, and macOS: an infinite page where you can type, draw, paste and organise, with notebooks, sections and pages you already know from tools like Microsoft OneNote. It imports your existing OneNote notebooks, stores everything as plain files you control, and syncs with whatever you already use. Not affiliated with or endorsed by Microsoft._

---

## Download & Install

Standalone installers are published on the **[GitHub Releases](https://github.com/agrimsri/inkpage/releases)** page.

> **Zero Dependencies Required:** Every installer is completely self-contained. The native Rust backend (`inkpage-server`) is bundled directly inside the application resources. End users **do not** need Rust, Node.js, or pnpm installed.

### Linux
- **AppImage** (Recommended for any modern distribution):
  ```bash
  chmod +x Inkpage-0.1.0-linux-x86_64.AppImage
  ./Inkpage-0.1.0-linux-x86_64.AppImage
  ```
- **Debian / Ubuntu** (`.deb` package with desktop integration and icon):
  ```bash
  sudo dpkg -i Inkpage-0.1.0-linux-amd64.deb
  ```

### Windows
- Download and run **`Inkpage-Setup-0.1.0-x64.exe`** (NSIS installer with Start Menu & desktop shortcuts) or portable executable (**`Inkpage-Portable-0.1.0-x64.exe`**).

### macOS
- Download **`Inkpage-0.1.0-mac-universal.dmg`** (Universal binary for both Apple Silicon and Intel Macs), open the disk image, and drag Inkpage into `/Applications`.

---

## Features

- **Infinite Freeform 2D Canvas**: Click anywhere to type notes, movable containers, resizable boxes, rule lines or soft grid paper.
- **First-Class Stylus & Ink**: Pressure-sensitive pen, semi-transparent highlighter, stroke eraser, and lasso selection powered by `perfect-freehand` with hardware palm rejection and event coalescing.
- **OneNote Importer**: Direct offline import of:
  - `.one` section files
  - `.onetoc2` notebook directories
  - `.onepkg` Microsoft Cabinet packages
  - OneDrive export ZIP archives
- **Local-First & Files as Truth**: Stored as plain `.inkbook` directory structures with content-addressed assets and atomic writes (`write tmp -> fsync -> rename`).
- **Instant SQLite FTS5 Search**: Sub-millisecond full-text queries across page titles, outline texts, note tags, and image OCR text with match highlights.
- **Tag Summary Pane**: Aggregates all To-Do task checkboxes (`[ ]` / `[x]`), Important stars, and Questions across pages.
- **Multi-Format Export**: Export to native `.inkbook`, Markdown bundles (with GFM tables, task lists, and SVG ink), or canonical JSON.

---

## Repository Structure

```
├── crates/
│   ├── inkpage-onestore/    # MS-ONESTORE header & binary format decoder
│   ├── inkpage-import/       # Semantic mapping to IR & CLI importer tool
│   └── inkpage-core/         # Storage engine, SQLite FTS5 index, & local RPC server
├── packages/
│   ├── format/               # Canonical TypeScript schemas and interfaces
│   └── ui/                   # React canvas, outline editor, ink engine, sidebars
├── apps/
│   └── desktop/              # Vite frontend and Electron desktop launcher
├── docs/                     # format.md, legal.md, shortcuts.md, research-log.md, ADRs
└── fixtures/                 # Synthetic test fixtures
```

---

## Quickstart

### 1. Build the Rust Backend & CLI
```bash
# Build the local server and importer CLI
cargo build --workspace --release

# Run all test suites
cargo test --workspace
```

### 2. Run the Local Backend Server
```bash
./target/release/inkpage-server --port 3888 --data-dir ~/notebooks
```

### 3. Run the Desktop UI
```bash
# Install dependencies and build packages
pnpm install
pnpm -r build

# Start Vite development server
pnpm dev
# Open http://localhost:3000 in your browser or launch Electron:
pnpm --filter @inkpage/desktop run electron
```

### 4. Import OneNote Files via CLI
```bash
# Import a .onepkg, .one, or .onetoc2 file directly into native .inkbook format:
./target/release/inkpage-import /path/to/Notebook.onepkg -o ./imported -f native

# Or export directly to Markdown:
./target/release/inkpage-import /path/to/Notebook.onepkg -o ./markdown_export -f md
```

### 5. Package Standalone Installers
```bash
# Automatically builds the release Rust backend, builds UI packages, and packages installers:
pnpm package:linux     # Generates .AppImage and .deb in apps/desktop/dist-electron
pnpm package:win       # Generates NSIS setup and portable .exe
pnpm package:mac       # Generates .dmg and .zip (requires macOS)
pnpm package:dir       # Generates unpacked desktop application folder for local testing
```

### 6. Automated CI/CD Releases via GitHub Actions

Pushes with version tags (`v*`) automatically trigger `.github/workflows/release.yml`:
1. Compiles the native Rust backend across Linux (`x86_64`), Windows (`x86_64`), and macOS (Universal `x86_64` + `aarch64` via `lipo`).
2. Bundles the backend binary into the Electron app's `process.resourcesPath`.
3. Packages installers for Linux (`.AppImage`, `.deb`), Windows (`.exe`), and macOS (`.dmg`).
4. Generates cryptographic checksums (`SHA256SUMS.txt`).
5. Publishes the assets directly to [GitHub Releases](https://github.com/agrimsri/inkpage/releases).

```bash
git tag v0.1.0
git push origin v0.1.0
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New Page |
| `Ctrl+Shift+N` | New Section |
| `Ctrl+E` or `Ctrl+F` | Open Search |
| `Ctrl+1` | Toggle To-Do Tag (`[ ]` / `[x]`) |
| `Ctrl+2` | Toggle Important Tag (Star) |
| `Ctrl+3` | Toggle Question Tag (?) |
| `Tab` / `Shift+Tab` | Indent / Outdent Outline Item |
| `Space + Drag` | Pan Canvas |
| `Ctrl + Scroll` | Zoom In / Out |
| `P` | Pen Tool |
| `H` | Highlighter Tool |
| `E` | Eraser Tool |
| `V` / `S` | Select Tool |
| `T` | Text Tool |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |

See [`docs/shortcuts.md`](docs/shortcuts.md) for the full shortcut list.

---

## Legal & Nominative Use Disclaimer

Microsoft, Windows, OneNote, and OneDrive are registered trademarks of Microsoft Corporation. Inkpage is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Microsoft Corporation. References to Microsoft OneNote are nominative to describe file compatibility. See [`docs/legal.md`](docs/legal.md) for details.
