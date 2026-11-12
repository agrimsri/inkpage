use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IndexError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub notebook_id: String,
    pub section_id: String,
    pub page_id: String,
    pub page_title: String,
    pub item_kind: String,
    pub snippet: String,
    pub rank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagSummaryItem {
    pub notebook_id: String,
    pub section_id: String,
    pub section_title: String,
    pub section_color: String,
    pub page_id: String,
    pub page_title: String,
    pub tag_type: String, // "todo" | "important" | "question"
    pub done: bool,
    pub text: String,
}

pub struct SearchIndex {
    conn: Mutex<Connection>,
}

impl SearchIndex {
    pub fn open(db_path: &Path) -> Result<Self, IndexError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(db_path)?;
        let index = Self {
            conn: Mutex::new(conn),
        };
        index.init_schema()?;
        Ok(index)
    }

    pub fn open_in_memory() -> Result<Self, IndexError> {
        let conn = Connection::open_in_memory()?;
        let index = Self {
            conn: Mutex::new(conn),
        };
        index.init_schema()?;
        Ok(index)
    }

    fn init_schema(&self) -> Result<(), IndexError> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = -64000;
            PRAGMA temp_store = MEMORY;

            CREATE TABLE IF NOT EXISTS page_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notebook_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                page_title TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_kind TEXT NOT NULL,
                content TEXT,
                tags TEXT,
                ocr_text TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_page_items_page_id ON page_items(page_id);
            CREATE INDEX IF NOT EXISTS idx_page_items_nb_sec ON page_items(notebook_id, section_id);

            CREATE VIRTUAL TABLE IF NOT EXISTS page_fts USING fts5(
                page_title,
                content,
                tags,
                ocr_text,
                content='page_items',
                content_rowid='id'
            );

            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS page_items_ai AFTER INSERT ON page_items BEGIN
                INSERT INTO page_fts(rowid, page_title, content, tags, ocr_text)
                VALUES (new.id, new.page_title, new.content, new.tags, new.ocr_text);
            END;

            CREATE TRIGGER IF NOT EXISTS page_items_ad AFTER DELETE ON page_items BEGIN
                INSERT INTO page_fts(page_fts, rowid, page_title, content, tags, ocr_text)
                VALUES('delete', old.id, old.page_title, old.content, old.tags, old.ocr_text);
            END;

            CREATE TRIGGER IF NOT EXISTS page_items_au AFTER UPDATE ON page_items BEGIN
                INSERT INTO page_fts(page_fts, rowid, page_title, content, tags, ocr_text)
                VALUES('delete', old.id, old.page_title, old.content, old.tags, old.ocr_text);
                INSERT INTO page_fts(rowid, page_title, content, tags, ocr_text)
                VALUES (new.id, new.page_title, new.content, new.tags, new.ocr_text);
            END;

            CREATE TABLE IF NOT EXISTS note_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notebook_id TEXT NOT NULL,
                section_id TEXT NOT NULL,
                section_title TEXT NOT NULL,
                section_color TEXT NOT NULL,
                page_id TEXT NOT NULL,
                page_title TEXT NOT NULL,
                item_id TEXT NOT NULL,
                tag_type TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                text TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_note_tags_page_id ON note_tags(page_id);
            CREATE INDEX IF NOT EXISTS idx_note_tags_nb_summary ON note_tags(notebook_id, tag_type, done, page_title);
            ",
        )?;

        Ok(())
    }

    pub fn index_page(
        &self,
        notebook_id: &str,
        section_id: &str,
        section_title: &str,
        section_color: &str,
        page_json: &serde_json::Value,
    ) -> Result<(), IndexError> {
        let mut conn = self.conn.lock().unwrap();

        let page_id = page_json
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let page_title = page_json
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Page");

        let tx = conn.transaction()?;

        // Clear existing entries for this page
        tx.execute(
            "DELETE FROM page_items WHERE page_id = ?1;",
            params![page_id],
        )?;
        tx.execute(
            "DELETE FROM note_tags WHERE page_id = ?1;",
            params![page_id],
        )?;

        if let Some(items) = page_json.get("items").and_then(|v| v.as_array()) {
            let mut insert_item_stmt = tx.prepare_cached(
                "INSERT INTO page_items (notebook_id, section_id, page_id, page_title, item_id, item_kind, content, tags, ocr_text)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
            )?;

            let mut insert_tag_stmt = tx.prepare_cached(
                "INSERT INTO note_tags (notebook_id, section_id, section_title, section_color, page_id, page_title, item_id, tag_type, done, text)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10);",
            )?;

            for item in items {
                let item_id = item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default();
                let kind = item
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");

                let mut content = String::new();
                let mut tags_str = String::new();
                let mut ocr_text = String::new();
                let mut collected_tags = Vec::new();

                match kind {
                    "container" => {
                        if let Some(doc) = item.get("doc") {
                            extract_doc_text_and_tags(
                                doc,
                                &mut content,
                                &mut tags_str,
                                &mut collected_tags,
                            );
                        }
                    }
                    "image" => {
                        if let Some(alt) = item.get("alt").and_then(|v| v.as_str()) {
                            content.push_str(alt);
                        }
                        if let Some(ocr) = item.get("ocr").and_then(|v| v.as_str()) {
                            ocr_text.push_str(ocr);
                        }
                    }
                    "file" => {
                        if let Some(filename) = item.get("filename").and_then(|v| v.as_str()) {
                            content.push_str(filename);
                        }
                    }
                    "table" => {
                        if let Some(cells) = item.get("cells").and_then(|v| v.as_array()) {
                            for cell in cells {
                                if let Some(text) = cell.get("text").and_then(|v| v.as_str()) {
                                    content.push_str(text);
                                    content.push(' ');
                                }
                            }
                        }
                    }
                    "math" => {
                        if let Some(latex) = item.get("latex").and_then(|v| v.as_str()) {
                            content.push_str(latex);
                        }
                    }
                    _ => {}
                }

                for (tag_type, done, text) in collected_tags {
                    insert_tag_stmt.execute(params![
                        notebook_id,
                        section_id,
                        section_title,
                        section_color,
                        page_id,
                        page_title,
                        item_id,
                        tag_type,
                        if done { 1 } else { 0 },
                        text
                    ])?;
                }

                insert_item_stmt.execute(params![
                    notebook_id,
                    section_id,
                    page_id,
                    page_title,
                    item_id,
                    kind,
                    content,
                    tags_str,
                    ocr_text
                ])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn delete_page(&self, page_id: &str) -> Result<(), IndexError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM page_items WHERE page_id = ?1;",
            params![page_id],
        )?;
        conn.execute(
            "DELETE FROM note_tags WHERE page_id = ?1;",
            params![page_id],
        )?;
        Ok(())
    }

    pub fn search(&self, query: &str) -> Result<Vec<SearchResult>, IndexError> {
        let conn = self.conn.lock().unwrap();
        let safe_query = query.replace('"', "\"\"").trim().to_string();
        if safe_query.is_empty() {
            return Ok(Vec::new());
        }

        let fts_query = format!("\"{}\"*", safe_query);
        let mut stmt = conn.prepare(
            "SELECT p.notebook_id, p.section_id, p.page_id, p.page_title, p.item_kind,
                    snippet(page_fts, 1, '<mark>', '</mark>', '...', 12) AS snip,
                    bm25(page_fts) AS rank
             FROM page_fts f
             JOIN page_items p ON f.rowid = p.id
             WHERE page_fts MATCH ?1
             ORDER BY rank
             LIMIT 50;",
        )?;

        let rows = stmt.query_map(params![fts_query], |row| {
            Ok(SearchResult {
                notebook_id: row.get(0)?,
                section_id: row.get(1)?,
                page_id: row.get(2)?,
                page_title: row.get(3)?,
                item_kind: row.get(4)?,
                snippet: row.get(5)?,
                rank: row.get(6)?,
            })
        })?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    }

    pub fn get_tags_summary(&self, notebook_id: &str) -> Result<Vec<TagSummaryItem>, IndexError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT notebook_id, section_id, section_title, section_color,
                    page_id, page_title, tag_type, done, text
             FROM note_tags
             WHERE notebook_id = ?1
             ORDER BY tag_type, done, page_title;",
        )?;

        let rows = stmt.query_map(params![notebook_id], |row| {
            let done_int: i32 = row.get(7)?;
            Ok(TagSummaryItem {
                notebook_id: row.get(0)?,
                section_id: row.get(1)?,
                section_title: row.get(2)?,
                section_color: row.get(3)?,
                page_id: row.get(4)?,
                page_title: row.get(5)?,
                tag_type: row.get(6)?,
                done: done_int == 1,
                text: row.get(8)?,
            })
        })?;

        let mut items = Vec::new();
        for r in rows {
            items.push(r?);
        }
        Ok(items)
    }
}

fn extract_doc_text_and_tags(
    node: &serde_json::Value,
    content: &mut String,
    tags_str: &mut String,
    collected_tags: &mut Vec<(String, bool, String)>,
) {
    if let Some(text) = node.get("text").and_then(|v| v.as_str()) {
        content.push_str(text);
        content.push(' ');
    }

    if let Some(attrs) = node.get("attrs") {
        if let Some(tags) = attrs.get("tags").and_then(|v| v.as_array()) {
            for tag in tags {
                if let Some(ttype) = tag.get("type").and_then(|v| v.as_str()) {
                    let done = tag
                        .get("done")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    tags_str.push_str(ttype);
                    tags_str.push(' ');

                    // Extract text of this outline item
                    let mut item_text = String::new();
                    if let Some(c) = node.get("content").and_then(|v| v.as_array()) {
                        for inline in c {
                            if let Some(t) = inline.get("text").and_then(|v| v.as_str()) {
                                item_text.push_str(t);
                            }
                        }
                    }
                    collected_tags.push((ttype.to_string(), done, item_text));
                }
            }
        }
    }

    if let Some(children) = node.get("content").and_then(|v| v.as_array()) {
        for child in children {
            extract_doc_text_and_tags(child, content, tags_str, collected_tags);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fts5_indexing_and_snippet_search() {
        let index = SearchIndex::open_in_memory().unwrap();

        let page = serde_json::json!({
            "id": "page-01",
            "title": "Project Architecture",
            "items": [
                {
                    "id": "item-1",
                    "kind": "container",
                    "doc": {
                        "type": "doc",
                        "content": [
                            {
                                "type": "outlineItem",
                                "attrs": { "indent": 0, "tags": [{ "type": "todo", "done": false }] },
                                "content": [{ "type": "text", "text": "Implement SQLite FTS5 search index" }]
                            }
                        ]
                    }
                },
                {
                    "id": "item-2",
                    "kind": "image",
                    "alt": "Diagram",
                    "ocr": "High performance vector engine"
                }
            ]
        });

        index
            .index_page("nb-01", "sec-01", "Engineering", "#6366f1", &page)
            .unwrap();

        // 1. Search text content
        let results = index.search("SQLite").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].page_title, "Project Architecture");
        assert!(results[0].snippet.contains("<mark>SQLite</mark>"));

        // 2. Search OCR text
        let ocr_results = index.search("vector").unwrap();
        assert_eq!(ocr_results.len(), 1);
        assert_eq!(ocr_results[0].item_kind, "image");

        // 3. Tag summary
        let tags = index.get_tags_summary("nb-01").unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].tag_type, "todo");
        assert_eq!(tags[0].done, false);
        assert_eq!(tags[0].text, "Implement SQLite FTS5 search index");

        // 4. Delete page and verify index cleanup
        index.delete_page("page-01").unwrap();
        let empty_search = index.search("SQLite").unwrap();
        assert!(empty_search.is_empty());
        let empty_tags = index.get_tags_summary("nb-01").unwrap();
        assert!(empty_tags.is_empty());
    }
}
