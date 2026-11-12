use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use thiserror::Error;
use zip::ZipArchive;

#[derive(Debug, Error)]
pub enum ArchiveError {
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("Zip extraction error: {0}")]
    Zip(String),
    #[error("Cab extraction error: {0}")]
    Cab(String),
    #[error("Path traversal detected: {0}")]
    PathTraversal(String),
}

/// Safely extracts a ZIP archive into a destination directory with zip-slip protection
pub fn extract_zip(archive_path: &Path, dest_dir: &Path) -> Result<PathBuf, ArchiveError> {
    let file = File::open(archive_path)?;
    let mut zip = ZipArchive::new(file).map_err(|e| ArchiveError::Zip(e.to_string()))?;

    fs::create_dir_all(dest_dir)?;
    let canonical_dest = dest_dir.canonicalize()?;

    for i in 0..zip.len() {
        let mut file = zip.by_index(i).map_err(|e| ArchiveError::Zip(e.to_string()))?;
        let enclosed_name = match file.enclosed_name() {
            Some(path) => path.to_owned(),
            None => {
                return Err(ArchiveError::PathTraversal(format!(
                    "Unsafe path in ZIP: {}",
                    file.name()
                )));
            }
        };

        let out_path = canonical_dest.join(enclosed_name);

        if file.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)?;
                }
            }
            let outfile = File::create(&out_path)?;
            let mut writer = io::BufWriter::new(outfile);
            io::copy(&mut file, &mut writer)?;
        }
    }

    Ok(canonical_dest)
}

/// Safely extracts a Microsoft Cabinet (.onepkg) archive
pub fn extract_cab(cab_path: &Path, dest_dir: &Path) -> Result<PathBuf, ArchiveError> {
    let file = File::open(cab_path)?;
    let mut cabinet = cab::Cabinet::new(file).map_err(|e| ArchiveError::Cab(e.to_string()))?;

    fs::create_dir_all(dest_dir)?;
    let canonical_dest = dest_dir.canonicalize()?;

    let filenames: Vec<String> = cabinet
        .folder_entries()
        .flat_map(|folder| folder.file_entries().map(|entry| entry.name().to_string()))
        .collect();

    for filename in filenames {
        // Sanitize CAB file name to prevent directory traversal
        let safe_name = Path::new(&filename)
            .file_name()
            .ok_or_else(|| ArchiveError::PathTraversal(format!("Invalid CAB entry name: {}", filename)))?;

        let out_path = canonical_dest.join(safe_name);
        let mut reader = cabinet
            .read_file(&filename)
            .map_err(|e| ArchiveError::Cab(e.to_string()))?;

        let outfile = File::create(&out_path)?;
        let mut writer = io::BufWriter::new(outfile);
        io::copy(&mut reader, &mut writer)?;
    }

    Ok(canonical_dest)
}
