use crate::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
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
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub avatar: Option<String>,
    pub token: Option<String>,
    pub created_at: String,
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
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO skins (id, name, description, skin_data, preview_data, is_public, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        [
            &id,
            &name,
            &description.clone().unwrap_or_default(),
            &skin_data,
            &preview_data.clone().unwrap_or_default(),
            if is_public { "1" } else { "0" },
            &now,
            &now,
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
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
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
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
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
    is_public: Option<bool>,
) -> Result<Skin, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    
    if let Some(n) = &name {
        conn.execute("UPDATE skins SET name = ?1, updated_at = ?2 WHERE id = ?3", [n, &now, &id])
            .map_err(|e| e.to_string())?;
    }
    
    if let Some(d) = &description {
        conn.execute("UPDATE skins SET description = ?1, updated_at = ?2 WHERE id = ?3", [d, &now, &id])
            .map_err(|e| e.to_string())?;
    }
    
    if let Some(p) = is_public {
        conn.execute("UPDATE skins SET is_public = ?1, updated_at = ?2 WHERE id = ?3", 
            [if p { "1" } else { "0" }, &now, &id])
            .map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, skin_data, preview_data, is_public, created_at, updated_at 
             FROM skins WHERE id = ?1"
        )
        .map_err(|e| e.to_string())?;

    let skin = stmt
        .query_row([&id], |row| {
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
        .map_err(|e| e.to_string())?;

    Ok(skin)
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
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT OR REPLACE INTO users (id, username, email, avatar, token, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [
            &id,
            &username,
            &email,
            &avatar.clone().unwrap_or_default(),
            &token.clone().unwrap_or_default(),
            &now,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(User {
        id,
        username,
        email,
        avatar,
        token,
        created_at: now,
    })
}

#[tauri::command]
pub fn get_user(db: State<'_, Database>) -> Result<Option<User>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, username, email, avatar, token, created_at FROM users LIMIT 1"
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                avatar: row.get(3)?,
                token: row.get(4)?,
                created_at: row.get(5)?,
            })
        });

    match result {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn clear_user(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM users", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}
