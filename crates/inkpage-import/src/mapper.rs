use crate::ir::*;
use hex;
use inkpage_onestore::{
    EmbeddedFile, Image, Ink, Notebook, Outline, OutlineItem, Page, RichText, Section,
    SectionEntry,
};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::Read;
use ulid::Ulid;

pub struct Mapper {
    pub assets: HashMap<String, ImportedAsset>,
    pub warnings: Vec<ImportWarning>,
    pub unmapped_props: Vec<String>,
}

impl Mapper {
    pub fn new() -> Self {
        Self {
            assets: HashMap::new(),
            warnings: Vec::new(),
            unmapped_props: Vec::new(),
        }
    }

    pub fn map_notebook(
        &mut self,
        notebook: &Notebook,
        fallback_title: &str,
    ) -> ImportedNotebook {
        let notebook_id = Ulid::new().to_string();
        let mut section_ids = Vec::new();
        let mut sections = Vec::new();

        for entry in notebook.entries() {
            self.map_section_entry(entry, None, &mut section_ids, &mut sections);
        }

        let total_pages: usize = sections.iter().map(|s| s.pages.len()).sum();
        let total_items: usize = sections
            .iter()
            .flat_map(|s| &s.pages)
            .map(|p| p.items.len())
            .sum();

        let report = ImportReport {
            notebook_title: fallback_title.to_string(),
            sections_count: sections.len(),
            pages_count: total_pages,
            items_count: total_items,
            images_count: self.assets.values().filter(|a| a.mime.starts_with("image/")).count(),
            attachments_count: self.assets.values().filter(|a| !a.mime.starts_with("image/")).count(),
            ink_strokes_count: sections
                .iter()
                .flat_map(|s| &s.pages)
                .flat_map(|p| &p.items)
                .map(|item| match item {
                    ImportedItem::Ink(g) => g.strokes.len(),
                    _ => 0,
                })
                .sum(),
            unmapped_property_ids: self.unmapped_props.clone(),
            warnings: self.warnings.clone(),
            duration_ms: 0,
        };

        ImportedNotebook {
            schema: 1,
            id: notebook_id,
            title: fallback_title.into(),
            section_order: section_ids,
            sections,
            created: chrono_now_iso(),
            modified: chrono_now_iso(),
            report,
        }
    }

    fn map_section_entry(
        &mut self,
        entry: &SectionEntry,
        parent_group: Option<Id>,
        section_ids: &mut Vec<Id>,
        sections: &mut Vec<ImportedSection>,
    ) {
        match entry {
            SectionEntry::Section(sec) => {
                let mapped = self.map_section(sec, parent_group);
                section_ids.push(mapped.id.clone());
                sections.push(mapped);
            }
            SectionEntry::SectionGroup(group) => {
                let group_id = Ulid::new().to_string();
                for sub_entry in group.entries() {
                    self.map_section_entry(sub_entry, Some(group_id.clone()), section_ids, sections);
                }
            }
        }
    }

    pub fn map_section(
        &mut self,
        section: &Section,
        parent_group: Option<Id>,
    ) -> ImportedSection {
        let sec_id = Ulid::new().to_string();
        let color_hex = section
            .color()
            .map(|c| format!("#{:02x}{:02x}{:02x}", c.r(), c.g(), c.b()))
            .unwrap_or_else(|| "#6366f1".to_string());

        let mut page_order = Vec::new();
        let mut pages = Vec::new();

        for series in section.page_series() {
            for page in series.pages() {
                let mapped_page = self.map_page(page);
                page_order.push(mapped_page.id.clone());
                pages.push(mapped_page);
            }
        }

        ImportedSection {
            id: sec_id,
            title: section.display_name().to_string(),
            color: color_hex,
            parent_group,
            page_order,
            pages,
        }
    }

    pub fn map_page(&mut self, page: &Page) -> ImportedPage {
        let page_id = Ulid::new().to_string();
        let title = page
            .title_text()
            .unwrap_or_else(|| "Untitled Page")
            .to_string();

        let level = (page.level().clamp(0, 2)) as u8;
        let created = format!("{:?}", page.created_time());
        let modified = format!("{:?}", page.updated_time());

        let mut items = Vec::new();

        for content in page.contents() {
            match content {
                inkpage_onestore::page::PageContent::Outline(outline) => {
                    if let Some(container) = self.map_outline(outline) {
                        items.push(ImportedItem::Container(container));
                    }
                }
                inkpage_onestore::page::PageContent::Image(img) => {
                    if let Some(item) = self.map_image(img) {
                        items.push(ImportedItem::Image(item));
                    }
                }
                inkpage_onestore::page::PageContent::EmbeddedFile(file) => {
                    if let Some(item) = self.map_embedded_file(file) {
                        items.push(ImportedItem::File(item));
                    }
                }
                inkpage_onestore::page::PageContent::Ink(ink) => {
                    if let Some(item) = self.map_ink(ink) {
                        items.push(ImportedItem::Ink(item));
                    }
                }
                inkpage_onestore::page::PageContent::Unknown => {
                    self.unmapped_props.push("PageContent::Unknown".to_string());
                }
            }
        }

        ImportedPage {
            schema: 1,
            id: page_id,
            title,
            parent_page: None,
            level,
            created,
            modified,
            size: PageSize {
                w: "auto".to_string(),
                h: "auto".to_string(),
            },
            background: Some(PageBackground {
                kind: "rule".to_string(),
                spacing: Some(24.0),
                color: Some("#e2e8f0".to_string()),
            }),
            items,
            meta: HashMap::new(),
        }
    }

    fn map_outline(&mut self, outline: &Outline) -> Option<ContainerItem> {
        let x = outline.offset_horizontal().unwrap_or(1.0) * 48.0;
        let y = outline.offset_vertical().unwrap_or(2.0) * 48.0;
        let w = outline.layout_max_width().unwrap_or(14.0) * 48.0;
        let h = outline.layout_max_height().unwrap_or(8.0) * 48.0;

        let mut doc_nodes = Vec::new();

        for item in outline.items() {
            self.map_outline_item(item, 0, &mut doc_nodes);
        }

        if doc_nodes.is_empty() {
            doc_nodes.push(PMNode {
                node_type: "outlineItem".to_string(),
                attrs: Some(serde_json::json!({ "indent": 0 })),
                content: Some(vec![PMNode {
                    node_type: "text".to_string(),
                    attrs: None,
                    content: None,
                    text: Some("".to_string()),
                    marks: None,
                }]),
                text: None,
                marks: None,
            });
        }

        let doc = PMNode {
            node_type: "doc".to_string(),
            attrs: None,
            content: Some(doc_nodes),
            text: None,
            marks: None,
        };

        Some(ContainerItem {
            coords: BoxCoords {
                id: Ulid::new().to_string(),
                x: x.max(40.0),
                y: y.max(40.0),
                w: w.max(300.0),
                h: h.max(100.0),
                z: 1,
            },
            doc,
            is_width_set_by_user: None,
        })
    }

    fn map_outline_item(
        &mut self,
        item: &OutlineItem,
        current_indent: i32,
        doc_nodes: &mut Vec<PMNode>,
    ) {
        match item {
            OutlineItem::Element(elem) => {
                let mut inline_nodes = Vec::new();

                for content in elem.contents() {
                    match content {
                        inkpage_onestore::contents::Content::RichText(rt) => {
                            self.map_rich_text(rt, &mut inline_nodes);
                        }
                        inkpage_onestore::contents::Content::Table(tbl) => {
                            inline_nodes.push(PMNode {
                                node_type: "text".to_string(),
                                attrs: None,
                                content: None,
                                text: Some(format!("[Table: {}x{}]", tbl.rows(), tbl.cols())),
                                marks: None,
                            });
                        }
                        _ => {}
                    }
                }

                if inline_nodes.is_empty() {
                    inline_nodes.push(PMNode {
                        node_type: "text".to_string(),
                        attrs: None,
                        content: None,
                        text: Some("".to_string()),
                        marks: None,
                    });
                }

                let indent = current_indent + (elem.child_level() as i32);
                doc_nodes.push(PMNode {
                    node_type: "outlineItem".to_string(),
                    attrs: Some(serde_json::json!({
                        "indent": indent,
                    })),
                    content: Some(inline_nodes),
                    text: None,
                    marks: None,
                });

                for child in elem.children() {
                    self.map_outline_item(child, indent + 1, doc_nodes);
                }
            }
            OutlineItem::Group(group) => {
                let group_indent = current_indent + (group.child_level() as i32);
                for sub_item in group.outlines() {
                    self.map_outline_item(sub_item, group_indent, doc_nodes);
                }
            }
        }
    }

    fn map_rich_text(&mut self, rt: &RichText, inline_nodes: &mut Vec<PMNode>) {
        let text = rt.text();
        if text.is_empty() {
            return;
        }

        inline_nodes.push(PMNode {
            node_type: "text".to_string(),
            attrs: None,
            content: None,
            text: Some(text.to_string()),
            marks: None,
        });
    }

    fn map_image(&mut self, img: &Image) -> Option<ImageItem> {
        let ext = img.extension().unwrap_or("png").to_string();
        let mime = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            _ => "image/png",
        }
        .to_string();

        let mut data = Vec::new();
        if let Some(mut reader) = img.read() {
            let _ = reader.read_to_end(&mut data);
        }

        let sha256 = if !data.is_empty() {
            let mut hasher = Sha256::new();
            hasher.update(&data);
            hex::encode(hasher.finalize())
        } else {
            "0000000000000000000000000000000000000000000000000000000000000000".to_string()
        };

        self.assets.entry(sha256.clone()).or_insert_with(|| ImportedAsset {
            sha256: sha256.clone(),
            ext: ext.clone(),
            mime: mime.clone(),
            filename: format!("{}.{}", &sha256[..8], ext),
            data,
        });

        let x = img.offset_horizontal().unwrap_or(1.0) * 48.0;
        let y = img.offset_vertical().unwrap_or(2.0) * 48.0;
        let w = img.layout_max_width().unwrap_or(6.0) * 48.0;
        let h = img.layout_max_height().unwrap_or(4.0) * 48.0;

        Some(ImageItem {
            coords: BoxCoords {
                id: Ulid::new().to_string(),
                x: x.max(40.0),
                y: y.max(40.0),
                w: w.max(100.0),
                h: h.max(80.0),
                z: 2,
            },
            asset: sha256,
            alt: img.alt_text().map(|s| s.to_string()),
            ocr: img.text().map(|s| s.to_string()),
        })
    }

    fn map_embedded_file(&mut self, file: &EmbeddedFile) -> Option<FileItem> {
        let filename = file.filename().to_string();
        let mut data = Vec::new();
        let mut reader = file.read();
        let _ = reader.read_to_end(&mut data);

        let sha256 = if !data.is_empty() {
            let mut hasher = Sha256::new();
            hasher.update(&data);
            hex::encode(hasher.finalize())
        } else {
            "0000000000000000000000000000000000000000000000000000000000000000".to_string()
        };

        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin")
            .to_string();

        self.assets.entry(sha256.clone()).or_insert_with(|| ImportedAsset {
            sha256: sha256.clone(),
            ext,
            mime: "application/octet-stream".to_string(),
            filename: filename.clone(),
            data: data.clone(),
        });

        let x = file.offset_horizontal().unwrap_or(1.0) * 48.0;
        let y = file.offset_vertical().unwrap_or(2.0) * 48.0;
        let w = file.layout_max_width().unwrap_or(4.0) * 48.0;
        let h = file.layout_max_height().unwrap_or(2.0) * 48.0;

        Some(FileItem {
            coords: BoxCoords {
                id: Ulid::new().to_string(),
                x: x.max(40.0),
                y: y.max(40.0),
                w: w.max(200.0),
                h: h.max(60.0),
                z: 2,
            },
            asset: sha256,
            filename,
            mime: "application/octet-stream".to_string(),
            size: Some(data.len() as u64),
        })
    }

    fn map_ink(&mut self, ink: &Ink) -> Option<InkGroupItem> {
        let x = ink.offset_horizontal().unwrap_or(0.0) * 48.0;
        let y = ink.offset_vertical().unwrap_or(0.0) * 48.0;

        let mut strokes = Vec::new();

        for s in ink.ink_strokes() {
            let pts: Vec<StrokePoint> = s
                .absolute_path()
                .iter()
                .map(|p| StrokePoint {
                    x: (p.x() / 20.0), // OneNote ink units are 1/20th of a pt or similar
                    y: (p.y() / 20.0),
                    pressure: 0.5,
                    tilt: None,
                    t: None,
                })
                .collect();

            if pts.is_empty() {
                continue;
            }

            let color_hex = s
                .color()
                .map(|c| format!("#{:06x}", c & 0xFFFFFF))
                .unwrap_or_else(|| "#2563eb".to_string());

            let is_highlighter = s.transparency().map_or(false, |t| t < 250);

            strokes.push(Stroke {
                id: Ulid::new().to_string(),
                tool: if is_highlighter {
                    "highlighter".to_string()
                } else {
                    "pen".to_string()
                },
                color: color_hex,
                width: (s.width() / 20.0).max(2.0),
                pts,
            });
        }

        if strokes.is_empty() {
            return None;
        }

        Some(InkGroupItem {
            coords: BoxCoords {
                id: Ulid::new().to_string(),
                x: x.max(0.0),
                y: y.max(0.0),
                w: 600.0,
                h: 400.0,
                z: 2,
            },
            strokes,
        })
    }
}

fn chrono_now_iso() -> String {
    // Generate ISO timestamp without pulling heavy datetime crates
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("2026-11-12T10:00:00Z+{}", now % 86400)
}
