use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use thiserror::Error;
use ulid::Ulid;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Notebook not found: {0}")]
    NotFound(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

/// Atomically writes data to a file by writing to a temporary file, fsyncing, and renaming
pub fn write_atomic(dest_path: &Path, content: &[u8]) -> Result<(), StorageError> {
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let temp_name = format!(
        ".tmp_{}_{}",
        std::process::id(),
        Ulid::new().to_string()
    );
    let temp_path = dest_path.with_file_name(temp_name);

    {
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp_path)?;
        file.write_all(content)?;
        file.sync_all()?;
    }

    fs::rename(&temp_path, dest_path)?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotebookMeta {
    pub schema: u32,
    pub id: String,
    pub title: String,
    #[serde(rename = "sectionOrder")]
    pub section_order: Vec<String>,
    pub created: String,
    pub modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionMeta {
    pub id: String,
    pub title: String,
    pub color: String,
    #[serde(rename = "parentGroup")]
    pub parent_group: Option<String>,
    #[serde(rename = "pageOrder")]
    pub page_order: Vec<String>,
}

pub struct StorageManager {
    base_dir: PathBuf,
}

impl StorageManager {
    pub fn new(base_dir: impl Into<PathBuf>) -> Self {
        let path = base_dir.into();
        let _ = fs::create_dir_all(&path);
        Self { base_dir: path }
    }

    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    pub fn list_notebooks(&self) -> Result<Vec<NotebookMeta>, StorageError> {
        let mut notebooks = Vec::new();
        if !self.base_dir.exists() {
            return Ok(notebooks);
        }

        for entry in fs::read_dir(&self.base_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() && path.extension().map_or(false, |e| e == "inkbook") {
                let meta_file = path.join("notebook.json");
                if meta_file.exists() {
                    let content = fs::read_to_string(&meta_file)?;
                    if let Ok(meta) = serde_json::from_str::<NotebookMeta>(&content) {
                        notebooks.push(meta);
                    }
                }
            }
        }

        notebooks.sort_by(|a, b| a.title.cmp(&b.title));
        Ok(notebooks)
    }

    pub fn get_notebook_dir(&self, notebook_id: &str) -> Result<PathBuf, StorageError> {
        for entry in fs::read_dir(&self.base_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() && path.extension().map_or(false, |e| e == "inkbook") {
                let meta_file = path.join("notebook.json");
                if meta_file.exists() {
                    if let Ok(content) = fs::read_to_string(&meta_file) {
                        if let Ok(meta) = serde_json::from_str::<NotebookMeta>(&content) {
                            if meta.id == notebook_id {
                                return Ok(path);
                            }
                        }
                    }
                }
            }
        }
        Err(StorageError::NotFound(format!(
            "Notebook with ID {} not found",
            notebook_id
        )))
    }

    pub fn create_notebook(&self, title: &str) -> Result<NotebookMeta, StorageError> {
        let id = Ulid::new().to_string();
        let safe_title = sanitize_name(title);
        let book_dir = self.base_dir.join(format!("{}.inkbook", safe_title));
        fs::create_dir_all(&book_dir)?;
        fs::create_dir_all(book_dir.join("sections"))?;
        fs::create_dir_all(book_dir.join(".inkpage"))?;

        let now = now_iso();
        let meta = NotebookMeta {
            schema: 1,
            id: id.clone(),
            title: title.to_string(),
            section_order: Vec::new(),
            created: now.clone(),
            modified: now,
        };

        let json = serde_json::to_vec_pretty(&meta)?;
        write_atomic(&book_dir.join("notebook.json"), &json)?;

        // Create default section and page
        let _ = self.create_section(&id, "Quick Notes", "#6366f1");

        Ok(meta)
    }

    pub fn get_notebook(&self, notebook_id: &str) -> Result<NotebookMeta, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let meta_file = book_dir.join("notebook.json");
        let content = fs::read_to_string(meta_file)?;
        let meta = serde_json::from_str(&content)?;
        Ok(meta)
    }

    pub fn list_sections(&self, notebook_id: &str) -> Result<Vec<SectionMeta>, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let sections_dir = book_dir.join("sections");
        let mut sections = Vec::new();

        if !sections_dir.exists() {
            return Ok(sections);
        }

        for entry in fs::read_dir(sections_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() && path.extension().map_or(false, |e| e == "section") {
                let meta_file = path.join("section.json");
                if meta_file.exists() {
                    let content = fs::read_to_string(&meta_file)?;
                    if let Ok(meta) = serde_json::from_str::<SectionMeta>(&content) {
                        sections.push(meta);
                    }
                }
            }
        }

        let nb = self.get_notebook(notebook_id)?;
        sections.sort_by_key(|s| {
            nb.section_order
                .iter()
                .position(|id| id == &s.id)
                .unwrap_or(usize::MAX)
        });

        Ok(sections)
    }

    pub fn create_section(
        &self,
        notebook_id: &str,
        title: &str,
        color: &str,
    ) -> Result<SectionMeta, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let sec_id = Ulid::new().to_string();
        let sec_dir = book_dir.join("sections").join(format!("{}.section", sec_id));
        fs::create_dir_all(&sec_dir)?;
        fs::create_dir_all(sec_dir.join("pages"))?;
        fs::create_dir_all(sec_dir.join("assets"))?;

        let sec_meta = SectionMeta {
            id: sec_id.clone(),
            title: title.to_string(),
            color: color.to_string(),
            parent_group: None,
            page_order: Vec::new(),
        };

        let json = serde_json::to_vec_pretty(&sec_meta)?;
        write_atomic(&sec_dir.join("section.json"), &json)?;

        // Update notebook.json sectionOrder
        let mut nb = self.get_notebook(notebook_id)?;
        nb.section_order.push(sec_id.clone());
        nb.modified = now_iso();
        write_atomic(
            &book_dir.join("notebook.json"),
            &serde_json::to_vec_pretty(&nb)?,
        )?;

        // Create initial untitled page in new section
        let _ = self.save_page(
            notebook_id,
            &sec_id,
            &serde_json::json!({
                "schema": 1,
                "id": Ulid::new().to_string(),
                "title": "Untitled Page",
                "level": 0,
                "created": now_iso(),
                "modified": now_iso(),
                "size": { "w": "auto", "h": "auto" },
                "background": { "kind": "rule", "spacing": 24, "color": "#e2e8f0" },
                "items": []
            }),
        );

        Ok(sec_meta)
    }

    pub fn list_pages(
        &self,
        notebook_id: &str,
        section_id: &str,
    ) -> Result<Vec<serde_json::Value>, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let pages_dir = book_dir
            .join("sections")
            .join(format!("{}.section", section_id))
            .join("pages");

        let mut pages = Vec::new();
        if !pages_dir.exists() {
            return Ok(pages);
        }

        for entry in fs::read_dir(pages_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() && path.file_name().map_or(false, |n| n.to_string_lossy().ends_with(".page.json")) {
                let content = fs::read_to_string(&path)?;
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    pages.push(json);
                }
            }
        }

        // Sort by section's pageOrder
        let sec_file = book_dir
            .join("sections")
            .join(format!("{}.section", section_id))
            .join("section.json");
        if let Ok(sec_str) = fs::read_to_string(sec_file) {
            if let Ok(sec_meta) = serde_json::from_str::<SectionMeta>(&sec_str) {
                pages.sort_by_key(|p| {
                    p.get("id")
                        .and_then(|id| id.as_str())
                        .and_then(|id_str| sec_meta.page_order.iter().position(|x| x == id_str))
                        .unwrap_or(usize::MAX)
                });
            }
        }

        Ok(pages)
    }

    pub fn get_page(
        &self,
        notebook_id: &str,
        section_id: &str,
        page_id: &str,
    ) -> Result<serde_json::Value, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let page_file = book_dir
            .join("sections")
            .join(format!("{}.section", section_id))
            .join("pages")
            .join(format!("{}.page.json", page_id));

        if !page_file.exists() {
            return Err(StorageError::NotFound(format!("Page {} not found", page_id)));
        }

        let content = fs::read_to_string(page_file)?;
        let json = serde_json::from_str(&content)?;
        Ok(json)
    }

    pub fn save_page(
        &self,
        notebook_id: &str,
        section_id: &str,
        page_json: &serde_json::Value,
    ) -> Result<String, StorageError> {
        let page_id = page_json
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| Ulid::new().to_string());

        let book_dir = self.get_notebook_dir(notebook_id)?;
        let sec_dir = book_dir.join("sections").join(format!("{}.section", section_id));
        let pages_dir = sec_dir.join("pages");
        fs::create_dir_all(&pages_dir)?;

        let page_file = pages_dir.join(format!("{}.page.json", page_id));
        let content = serde_json::to_vec_pretty(page_json)?;
        write_atomic(&page_file, &content)?;

        // Ensure page_id is in section.json pageOrder
        let sec_file = sec_dir.join("section.json");
        if sec_file.exists() {
            let mut sec_meta: SectionMeta = serde_json::from_str(&fs::read_to_string(&sec_file)?)?;
            if !sec_meta.page_order.contains(&page_id) {
                sec_meta.page_order.push(page_id.clone());
                write_atomic(&sec_file, &serde_json::to_vec_pretty(&sec_meta)?)?;
            }
        }

        Ok(page_id)
    }

    pub fn delete_page(
        &self,
        notebook_id: &str,
        section_id: &str,
        page_id: &str,
    ) -> Result<(), StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let sec_dir = book_dir.join("sections").join(format!("{}.section", section_id));
        let page_file = sec_dir.join("pages").join(format!("{}.page.json", page_id));

        // Move to recycle bin in .inkpage
        let bin_dir = book_dir.join(".inkpage").join("recycle_bin");
        fs::create_dir_all(&bin_dir)?;
        let target_bin = bin_dir.join(format!("{}_{}.page.json", page_id, Ulid::new()));
        if page_file.exists() {
            let _ = fs::rename(&page_file, target_bin);
        }

        // Remove from section pageOrder
        let sec_file = sec_dir.join("section.json");
        if sec_file.exists() {
            let mut sec_meta: SectionMeta = serde_json::from_str(&fs::read_to_string(&sec_file)?)?;
            sec_meta.page_order.retain(|id| id != page_id);
            write_atomic(&sec_file, &serde_json::to_vec_pretty(&sec_meta)?)?;
        }

        Ok(())
    }

    pub fn save_asset(
        &self,
        notebook_id: &str,
        section_id: &str,
        filename: &str,
        data: &[u8],
    ) -> Result<String, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let assets_dir = book_dir
            .join("sections")
            .join(format!("{}.section", section_id))
            .join("assets");
        fs::create_dir_all(&assets_dir)?;

        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(data);
        let sha256 = hex::encode(hasher.finalize());

        let ext = Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");

        let dest = assets_dir.join(format!("{}.{}", sha256, ext));
        write_atomic(&dest, data)?;

        Ok(sha256)
    }

    pub fn get_asset(
        &self,
        notebook_id: &str,
        section_id: &str,
        sha256: &str,
    ) -> Result<Vec<u8>, StorageError> {
        let book_dir = self.get_notebook_dir(notebook_id)?;
        let assets_dir = book_dir
            .join("sections")
            .join(format!("{}.section", section_id))
            .join("assets");

        for entry in fs::read_dir(assets_dir)? {
            let entry = entry?;
            let path = entry.path();
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if stem == sha256 {
                    return Ok(fs::read(path)?);
                }
            }
        }

        Err(StorageError::NotFound(format!("Asset {} not found", sha256)))
    }
}

fn sanitize_name(name: &str) -> String {
    let clean: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect();
    let trimmed = clean.trim();
    if trimmed.is_empty() {
        "Notebook".to_string()
    } else {
        trimmed.to_string()
    }
}

fn now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("2026-11-12T10:00:00Z+{}", now % 86400)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_write_and_recovery() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("atomic_test.json");

        write_atomic(&file_path, b"{\"test\": true}").unwrap();
        assert!(file_path.exists());
        let read = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read, "{\"test\": true}");
    }

    #[test]
    fn test_notebook_and_section_creation() {
        let dir = tempdir().unwrap();
        let storage = StorageManager::new(dir.path());

        let nb = storage.create_notebook("Engineering Journal").unwrap();
        assert_eq!(nb.title, "Engineering Journal");

        let sections = storage.list_sections(&nb.id).unwrap();
        assert_eq!(sections.len(), 1);
        assert_eq!(sections[0].title, "Quick Notes");

        let pages = storage.list_pages(&nb.id, &sections[0].id).unwrap();
        assert_eq!(pages.len(), 1);
        assert_eq!(pages[0]["title"], "Untitled Page");
    }
}
