use inkpage_import::converter::{ExportFormat, export_imported_notebook};
use inkpage_import::ir::*;
use std::collections::HashMap;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_export_native_inkbook_structure() {
    let dir = tempdir().unwrap();

    let notebook = ImportedNotebook {
        schema: 1,
        id: "01JCARA0000000000000000001".to_string(),
        title: "Test Notebook".into(),
        section_order: vec!["01JCARA0000000000000000002".to_string()],
        sections: vec![ImportedSection {
            id: "01JCARA0000000000000000002".to_string(),
            title: "Quick Notes".to_string(),
            color: "#6366f1".to_string(),
            parent_group: None,
            page_order: vec!["01JCARA0000000000000000003".to_string()],
            pages: vec![ImportedPage {
                schema: 1,
                id: "01JCARA0000000000000000003".to_string(),
                title: "Welcome Page".to_string(),
                parent_page: None,
                level: 0,
                created: "2026-11-12T10:00:00Z".to_string(),
                modified: "2026-11-12T10:00:00Z".to_string(),
                size: PageSize {
                    w: "auto".to_string(),
                    h: "auto".to_string(),
                },
                background: Some(PageBackground {
                    kind: "rule".to_string(),
                    spacing: Some(24.0),
                    color: Some("#e2e8f0".to_string()),
                }),
                items: vec![
                    ImportedItem::Container(ContainerItem {
                        coords: BoxCoords {
                            id: "item-1".to_string(),
                            x: 40.0,
                            y: 60.0,
                            w: 600.0,
                            h: 200.0,
                            z: 1,
                        },
                        doc: PMNode {
                            node_type: "doc".to_string(),
                            attrs: None,
                            content: Some(vec![PMNode {
                                node_type: "outlineItem".to_string(),
                                attrs: Some(serde_json::json!({
                                    "indent": 0,
                                    "tags": [{ "type": "todo", "done": false }]
                                })),
                                content: Some(vec![PMNode {
                                    node_type: "text".to_string(),
                                    attrs: None,
                                    content: None,
                                    text: Some("Testing native export".to_string()),
                                    marks: None,
                                }]),
                                text: None,
                                marks: None,
                            }]),
                            text: None,
                            marks: None,
                        },
                        is_width_set_by_user: None,
                    }),
                    ImportedItem::Ink(InkGroupItem {
                        coords: BoxCoords {
                            id: "item-2".to_string(),
                            x: 50.0,
                            y: 300.0,
                            w: 400.0,
                            h: 200.0,
                            z: 2,
                        },
                        strokes: vec![Stroke {
                            id: "stroke-1".to_string(),
                            tool: "pen".to_string(),
                            color: "#2563eb".to_string(),
                            width: 3.0,
                            pts: vec![
                                StrokePoint {
                                    x: 50.0,
                                    y: 300.0,
                                    pressure: 0.5,
                                    tilt: None,
                                    t: None,
                                },
                                StrokePoint {
                                    x: 60.0,
                                    y: 310.0,
                                    pressure: 0.6,
                                    tilt: None,
                                    t: None,
                                },
                            ],
                        }],
                    }),
                ],
                meta: HashMap::new(),
            }],
        }],
        created: "2026-11-12T10:00:00Z".to_string(),
        modified: "2026-11-12T10:00:00Z".to_string(),
        report: ImportReport::default(),
    };

    let assets = HashMap::new();

    // 1. Export as Native .inkbook
    export_imported_notebook(&notebook, &assets, dir.path(), ExportFormat::Native).unwrap();

    let book_dir = dir.path().join("Test Notebook.inkbook");
    assert!(book_dir.exists(), "Notebook directory must exist");
    assert!(book_dir.join("notebook.json").exists(), "notebook.json must exist");

    let sec_dir = book_dir.join("sections").join("01JCARA0000000000000000002.section");
    assert!(sec_dir.exists(), "Section directory must exist");
    assert!(sec_dir.join("section.json").exists(), "section.json must exist");

    let page_file = sec_dir.join("pages").join("01JCARA0000000000000000003.page.json");
    assert!(page_file.exists(), "Page JSON file must exist");

    let page_content = fs::read_to_string(&page_file).unwrap();
    assert!(page_content.contains("Testing native export"));

    // 2. Export as Markdown
    export_imported_notebook(&notebook, &assets, dir.path(), ExportFormat::Markdown).unwrap();
    let md_file = dir.path().join("Test Notebook").join("Quick Notes").join("Welcome Page.md");
    assert!(md_file.exists(), "Markdown file must exist");
    let md_content = fs::read_to_string(&md_file).unwrap();
    assert!(md_content.contains("title: \"Welcome Page\""));
    assert!(md_content.contains("Testing native export"));
    assert!(md_content.contains("assets/ink_item-2.svg"));
}
