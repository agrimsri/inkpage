# Inkpage On-Disk Notebook Format Specification (v1)

## 1. Overview
Inkpage stores notebooks local-first using standard filesystem directories, JSON metadata, content-addressed asset blobs, and derived search/history caches.

### Directory Structure
```
<NotebookName>.inkbook/
  notebook.json                      # Notebook metadata and section ordering
  sections/
    <section-id>.section/
      section.json                   # Section metadata and page ordering
      pages/
        <page-id>.page.json          # Canonical page JSON (schema v1)
      assets/
        <sha256>.<ext>               # Content-addressed binary blobs (images, files, previews)
  .inkpage/                          # Derived cache directory (safe to delete, rebuildable)
    index.sqlite                     # SQLite FTS5 search index, tag index, link graph, OCR cache
    history/                         # Per-page revision history deltas
```

## 2. File Specifications

### 2.1 `notebook.json`
```json
{
  "schema": 1,
  "id": "01JCARA0000000000000000001",
  "title": "My Notebook",
  "sectionOrder": ["01JCARA0000000000000000002"],
  "created": "2026-11-12T10:00:00Z",
  "modified": "2026-11-12T10:00:00Z"
}
```

### 2.2 `section.json`
```json
{
  "id": "01JCARA0000000000000000002",
  "title": "Quick Notes",
  "color": "#7c3aed",
  "parentGroup": null,
  "pageOrder": ["01JCARA0000000000000000003"]
}
```

### 2.3 `<page-id>.page.json`
```json
{
  "schema": 1,
  "id": "01JCARA0000000000000000003",
  "title": "Meeting Notes",
  "parentPage": null,
  "level": 0,
  "created": "2026-11-12T10:05:00Z",
  "modified": "2026-11-12T10:30:00Z",
  "size": { "w": "auto", "h": "auto" },
  "background": {
    "kind": "rule",
    "spacing": 24,
    "color": "#e2e8f0"
  },
  "items": [
    {
      "id": "item-01",
      "kind": "container",
      "x": 40,
      "y": 60,
      "w": 650,
      "h": 300,
      "z": 1,
      "doc": {
        "type": "doc",
        "content": [
          {
            "type": "outlineItem",
            "attrs": {
              "indent": 0,
              "tags": [{ "type": "todo", "done": false }]
            },
            "content": [
              { "type": "text", "text": "Review architecture proposal" }
            ]
          }
        ]
      }
    },
    {
      "id": "item-02",
      "kind": "ink",
      "x": 50,
      "y": 400,
      "w": 400,
      "h": 200,
      "z": 2,
      "strokes": [
        {
          "id": "stroke-01",
          "tool": "pen",
          "color": "#2563eb",
          "width": 3,
          "pts": [[50, 400, 0.5, 0, 100], [55, 405, 0.6, 0, 116]]
        }
      ]
    }
  ],
  "meta": {}
}
```

## 3. Storage Principles
1. **Atomic Writes**: All file writes follow the `write tmp -> fsync -> rename` pattern to prevent partial corruption.
2. **Crash Resilience**: If the process terminates abruptly, no committed file is corrupted.
3. **Derived Index**: `.inkpage/index.sqlite` can be safely removed and rebuilt from source page files using `inkpage reindex`.
