use clap::Parser;
use inkpage_core::{AppState, SearchIndex, StorageManager, create_router};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Parser, Debug)]
#[command(
    name = "inkpage-server",
    author = "Inkpage Contributors",
    version = "0.1.0",
    about = "Inkpage local backend server providing storage, SQLite FTS5 search index, and import/export RPC"
)]
struct Args {
    /// Port to listen on
    #[arg(short = 'p', long = "port", default_value_t = 3888)]
    port: u16,

    /// Data directory for .inkbook notebooks
    #[arg(short = 'd', long = "data-dir", default_value = "./notebooks")]
    data_dir: PathBuf,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    let data_dir = std::fs::canonicalize(&args.data_dir).unwrap_or(args.data_dir);
    std::fs::create_dir_all(&data_dir)?;

    let db_path = data_dir.join(".inkpage_global_index.sqlite");
    let index = SearchIndex::open(&db_path)?;
    let storage = StorageManager::new(&data_dir);

    // Initial check: if no notebooks exist, create a Welcome Notebook
    if storage.list_notebooks()?.is_empty() {
        println!("No notebooks found. Initializing 'Welcome Notebook'...");
        let nb = storage.create_notebook("Welcome to Inkpage")?;
        let sections = storage.list_sections(&nb.id)?;
        if let Some(sec) = sections.first() {
            let welcome_page = serde_json::json!({
                "schema": 1,
                "id": ulid::Ulid::new().to_string(),
                "title": "Welcome to Inkpage 🚀",
                "level": 0,
                "created": "2026-11-12T10:00:00Z",
                "modified": "2026-11-12T10:00:00Z",
                "size": { "w": "auto", "h": "auto" },
                "background": { "kind": "rule", "spacing": 24, "color": "#e2e8f0" },
                "items": [
                    {
                        "id": "welcome-box-1",
                        "kind": "container",
                        "x": 60,
                        "y": 60,
                        "w": 680,
                        "h": 320,
                        "z": 1,
                        "doc": {
                            "type": "doc",
                            "content": [
                                {
                                    "type": "outlineItem",
                                    "attrs": { "indent": 0, "tags": [{ "type": "todo", "done": false }] },
                                    "content": [
                                        { "type": "text", "text": "Welcome to Inkpage! A free, open-source, local-first note-taking app." }
                                    ]
                                },
                                {
                                    "type": "outlineItem",
                                    "attrs": { "indent": 1, "tags": [{ "type": "important", "done": false }] },
                                    "content": [
                                        { "type": "text", "text": "Freeform 2D Canvas: Click anywhere to type notes, movable containers, resizable boxes." }
                                    ]
                                },
                                {
                                    "type": "outlineItem",
                                    "attrs": { "indent": 1 },
                                    "content": [
                                        { "type": "text", "text": "First-Class Stylus & Ink: Pressure-sensitive pen, highlighter, eraser, and lasso." }
                                    ]
                                },
                                {
                                    "type": "outlineItem",
                                    "attrs": { "indent": 1, "tags": [{ "type": "question", "done": false }] },
                                    "content": [
                                        { "type": "text", "text": "Import Existing OneNote Files: Drag and drop .one, .onetoc2, .onepkg archives or OneDrive ZIP exports." }
                                    ]
                                },
                                {
                                    "type": "outlineItem",
                                    "attrs": { "indent": 1 },
                                    "content": [
                                        { "type": "text", "text": "Instant FTS5 Search & Image OCR: Sub-100ms full text search across all notebooks." }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        "id": "welcome-ink-1",
                        "kind": "ink",
                        "x": 100,
                        "y": 420,
                        "w": 400,
                        "h": 160,
                        "z": 2,
                        "strokes": [
                            {
                                "id": "stroke-sample-1",
                                "tool": "pen",
                                "color": "#2563eb",
                                "width": 4,
                                "pts": [
                                    [120, 440, 0.6], [140, 445, 0.7], [180, 435, 0.8],
                                    [220, 450, 0.7], [260, 430, 0.5]
                                ]
                            },
                            {
                                "id": "stroke-sample-2",
                                "tool": "highlighter",
                                "color": "#facc15",
                                "width": 14,
                                "pts": [
                                    [100, 470, 0.5], [200, 470, 0.5], [300, 470, 0.5]
                                ]
                            }
                        ]
                    }
                ]
            });
            let _ = storage.save_page(&nb.id, &sec.id, &welcome_page);
            let _ = index.index_page(&nb.id, &sec.id, &sec.title, &sec.color, &welcome_page);
        }
    }

    let state = Arc::new(AppState {
        storage,
        index,
        data_dir: data_dir.clone(),
    });

    let app = create_router(state);
    let addr = SocketAddr::from(([127, 0, 0, 1], args.port));
    println!("Inkpage server running at http://{}", addr);
    println!("Data directory: {}", data_dir.display());

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
