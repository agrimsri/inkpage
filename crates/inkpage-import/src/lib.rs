pub mod archive;
pub mod converter;
pub mod ir;
pub mod mapper;

use archive::{extract_cab, extract_zip};
use converter::{ExportFormat, export_imported_notebook};
pub use ir::*;
pub use mapper::Mapper;
use std::path::{Path, PathBuf};
use std::time::Instant;
use tempfile::tempdir;
use thiserror::Error;
use typed_path::TypedPath;
use walkdir::WalkDir;

#[derive(Debug, Error)]
pub enum ImportError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Archive error: {0}")]
    Archive(#[from] archive::ArchiveError),
    #[error("Parser error: {0}")]
    Parser(String),
    #[error("Export error: {0}")]
    Export(String),
    #[error("Invalid input path: {0}")]
    InvalidPath(String),
}

pub struct ImportOptions {
    pub output_dir: PathBuf,
    pub format: ExportFormat,
    pub notebook_title_override: Option<String>,
}

/// Imports any supported OneNote input: folder, .one, .onetoc2, .onepkg, or .zip
pub fn import_file(
    input_path: &Path,
    options: &ImportOptions,
) -> Result<(ImportedNotebook, ImportReport), ImportError> {
    let start_time = Instant::now();

    if !input_path.exists() {
        return Err(ImportError::InvalidPath(format!(
            "File or directory does not exist: {}",
            input_path.display()
        )));
    }

    let ext = input_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mut mapper = Mapper::new();

    let (mut imported, title) = if input_path.is_dir() {
        // Look for .onetoc2 inside directory
        let toc_file = find_file_with_ext(input_path, "onetoc2");
        let dir_title = input_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Notebook");

        if let Some(toc) = toc_file {
            let nb = inkpage_onestore::parse_notebook_file(&toc)
                .map_err(|e| ImportError::Parser(e.to_string()))?;
            let title = options
                .notebook_title_override
                .clone()
                .unwrap_or_else(|| dir_title.to_string());
            (mapper.map_notebook(&nb, &title), title)
        } else {
            // Find all .one files in directory and import as sections
            let mut sections = Vec::new();
            let mut sec_ids = Vec::new();
            let title = options
                .notebook_title_override
                .clone()
                .unwrap_or_else(|| dir_title.to_string());

            for entry in WalkDir::new(input_path).into_iter().filter_map(|e| e.ok()) {
                let p = entry.path();
                if p.is_file() && p.extension().map_or(false, |e| e == "one") {
                    if let Ok(sec) = inkpage_onestore::parse_section_file(p) {
                        let mapped = mapper.map_section(&sec, None);
                        sec_ids.push(mapped.id.clone());
                        sections.push(mapped);
                    }
                }
            }

            let report = ImportReport {
                notebook_title: title.clone(),
                sections_count: sections.len(),
                pages_count: sections.iter().map(|s| s.pages.len()).sum(),
                items_count: 0,
                images_count: 0,
                attachments_count: 0,
                ink_strokes_count: 0,
                unmapped_property_ids: vec![],
                warnings: vec![],
                duration_ms: 0,
            };

            let nb = ImportedNotebook {
                schema: 1,
                id: ulid::Ulid::new().to_string(),
                title: title.as_str().into(),
                section_order: sec_ids,
                sections,
                created: "2026-11-12T10:00:00Z".to_string(),
                modified: "2026-11-12T10:00:00Z".to_string(),
                report,
            };
            (nb, title)
        }
    } else if ext == "onetoc2" {
        let title = options
            .notebook_title_override
            .clone()
            .or_else(|| {
                input_path
                    .parent()
                    .and_then(|p| p.file_name())
                    .and_then(|n| n.to_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "Notebook".to_string());

        let nb = inkpage_onestore::parse_notebook_file(input_path)
            .map_err(|e| ImportError::Parser(e.to_string()))?;
        (mapper.map_notebook(&nb, &title), title)
    } else if ext == "one" {
        let sec_title = input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Section");
        let nb_title = options
            .notebook_title_override
            .clone()
            .unwrap_or_else(|| format!("{} Notebook", sec_title));

        let sec = inkpage_onestore::parse_section_file(input_path)
            .map_err(|e| ImportError::Parser(e.to_string()))?;
        let mapped_sec = mapper.map_section(&sec, None);
        let sec_id = mapped_sec.id.clone();

        let nb = ImportedNotebook {
            schema: 1,
            id: ulid::Ulid::new().to_string(),
            title: nb_title.as_str().into(),
            section_order: vec![sec_id],
            sections: vec![mapped_sec],
            created: "2026-11-12T10:00:00Z".to_string(),
            modified: "2026-11-12T10:00:00Z".to_string(),
            report: ImportReport::default(),
        };
        (nb, nb_title)
    } else if ext == "onepkg" {
        let pkg_title = input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Notebook");
        let title = options
            .notebook_title_override
            .clone()
            .unwrap_or_else(|| pkg_title.to_string());

        let temp_dir = tempdir()?;
        extract_cab(input_path, temp_dir.path())?;

        let toc_file = find_file_with_ext(temp_dir.path(), "onetoc2");
        if let Some(toc) = toc_file {
            let nb = inkpage_onestore::parse_notebook_file(&toc)
                .map_err(|e| ImportError::Parser(e.to_string()))?;
            (mapper.map_notebook(&nb, &title), title)
        } else {
            // Direct parser package fallback
            let parser = inkpage_onestore::Parser::new();
            let path_str = input_path.to_str().unwrap();
            let nb = parser
                .parse_package(TypedPath::derive(path_str))
                .map_err(|e| ImportError::Parser(e.to_string()))?;
            (mapper.map_notebook(&nb, &title), title)
        }
    } else if ext == "zip" {
        let zip_title = input_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Notebook");
        let title = options
            .notebook_title_override
            .clone()
            .unwrap_or_else(|| zip_title.to_string());

        let temp_dir = tempdir()?;
        extract_zip(input_path, temp_dir.path())?;

        let toc_file = find_file_with_ext(temp_dir.path(), "onetoc2");
        if let Some(toc) = toc_file {
            let nb = inkpage_onestore::parse_notebook_file(&toc)
                .map_err(|e| ImportError::Parser(e.to_string()))?;
            (mapper.map_notebook(&nb, &title), title)
        } else {
            return Err(ImportError::InvalidPath(
                "ZIP archive does not contain a .onetoc2 table of contents".into(),
            ));
        }
    } else {
        return Err(ImportError::InvalidPath(format!(
            "Unsupported file extension: .{}",
            ext
        )));
    };

    let elapsed = start_time.elapsed().as_millis() as u64;
    imported.report.duration_ms = elapsed;
    imported.report.notebook_title = title;

    // Export to chosen output directory
    export_imported_notebook(
        &imported,
        &mapper.assets,
        &options.output_dir,
        options.format,
    )
    .map_err(|e| ImportError::Export(e.to_string()))?;

    let report = imported.report.clone();
    Ok((imported, report))
}

fn find_file_with_ext(dir: &Path, target_ext: &str) -> Option<PathBuf> {
    for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        if p.is_file() {
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                if ext.eq_ignore_ascii_case(target_ext) {
                    return Some(p.to_path_buf());
                }
            }
        }
    }
    None
}
