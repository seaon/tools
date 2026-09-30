// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{excel_reader, excel_writer, file_dialog};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            file_dialog::open_file_dialog,
            excel_reader::read_excel,
            excel_writer::save_cells,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
