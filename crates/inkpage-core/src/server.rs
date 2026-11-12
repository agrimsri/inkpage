use crate::index::SearchIndex;
use crate::storage::StorageManager;
use axum::{
    Json, Router,
    extract::{Multipart, Path as AxumPath, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use inkpage_import::{ImportOptions, converter::ExportFormat, import_file};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub struct AppState {
    pub storage: StorageManager,
    pub index: SearchIndex,
    pub data_dir: PathBuf,
}

#[derive(Serialize)]
struct StatusResponse {
    status: &'static str,
    version: &'static str,
    platform: &'static str,
    data_dir: String,
}

#[derive(Deserialize)]
struct CreateNotebookRequest {
    title: String,
}

#[derive(Deserialize)]
struct CreateSectionRequest {
    title: String,
    color: Option<String>,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    #[serde(default)]
    nb: Option<String>,
}

#[derive(Deserialize)]
struct TagsQuery {
    #[serde(default)]
    nb: Option<String>,
}

#[derive(Deserialize)]
struct ImportRequest {
    file_path: String,
    format: Option<String>,
    title: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MetricEntry {
    pub timestamp: f64,
    pub pointer_type: String,
    pub pressure: f32,
    pub latency_ms: f64,
    pub coalesced_count: usize,
}

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/status", get(get_status))
        .route("/api/notebooks", get(list_notebooks).post(create_notebook))
        .route("/api/notebooks/:nb_id", get(get_notebook))
        .route(
            "/api/notebooks/:nb_id/sections",
            get(list_sections).post(create_section),
        )
        .route(
            "/api/notebooks/:nb_id/sections/:sec_id/pages",
            get(list_pages).post(create_page),
        )
        .route(
            "/api/notebooks/:nb_id/sections/:sec_id/pages/:page_id",
            get(get_page).put(save_page).delete(delete_page),
        )
        .route(
            "/api/notebooks/:nb_id/sections/:sec_id/assets",
            post(upload_asset),
        )
        .route(
            "/api/notebooks/:nb_id/sections/:sec_id/assets/:sha256",
            get(get_asset),
        )
        .route("/api/search", get(search_index))
        .route("/api/tags", get(get_tags))
        .route("/api/reindex", post(reindex_notebook))
        .route("/api/import", post(import_notebook_file))
        .route("/api/spike/metrics", post(record_metrics))
        .layer(cors)
        .with_state(state)
}

async fn get_status(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(StatusResponse {
        status: "ok",
        version: "0.1.0",
        platform: "linux",
        data_dir: state.data_dir.display().to_string(),
    })
}

async fn list_notebooks(State(state): State<Arc<AppState>>) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .list_notebooks()
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn create_notebook(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateNotebookRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let nb = state
        .storage
        .create_notebook(&payload.title)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Initial reindex
    let _ = reindex_internal(&state, &nb.id);

    Ok((StatusCode::CREATED, Json(nb)))
}

async fn get_notebook(
    State(state): State<Arc<AppState>>,
    AxumPath(nb_id): AxumPath<String>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .get_notebook(&nb_id)
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}

async fn list_sections(
    State(state): State<Arc<AppState>>,
    AxumPath(nb_id): AxumPath<String>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .list_sections(&nb_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn create_section(
    State(state): State<Arc<AppState>>,
    AxumPath(nb_id): AxumPath<String>,
    Json(payload): Json<CreateSectionRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    state
        .storage
        .create_section(&nb_id, &payload.title, &color)
        .map(|sec| (StatusCode::CREATED, Json(sec)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn list_pages(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id)): AxumPath<(String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .list_pages(&nb_id, &sec_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn create_page(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id)): AxumPath<(String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let page_id = state
        .storage
        .save_page(&nb_id, &sec_id, &payload)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update FTS5 index
    let _ = update_index_for_page(&state, &nb_id, &sec_id, &payload);

    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": page_id }))))
}

async fn get_page(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id, page_id)): AxumPath<(String, String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .get_page(&nb_id, &sec_id, &page_id)
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}

async fn save_page(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id, _page_id)): AxumPath<(String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .save_page(&nb_id, &sec_id, &payload)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update index
    let _ = update_index_for_page(&state, &nb_id, &sec_id, &payload);

    Ok(Json(serde_json::json!({ "status": "saved" })))
}

async fn delete_page(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id, page_id)): AxumPath<(String, String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    state
        .storage
        .delete_page(&nb_id, &sec_id, &page_id)
        .map(|_| Json(serde_json::json!({ "status": "deleted" })))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn upload_asset(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id)): AxumPath<(String, String)>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, StatusCode> {
    let mut filename = "asset.bin".to_string();
    let mut data = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        if let Some(name) = field.file_name() {
            filename = name.to_string();
        }
        if let Ok(bytes) = field.bytes().await {
            data = bytes.to_vec();
        }
    }

    if data.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let sha256 = state
        .storage
        .save_asset(&nb_id, &sec_id, &filename, &data)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "sha256": sha256, "filename": filename })),
    ))
}

async fn get_asset(
    State(state): State<Arc<AppState>>,
    AxumPath((nb_id, sec_id, sha256)): AxumPath<(String, String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    let bytes = state
        .storage
        .get_asset(&nb_id, &sec_id, &sha256)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(bytes)
}

async fn search_index(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let results = state
        .index
        .search(&query.q)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let filtered = if let Some(nb_id) = query.nb {
        results
            .into_iter()
            .filter(|r| r.notebook_id == nb_id)
            .collect()
    } else {
        results
    };

    Ok(Json(filtered))
}

async fn get_tags(
    State(state): State<Arc<AppState>>,
    Query(query): Query<TagsQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    let nb_id = query.nb.unwrap_or_default();
    let tags = state
        .index
        .get_tags_summary(&nb_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(tags))
}

async fn reindex_notebook(
    State(state): State<Arc<AppState>>,
    Query(query): Query<TagsQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    if let Some(nb_id) = query.nb {
        reindex_internal(&state, &nb_id).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        Ok(Json(serde_json::json!({ "status": "reindexed", "notebookId": nb_id })))
    } else {
        // Reindex all
        let notebooks = state
            .storage
            .list_notebooks()
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        for nb in notebooks {
            let _ = reindex_internal(&state, &nb.id);
        }
        Ok(Json(serde_json::json!({ "status": "reindexed_all" })))
    }
}

async fn import_notebook_file(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ImportRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let input_path = Path::new(&payload.file_path);
    let export_fmt = match payload.format.as_deref() {
        Some("md") | Some("markdown") => ExportFormat::Markdown,
        Some("json") => ExportFormat::Json,
        _ => ExportFormat::Native,
    };
    let options = ImportOptions {
        output_dir: state.data_dir.clone(),
        format: export_fmt,
        notebook_title_override: payload.title,
    };

    let (imported, report) =
        import_file(input_path, &options).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Reindex the newly imported notebook
    let _ = reindex_internal(&state, &imported.id);

    Ok(Json(serde_json::json!({
        "notebook": imported,
        "report": report
    })))
}

async fn record_metrics(
    Json(metrics): Json<Vec<MetricEntry>>,
) -> impl IntoResponse {
    println!("[M0 Latency Spike] Received {} metric entries", metrics.len());
    Json(serde_json::json!({ "received": metrics.len() }))
}

fn update_index_for_page(
    state: &Arc<AppState>,
    nb_id: &str,
    sec_id: &str,
    page: &serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let sections = state.storage.list_sections(nb_id)?;
    let sec = sections.iter().find(|s| s.id == sec_id);
    let sec_title = sec.map(|s| s.title.as_str()).unwrap_or("Section");
    let sec_color = sec.map(|s| s.color.as_str()).unwrap_or("#6366f1");

    state
        .index
        .index_page(nb_id, sec_id, sec_title, sec_color, page)?;
    Ok(())
}

fn reindex_internal(state: &Arc<AppState>, nb_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let sections = state.storage.list_sections(nb_id)?;
    for sec in sections {
        let pages = state.storage.list_pages(nb_id, &sec.id)?;
        for page in pages {
            let _ = state
                .index
                .index_page(nb_id, &sec.id, &sec.title, &sec.color, &page);
        }
    }
    Ok(())
}
