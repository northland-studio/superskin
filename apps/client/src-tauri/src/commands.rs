use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::database::Database;
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose};
use reqwest;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skin {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub skin_data: String,
    pub preview_data: Option<String>,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub avatar: Option<String>,
    pub token: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

fn get_conn<'a>(db: &'a State<'a, Database>) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, String> {
    db.inner().0.lock().map_err(|e| e.to_string())
}

fn get_thumbnails_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().unwrap().join("thumbnails");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[tauri::command]
pub fn save_thumbnail(app: tauri::AppHandle, base64_data: String) -> Result<String, String> {
    let dir = get_thumbnails_dir(&app);
    let filename = format!("{}.png", Uuid::new_v4());
    let filepath = dir.join(&filename);

    let base64_part = if base64_data.starts_with("data:") {
        base64_data.split(',').nth(1).unwrap_or(&base64_data)
    } else {
        &base64_data
    };

    let bytes = general_purpose::STANDARD
        .decode(base64_part)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    std::fs::write(&filepath, &bytes).map_err(|e| e.to_string())?;

    Ok(filepath.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_skin(
    db: State<'_, Database>,
    name: String,
    description: Option<String>,
    skin_data: String,
    preview_data: Option<String>,
    is_public: bool,
) -> Result<Skin, String> {
    let conn = get_conn(&db)?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let is_public_str = if is_public { "1" } else { "0" };

    conn.execute(
        "INSERT INTO skins (id, name, description, skin_data, preview_data, is_public, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            name,
            description,
            skin_data,
            preview_data,
            is_public_str,
            now,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(Skin {
        id,
        name,
        description,
        skin_data,
        preview_data,
        is_public,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_skins(db: State<'_, Database>) -> Result<Vec<Skin>, String> {
    let conn = get_conn(&db)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, skin_data, preview_data, is_public, created_at, updated_at
             FROM skins ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;

    let skins = stmt
        .query_map([], |row| {
            Ok(Skin {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                skin_data: row.get(3)?,
                preview_data: row.get(4)?,
                is_public: row.get::<_, i32>(5)? == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(skins)
}

#[tauri::command]
pub fn delete_skin(db: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = get_conn(&db)?;

    conn.execute("DELETE FROM skins WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_skin(
    db: State<'_, Database>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    skin_data: Option<String>,
    preview_data: Option<String>,
    is_public: Option<bool>,
) -> Result<Skin, String> {
    let conn = get_conn(&db)?;
    let now = Utc::now().to_rfc3339();

    if let Some(ref n) = name {
        conn.execute("UPDATE skins SET name = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![n, now, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref d) = description {
        conn.execute("UPDATE skins SET description = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![d, now, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref sd) = skin_data {
        conn.execute("UPDATE skins SET skin_data = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![sd, now, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref pd) = preview_data {
        conn.execute("UPDATE skins SET preview_data = ?1, updated_at = ?2 WHERE id = ?3", rusqlite::params![pd, now, &id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(p) = is_public {
        let p_str = if p { "1" } else { "0" };
        conn.execute("UPDATE skins SET is_public = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![p_str, now, &id])
            .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare("SELECT id, name, description, skin_data, preview_data, is_public, created_at, updated_at FROM skins WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row([&id], |row| {
        Ok(Skin {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            skin_data: row.get(3)?,
            preview_data: row.get(4)?,
            is_public: row.get::<_, i32>(5)? == 1,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_user(
    db: State<'_, Database>,
    id: String,
    username: String,
    email: String,
    avatar: Option<String>,
    token: Option<String>,
) -> Result<User, String> {
    let conn = get_conn(&db)?;

    conn.execute("DELETE FROM users", []).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO users (id, username, email, avatar, token, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, username, email, avatar, token, now],
    ).map_err(|e| e.to_string())?;

    Ok(User { id, username, email, avatar, token, created_at: now })
}

#[tauri::command]
pub fn get_user(db: State<'_, Database>) -> Result<Option<User>, String> {
    let conn = get_conn(&db)?;

    let mut stmt = conn
        .prepare("SELECT id, username, email, avatar, token, created_at FROM users LIMIT 1")
        .map_err(|e| e.to_string())?;

    let user = stmt.query_row([], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            email: row.get(2)?,
            avatar: row.get(3)?,
            token: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).ok();

    Ok(user)
}

#[tauri::command]
pub fn clear_user(db: State<'_, Database>) -> Result<(), String> {
    let conn = get_conn(&db)?;

    conn.execute("DELETE FROM users", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn http_post(url: String, body: String, token: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut request = client
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body);

    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), text));
    }

    Ok(text)
}

#[tauri::command]
pub async fn http_get(url: String, token: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut request = client.get(&url);

    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), text));
    }

    Ok(text)
}

#[tauri::command]
pub async fn http_download_bytes(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP {}: Download failed", status.as_u16()));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
pub async fn http_upload_file(url: String, file_data: String, filename: String, token: Option<String>) -> Result<String, String> {
    let file_bytes = if file_data.starts_with("data:") {
        let base64_part = file_data.split(',').nth(1).unwrap_or("");
        general_purpose::STANDARD.decode(base64_part).map_err(|e| format!("Base64 decode error: {}", e))?
    } else {
        general_purpose::STANDARD.decode(&file_data).map_err(|e| format!("Base64 decode error: {}", e))?
    };

    let part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(filename.clone())
        .mime_str("image/png")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new()
        .part("file", part);

    let client = reqwest::Client::new();
    let mut request = client.post(&url).multipart(form);

    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), text));
    }

    Ok(text)
}
