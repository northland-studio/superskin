#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
