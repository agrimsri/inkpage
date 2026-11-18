use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type Id = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedNotebook {
    pub schema: u32,
    pub id: Id,
    pub title: string_or_default::StringOrDefault,
    pub section_order: Vec<Id>,
    pub sections: Vec<ImportedSection>,
    pub created: String,
    pub modified: String,
    pub report: ImportReport,
}

mod string_or_default {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Debug, Clone, PartialEq, Eq)]
    pub struct StringOrDefault(pub String);

    impl Serialize for StringOrDefault {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
        {
            self.0.serialize(serializer)
        }
    }

    impl<'de> Deserialize<'de> for StringOrDefault {
        fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
        {
            let s = String::deserialize(deserializer)?;
            Ok(StringOrDefault(s))
        }
    }

    impl From<&str> for StringOrDefault {
        fn from(s: &str) -> Self {
            StringOrDefault(s.to_string())
        }
    }

    impl From<String> for StringOrDefault {
        fn from(s: String) -> Self {
            StringOrDefault(s)
        }
    }

    impl std::ops::Deref for StringOrDefault {
        type Target = str;
        fn deref(&self) -> &Self::Target {
            &self.0
        }
    }
}

pub use string_or_default::StringOrDefault;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedSection {
    pub id: Id,
    pub title: String,
    pub color: String,
    pub parent_group: Option<Id>,
    pub page_order: Vec<Id>,
    pub pages: Vec<ImportedPage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageBackground {
    pub kind: String, // "none" | "rule" | "grid" | "image"
    pub spacing: Option<f32>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageSize {
    pub w: String, // e.g. "auto" or number
    pub h: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedPage {
    pub schema: u32,
    pub id: Id,
    pub title: String,
    pub parent_page: Option<Id>,
    pub level: u8, // 0 | 1 | 2
    pub created: String,
    pub modified: String,
    pub size: PageSize,
    pub background: Option<PageBackground>,
    pub items: Vec<ImportedItem>,
    pub meta: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ImportedItem {
    #[serde(rename = "container")]
    Container(ContainerItem),
    #[serde(rename = "ink")]
    Ink(InkGroupItem),
    #[serde(rename = "image")]
    Image(ImageItem),
    #[serde(rename = "file")]
    File(FileItem),
    #[serde(rename = "table")]
    Table(TableItem),
    #[serde(rename = "math")]
    Math(MathItem),
    #[serde(rename = "shape")]
    Shape(ShapeItem),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoxCoords {
    pub id: Id,
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub z: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteTag {
    #[serde(rename = "type")]
    pub tag_type: String, // "todo" | "important" | "question"
    pub done: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PMOutlineAttrs {
    pub indent: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<NoteTag>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bullet_style: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PMNode {
    #[serde(rename = "type")]
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attrs: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<PMNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub marks: Option<Vec<PMMark>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PMMark {
    #[serde(rename = "type")]
    pub mark_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attrs: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub doc: PMNode,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "isWidthSetByUser")]
    pub is_width_set_by_user: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stroke {
    pub id: Id,
    pub tool: String, // "pen" | "highlighter" | "pencil"
    pub color: String,
    pub width: f32,
    pub pts: Vec<StrokePoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrokePoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tilt: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub t: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InkGroupItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub strokes: Vec<Stroke>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub asset: String, // sha256
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ocr: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub asset: String, // sha256
    pub filename: String,
    pub mime: String,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableCellItem {
    pub row: usize,
    pub col: usize,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub rows: usize,
    pub cols: usize,
    pub cells: Vec<TableCellItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MathItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub latex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapeItem {
    #[serde(flatten)]
    pub coords: BoxCoords,
    pub shape_type: String,
    pub stroke_color: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fill_color: Option<String>,
    pub stroke_width: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedAsset {
    pub sha256: String,
    pub ext: String,
    pub mime: String,
    pub filename: String,
    #[serde(skip)]
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ImportWarning {
    pub code: String,
    pub message: String,
    pub context: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ImportReport {
    pub notebook_title: String,
    pub sections_count: usize,
    pub pages_count: usize,
    pub items_count: usize,
    pub images_count: usize,
    pub attachments_count: usize,
    pub ink_strokes_count: usize,
    pub unmapped_property_ids: Vec<String>,
    pub warnings: Vec<ImportWarning>,
    pub duration_ms: u64,
}
