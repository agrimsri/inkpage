use crate::ir::*;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Native,
    Json,
    Markdown,
}

pub fn export_imported_notebook(
    notebook: &ImportedNotebook,
    assets: &HashMap<String, ImportedAsset>,
    out_dir: &Path,
    format: ExportFormat,
) -> Result<(), Box<dyn std::error::Error>> {
    match format {
        ExportFormat::Json => {
            fs::create_dir_all(out_dir)?;
            let file_path = out_dir.join("notebook.json");
            let json = serde_json::to_string_pretty(notebook)?;
            fs::write(file_path, json)?;
        }
        ExportFormat::Native => {
            let safe_title = sanitize_filename(&notebook.title.0);
            let book_dir = out_dir.join(format!("{}.inkbook", safe_title));
            fs::create_dir_all(&book_dir)?;

            // 1. Write notebook.json
            let nb_meta = serde_json::json!({
                "schema": notebook.schema,
                "id": notebook.id,
                "title": notebook.title.0,
                "sectionOrder": notebook.section_order,
                "created": notebook.created,
                "modified": notebook.modified
            });
            fs::write(
                book_dir.join("notebook.json"),
                serde_json::to_string_pretty(&nb_meta)?,
            )?;

            let sections_dir = book_dir.join("sections");
            fs::create_dir_all(&sections_dir)?;

            for sec in &notebook.sections {
                let sec_dir = sections_dir.join(format!("{}.section", sec.id));
                let pages_dir = sec_dir.join("pages");
                let assets_dir = sec_dir.join("assets");
                fs::create_dir_all(&pages_dir)?;
                fs::create_dir_all(&assets_dir)?;

                let sec_meta = serde_json::json!({
                    "id": sec.id,
                    "title": sec.title,
                    "color": sec.color,
                    "parentGroup": sec.parent_group,
                    "pageOrder": sec.page_order
                });
                fs::write(
                    sec_dir.join("section.json"),
                    serde_json::to_string_pretty(&sec_meta)?,
                )?;

                for page in &sec.pages {
                    let page_file = pages_dir.join(format!("{}.page.json", page.id));
                    fs::write(page_file, serde_json::to_string_pretty(page)?)?;
                }

                // Write assets referenced by this section's pages
                for page in &sec.pages {
                    for item in &page.items {
                        match item {
                            ImportedItem::Image(img) => {
                                if let Some(asset) = assets.get(&img.asset) {
                                    if !asset.data.is_empty() {
                                        let asset_path =
                                            assets_dir.join(format!("{}.{}", asset.sha256, asset.ext));
                                        let _ = fs::write(asset_path, &asset.data);
                                    }
                                }
                            }
                            ImportedItem::File(f) => {
                                if let Some(asset) = assets.get(&f.asset) {
                                    if !asset.data.is_empty() {
                                        let asset_path =
                                            assets_dir.join(format!("{}.{}", asset.sha256, asset.ext));
                                        let _ = fs::write(asset_path, &asset.data);
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
        ExportFormat::Markdown => {
            let safe_title = sanitize_filename(&notebook.title.0);
            let md_root = out_dir.join(&safe_title);
            fs::create_dir_all(&md_root)?;

            for sec in &notebook.sections {
                let sec_dir = md_root.join(sanitize_filename(&sec.title));
                let assets_dir = sec_dir.join("assets");
                fs::create_dir_all(&assets_dir)?;

                for page in &sec.pages {
                    let page_filename = format!("{}.md", sanitize_filename(&page.title));
                    let page_path = sec_dir.join(page_filename);
                    let mut file = File::create(page_path)?;

                    writeln!(file, "---")?;
                    writeln!(file, "title: {:?}", page.title)?;
                    writeln!(file, "created: {:?}", page.created)?;
                    writeln!(file, "modified: {:?}", page.modified)?;
                    writeln!(file, "level: {}", page.level)?;
                    writeln!(file, "---\n")?;
                    writeln!(file, "# {}\n", page.title)?;

                    for item in &page.items {
                        match item {
                            ImportedItem::Container(c) => {
                                write_pm_doc_markdown(&mut file, &c.doc)?;
                            }
                            ImportedItem::Image(img) => {
                                if let Some(asset) = assets.get(&img.asset) {
                                    let filename = format!("{}.{}", asset.sha256, asset.ext);
                                    let asset_path = assets_dir.join(&filename);
                                    let _ = fs::write(asset_path, &asset.data);
                                    let alt = img.alt.as_deref().unwrap_or("Image");
                                    writeln!(file, "![{alt}](assets/{filename})\n")?;
                                    if let Some(ocr) = &img.ocr {
                                        writeln!(file, "> OCR: {ocr}\n")?;
                                    }
                                }
                            }
                            ImportedItem::File(f) => {
                                if let Some(asset) = assets.get(&f.asset) {
                                    let filename = format!("{}.{}", asset.sha256, asset.ext);
                                    let asset_path = assets_dir.join(&filename);
                                    let _ = fs::write(asset_path, &asset.data);
                                    writeln!(file, "[Attachment: {}](assets/{})\n", f.filename, filename)?;
                                }
                            }
                            ImportedItem::Table(tbl) => {
                                writeln!(file, "\n| Table ({}x{}) |", tbl.rows, tbl.cols)?;
                                writeln!(file, "|---|")?;
                                for cell in &tbl.cells {
                                    writeln!(file, "| R{}C{}: {} |", cell.row, cell.col, cell.text)?;
                                }
                                writeln!(file)?;
                            }
                            ImportedItem::Ink(ink) => {
                                // Export ink strokes as SVG file
                                let svg_filename = format!("ink_{}.svg", ink.coords.id);
                                let svg_path = assets_dir.join(&svg_filename);
                                let svg_content = render_strokes_to_svg(&ink.strokes);
                                let _ = fs::write(svg_path, svg_content);
                                writeln!(file, "![Ink drawing](assets/{svg_filename})\n")?;
                            }
                            ImportedItem::Math(m) => {
                                writeln!(file, "$${}$$\n", m.latex)?;
                            }
                            ImportedItem::Shape(s) => {
                                writeln!(file, "[Shape: {}]\n", s.shape_type)?;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

fn write_pm_doc_markdown(out: &mut impl Write, node: &PMNode) -> std::io::Result<()> {
    if let Some(content) = &node.content {
        for child in content {
            if child.node_type == "outlineItem" {
                let indent = child
                    .attrs
                    .as_ref()
                    .and_then(|a| a.get("indent"))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);

                let indent_str = "  ".repeat(indent as usize);
                write!(out, "{}- ", indent_str)?;

                if let Some(inline_content) = &child.content {
                    for inline in inline_content {
                        if let Some(text) = &inline.text {
                            write!(out, "{}", text)?;
                        }
                    }
                }
                writeln!(out)?;
            } else {
                write_pm_doc_markdown(out, child)?;
            }
        }
    }
    writeln!(out)?;
    Ok(())
}

pub fn render_strokes_to_svg(strokes: &[Stroke]) -> String {
    use std::fmt::Write;
    let est_cap = strokes.iter().map(|s| 120 + s.pts.len() * 24).sum::<usize>() + 100;
    let mut svg = String::with_capacity(est_cap);
    svg.push_str(r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">"#);
    for s in strokes {
        if s.pts.is_empty() {
            continue;
        }
        let _ = write!(
            svg,
            r#"<path stroke="{}" stroke-width="{}" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M {} {}"#,
            s.color, s.width, s.pts[0].x, s.pts[0].y
        );
        for pt in &s.pts[1..] {
            let _ = write!(svg, " L {} {}", pt.x, pt.y);
        }
        svg.push_str(r#"" />"#);
    }
    svg.push_str("</svg>");
    svg
}

fn sanitize_filename(name: &str) -> String {
    let clean: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect();
    let trimmed = clean.trim();
    if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed.to_string()
    }
}
