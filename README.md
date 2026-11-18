# Inkpage

[![GitHub Release](https://img.shields.io/github/v/release/agrimsri/inkpage?include_prereleases&style=flat-square&color=indigo)](https://github.com/agrimsri/inkpage/releases)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/agrimsri/inkpage/release.yml?branch=main&label=CI%2FCD&style=flat-square)](https://github.com/agrimsri/inkpage/actions)
[![Linux](https://img.shields.io/badge/platform-Linux%20(.AppImage%2C%20.deb)-blue?style=flat-square&logo=linux)](https://github.com/agrimsri/inkpage/releases)
[![Windows](https://img.shields.io/badge/platform-Windows%20(.exe)-blue?style=flat-square&logo=windows)](https://github.com/agrimsri/inkpage/releases)
[![macOS](https://img.shields.io/badge/platform-macOS%20(.dmg)-blue?style=flat-square&logo=apple)](https://github.com/agrimsri/inkpage/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

> **A free, open-source, local-first OneNote alternative with an infinite canvas and first-class stylus inking.**

Inkpage is a lightweight, distraction-free digital notebook for **Linux, Windows, and macOS**. It provides the freeform flexibility you love from tools like Microsoft OneNote—an infinite 2D canvas where you can type anywhere, sketch with a pressure-sensitive pen, organize notebooks, sections, and pages, and import your existing OneNote archives—while storing everything as plain, open files on your own computer with zero telemetry or subscription fees.

<div align="center">
  <br />
  <img src="https://github.com/agrimsri/inkpage/releases/download/v0.1.0/inkpage-dark-ink.png" alt="Inkpage Dark Mode with Vector Stylus Inking" width="900" style="max-width: 100%; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);" />
  <p><em>Pressure-sensitive vector inking, rule lines, freeform containers, and Apple-inspired dark mode.</em></p>
</div>

---

## Downloads & Quick Install

Pre-compiled standalone installers are available on the **[Latest GitHub Releases](https://github.com/agrimsri/inkpage/releases/latest)** page.

> **Zero Dependencies Required:** Every installer is completely self-contained. The native Rust storage engine (`inkpage-server`) is bundled inside the application package. You do **not** need Rust, Node.js, or any developer tools installed.

### 🐧 Linux
- **AppImage** (Recommended — runs on any modern Linux distribution with a double-click):
  ```bash
  chmod +x Inkpage-0.1.0-linux-x86_64.AppImage
  ./Inkpage-0.1.0-linux-x86_64.AppImage
  ```
- **Debian / Ubuntu / Linux Mint** (`.deb` installer with desktop launcher & icon integration):
  ```bash
  sudo dpkg -i Inkpage-0.1.0-linux-amd64.deb
  ```

### 🪟 Windows
- Download and run **`Inkpage-Setup-0.1.0-x64.exe`** (Standard NSIS Setup Wizard with desktop and Start Menu shortcuts) or the standalone **`Inkpage-Portable-0.1.0-x64.exe`** (no installation needed).

### 🍏 macOS
- Download **`Inkpage-0.1.0-mac-universal.dmg`** (Universal binary optimized for both Apple Silicon M-series and Intel Macs), open the disk image, and drag **Inkpage** into your `/Applications` folder.

---

## Why Inkpage?

| Feature | Microsoft OneNote | Inkpage |
|---|---|---|
| **License** | Proprietary / Office 365 Subscription | **100% Free & Open Source (MIT)** |
| **Privacy & Storage** | Proprietary cloud sync (OneDrive lock-in) | **Local-First** (Plain `.inkbook` folders you own) |
| **Linux Support** | None (Web browser only) | **First-Class Native App** (AppImage, deb) |
| **Canvas** | Freeform 2D Canvas | **Infinite 2D Canvas** (Pan & zoom freely) |
| **Stylus & Inking** | Proprietary ink engine | **Low-Latency Vector Ink** (Palm rejection, lasso) |
| **OneNote Migration** | N/A | **Offline Importer** (`.one`, `.onetoc2`, `.onepkg`) |
| **Search Engine** | Cloud / Desktop search | **Instant Local SQLite FTS5** (<1ms queries) |
| **Aesthetics** | Dense ribbon UI | **Apple-Inspired Minimal Design** (Soft dark/light themes) |

---

## Core Features

- **Infinite Freeform 2D Canvas**: Click anywhere to type notes, arrange movable containers, resize text boxes, and pan across unlimited positive and negative space with rule lines or soft grid paper.
<div align="center">
  <img src="https://github.com/agrimsri/inkpage/releases/download/v0.1.0/inkpage-dark-canvas.png" alt="Freeform Canvas and Note Containers" width="850" style="max-width: 100%; border-radius: 6px;" />
  <p><em>Click anywhere to type, movable and resizable note boxes, and interactive task tags.</em></p>
</div>

- **First-Class Stylus & Digital Inking**:
  - Pressure-sensitive pen with natural calligraphic dynamics powered by `perfect-freehand`.
  - Semi-transparent highlighter with smooth layer blending.
  - Stroke eraser for fast, precise ink removal.
  - Freehand **Lasso Selection (`L`)** to circle, move, scale, or delete strokes and note blocks together.
  - Hardware palm rejection, event coalescing, and touch rejection.
- **Apple-Inspired Minimalist Interface**:
  - Refined typography and soft contrast designed with human interface guidelines.
  - Native **Dark Theme**, **Light Theme**, and automatic system appearance switching.
  - Collapsible notebook, section, and page panes to maximize your writing surface.
<div align="center">
  <img src="https://github.com/agrimsri/inkpage/releases/download/v0.1.0/inkpage-light-theme.png" alt="Inkpage Light Theme" width="850" style="max-width: 100%; border-radius: 6px;" />
  <p><em>Clean Apple-style light theme with collapsible ribbon and section navigation.</em></p>
</div>
- **Offline OneNote Importer**:
  - Direct offline import of `.one` section files, `.onetoc2` notebooks, `.onepkg` packages, and OneDrive ZIP archives.
  - Converts ink strokes, formatting, hierarchical sections, and embedded media into open standards.
- **Local-First & Files as Truth**:
  - Notebooks are stored as plain `.inkbook` directory hierarchies with content-addressed media.
  - Atomic writes (`write tmp -> fsync -> rename`) protect against data corruption or power cuts.
  - Easily sync your notebooks using Git, Syncthing, Nextcloud, Dropbox, or local backups.
- **Instant SQLite FTS5 Full-Text Search**:
  - Sub-millisecond search across all notebook pages, outline paragraphs, and tags with contextual highlights.
- **Tag Summaries & Task Management**:
  - Interactive To-Do checkboxes (`[ ]` / `[x]`), Important stars, and Question tags with an aggregated summary pane.
- **Multi-Format Export**:
  - Export notebooks to native `.inkbook`, Markdown bundles (with GFM tables and SVG vector ink), or canonical JSON.

---

## Keyboard Shortcuts

| Shortcut | Tool / Action | Description |
|---|---|---|
| `T` | **Text Tool** | Click anywhere on the canvas to insert a text note |
| `P` | **Pen Tool** | Stylus drawing with pressure dynamics |
| `H` | **Highlighter** | Semi-transparent highlight strokes |
| `E` | **Eraser** | Delete complete strokes on contact |
| `L` | **Lasso Select** | Freehand loop to select multiple notes and strokes |
| `V` or `S` | **Select Tool** | Marquee drag or click items; double-click to type |
| `Space + Drag` | **Pan Canvas** | Hand pan canvas without changing tools |
| `Ctrl + Scroll` | **Zoom** | Smooth zoom in and out centered on cursor |
| `Ctrl + 0` | **Reset Zoom** | Reset zoom level to 100% |
| `Ctrl + N` | **New Page** | Create a new page in the active section |
| `Ctrl + Shift + N` | **New Section** | Create a new section in the active notebook |
| `Ctrl + E` / `Ctrl + F` | **Search** | Open instant full-text search across all notebooks |
| `Ctrl + 1` | **To-Do Tag** | Toggle checkbox task tag (`[ ]` / `[x]`) on outline item |
| `Ctrl + 2` | **Important Tag** | Mark active item with an Important star tag |
| `Ctrl + 3` | **Question Tag** | Mark active item with a Question tag |
| `Tab` / `Shift + Tab` | **Indent / Outdent** | Increase or decrease indentation level in outlines |
| `Escape` | **Deselect** | Clear active lasso or item selection / cancel stroke |
| `Delete` | **Delete Item** | Remove currently selected containers or strokes |
| `Ctrl + Z` / `Ctrl + Y` | **Undo / Redo** | Revert or reapply edits |

*See [`docs/shortcuts.md`](docs/shortcuts.md) for the complete list of hotkeys and gestures.*

---

## Developer & Contributor Guide

Everything below is for developers, hackers, and contributors building or customizing Inkpage from source.

### Architecture Overview

Inkpage is built as a modular monorepo combining a high-performance **Rust** storage and import engine with an **Electron + React + TypeScript** desktop interface:

```
├── crates/
│   ├── inkpage-core/         # Local storage engine, SQLite FTS5 index & Axum RPC server
│   ├── inkpage-onestore/    # MS-ONESTORE binary format decoder and header parser
│   └── inkpage-import/       # OneNote AST semantic mapping to IR & CLI migration tool
├── packages/
│   ├── format/               # Canonical TypeScript schemas, interfaces, and serializers
│   └── ui/                   # React canvas, infinite viewport, vector inking, and ribbon
├── apps/
│   └── desktop/              # Vite frontend shell and Electron launcher with bundled backend
├── docs/                     # Format specifications, shortcuts, legal, and third-party notices
└── fixtures/                 # Synthetic OneNote format test fixtures
```

### Development Prerequisites

- **Rust**: Stable toolchain (1.78+) with `cargo`.
- **Node.js**: Version 20 or 22 LTS.
- **pnpm**: Version 9 or higher (`npm install -g pnpm@9`).

### 1. Build and Test the Rust Workspace

```bash
# Build the backend server and importer CLI in release mode
cargo build --workspace --release

# Run the complete Rust test suite
cargo test --workspace
```

### 2. Install Frontend Dependencies & Build Packages

```bash
# Install workspace dependencies
pnpm install

# Build @inkpage/format, @inkpage/ui, and @inkpage/desktop
pnpm build
```

### 3. Run in Development Mode

```bash
# Option A: Start Vite web development server (browser preview on http://localhost:3000)
pnpm dev

# Option B: Launch desktop app in Electron with live reload
pnpm --filter @inkpage/desktop run electron:dev
```

### 4. OneNote Offline Importer CLI

You can use the standalone Rust CLI tool to inspect and convert OneNote files directly in your terminal:

```bash
# Convert a .onepkg, .one, or .onetoc2 file into a native .inkbook directory:
./target/release/inkpage-import /path/to/Notebook.onepkg -o ./imported_notebook -f native

# Export directly to standard Markdown with SVG ink assets:
./target/release/inkpage-import /path/to/Notebook.onepkg -o ./markdown_export -f md
```

### 5. Packaging Standalone Installers Locally

To build self-contained, zero-dependency release packages on your local machine:

```bash
# Staging and packaging for Linux (produces .AppImage and .deb in apps/desktop/dist-electron):
pnpm package:linux

# Packaging for Windows (generates NSIS setup .exe and portable .exe):
pnpm package:win

# Packaging for macOS (generates universal DMG and ZIP, requires macOS):
pnpm package:mac

# Fast local directory unpack test (unpacked application folder):
pnpm package:dir
```

### 6. Automated CI/CD Releases (GitHub Actions)

Release distribution is completely automated via [.github/workflows/release.yml](.github/workflows/release.yml):
1. Pushing any version tag (e.g. `git tag v0.2.0 && git push origin v0.2.0`) triggers cross-compilation across Ubuntu, Windows, and macOS runners.
2. The Rust backend binary is compiled natively and bundled into `process.resourcesPath/bin`.
3. `electron-builder` packages `.AppImage`, `.deb`, `.exe`, and Universal `.dmg` installers.
4. Cryptographic checksums (`SHA256SUMS.txt`) are generated and all assets are automatically published to [GitHub Releases](https://github.com/agrimsri/inkpage/releases).

### Contributing

Contributions, bug reports, and suggestions are welcome!
1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Ensure all tests pass (`cargo test --workspace && pnpm build`).
4. Commit your changes (`git commit -m "feat: add amazing feature"`).
5. Push to your branch and open a Pull Request.

---

## Legal & Nominative Use Disclaimer

Microsoft, Windows, OneNote, and OneDrive are registered trademarks of Microsoft Corporation. Inkpage is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Microsoft Corporation. References to Microsoft OneNote are nominative to describe file format interoperability. See [`docs/legal.md`](docs/legal.md) for details.

---

## License

This project is licensed under the [MIT License](LICENSE).
