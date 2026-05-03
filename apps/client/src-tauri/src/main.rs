#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_handle = app.handle();
            database::init_database(&app_handle).expect("Failed to initialize database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_skin,
            commands::get_skins,
            commands::delete_skin,
            commands::update_skin,
            commands::save_user,
            commands::get_user,
            commands::clear_user,
            commands::save_thumbnail,
            commands::http_post,
            commands::http_get,
            commands::http_upload_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
