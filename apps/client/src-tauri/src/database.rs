use rusqlite::{Connection, Result as SqliteResult};
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database(pub Mutex<Connection>);

fn get_database_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    app_dir.join("superskin.db")
}

pub fn init_database(app: &AppHandle) -> SqliteResult<()> {
    let db_path = get_database_path(app);
    let conn = Connection::open(&db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS skins (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            skin_data TEXT NOT NULL,
            preview_data TEXT,
            is_public INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            avatar TEXT,
            token TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    app.manage(Database(Mutex::new(conn)));

    Ok(())
}
