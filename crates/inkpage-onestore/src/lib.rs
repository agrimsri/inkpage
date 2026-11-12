use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;
use typed_path::TypedPath;
use uuid::Uuid;

pub use onenote_parser::{
    FileSystem, Parser, contents, notebook, page, section,
    contents::{
        EmbeddedFile, Image, Ink, InkBoundingBox, InkPoint, InkStroke, List, MathInlineObject,
        NoteTag, Outline, OutlineElement, OutlineItem, Picture, RichText, Table, TableCell,
        TableRow,
    },
    notebook::Notebook,
    page::Page,
    section::{Section, SectionEntry, SectionGroup},
};

/// GUID constant for .one section files: {7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}
pub const ONE_SECTION_GUID: [u8; 16] = [
    0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D, 0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96,
    0xD3,
];

/// GUID constant for .onetoc2 TOC files: {43FF2FA1-EFD9-4C76-9EE2-10EA5722765F}
pub const ONETOC2_GUID: [u8; 16] = [
    0xA1, 0x2F, 0xFF, 0x43, 0xD9, 0xEF, 0x76, 0x4C, 0x9E, 0xE2, 0x10, 0xEA, 0x57, 0x22, 0x76,
    0x5F,
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileKind {
    Section,
    TableOfContents,
    Package,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderInfo {
    pub kind: FileKind,
    pub file_type_guid: Uuid,
    pub file_guid: Uuid,
    pub version: u32,
    pub transactions_in_log: u32,
}

#[derive(Debug, Error)]
pub enum OneStoreError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Parse error: {0}")]
    Parser(String),
    #[error("Invalid file header: {0}")]
    InvalidHeader(String),
}

/// Detects the OneNote file kind from magic bytes or header
pub fn detect_file_kind(bytes: &[u8]) -> FileKind {
    if bytes.len() >= 4 && &bytes[0..4] == b"MSCF" {
        return FileKind::Package; // Microsoft Cabinet format (.onepkg)
    }

    if bytes.len() >= 16 {
        if &bytes[0..16] == &ONE_SECTION_GUID {
            return FileKind::Section;
        }
        if &bytes[0..16] == &ONETOC2_GUID {
            return FileKind::TableOfContents;
        }
    }

    FileKind::Unknown
}

/// Inspects the header of a .one or .onetoc2 file
pub fn inspect_header(bytes: &[u8]) -> Result<HeaderInfo, OneStoreError> {
    if bytes.len() < 1024 {
        return Err(OneStoreError::InvalidHeader(
            "File is smaller than the 1024-byte MS-ONESTORE header".into(),
        ));
    }

    let kind = detect_file_kind(bytes);
    if kind == FileKind::Package {
        return Ok(HeaderInfo {
            kind,
            file_type_guid: Uuid::nil(),
            file_guid: Uuid::nil(),
            version: 0,
            transactions_in_log: 0,
        });
    }

    let file_type_guid = Uuid::from_slice_le(&bytes[0..16])
        .map_err(|e| OneStoreError::InvalidHeader(e.to_string()))?;
    let file_guid = Uuid::from_slice_le(&bytes[16..32])
        .map_err(|e| OneStoreError::InvalidHeader(e.to_string()))?;

    let version = u32::from_le_bytes(bytes[64..68].try_into().unwrap());
    let transactions_in_log = u32::from_le_bytes(bytes[88..92].try_into().unwrap());

    Ok(HeaderInfo {
        kind,
        file_type_guid,
        file_guid,
        version,
        transactions_in_log,
    })
}

/// Parses a OneNote notebook starting from a .onetoc2 file
pub fn parse_notebook_file(path: &Path) -> Result<Notebook, OneStoreError> {
    let parser = Parser::new();
    let path_str = path.to_str().ok_or_else(|| {
        OneStoreError::Parser("Path contains non-UTF8 characters".to_string())
    })?;
    parser
        .parse_notebook(TypedPath::derive(path_str))
        .map_err(|e| OneStoreError::Parser(e.to_string()))
}

/// Parses a single OneNote .one section file
pub fn parse_section_file(path: &Path) -> Result<Section, OneStoreError> {
    let parser = Parser::new();
    let path_str = path.to_str().ok_or_else(|| {
        OneStoreError::Parser("Path contains non-UTF8 characters".to_string())
    })?;
    parser
        .parse_section(TypedPath::derive(path_str))
        .map_err(|e| OneStoreError::Parser(e.to_string()))
}

/// Parses a OneNote .onepkg package archive
pub fn parse_package_file(path: &Path) -> Result<Notebook, OneStoreError> {
    let parser = Parser::new();
    let path_str = path.to_str().ok_or_else(|| {
        OneStoreError::Parser("Path contains non-UTF8 characters".to_string())
    })?;
    parser
        .parse_package(TypedPath::derive(path_str))
        .map_err(|e| OneStoreError::Parser(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_magic_guids() {
        assert_eq!(detect_file_kind(&ONE_SECTION_GUID), FileKind::Section);
        assert_eq!(detect_file_kind(&ONETOC2_GUID), FileKind::TableOfContents);
        assert_eq!(detect_file_kind(b"MSCFsomecabheader"), FileKind::Package);
        assert_eq!(detect_file_kind(b"randombytesdata"), FileKind::Unknown);
    }

    #[test]
    fn test_inspect_synthetic_header() {
        let mut header = vec![0u8; 1024];
        header[0..16].copy_from_slice(&ONE_SECTION_GUID);
        header[64..68].copy_from_slice(&42u32.to_le_bytes()); // 0x2A
        header[88..92].copy_from_slice(&7u32.to_le_bytes()); // 7 transactions

        let info = inspect_header(&header).expect("valid header");
        assert_eq!(info.kind, FileKind::Section);
        assert_eq!(info.version, 42);
        assert_eq!(info.transactions_in_log, 7);
    }
}
