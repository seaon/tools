use tauri::command;
use tauri_plugin_dialog::DialogExt;

/// 打开文件对话框，返回文件路径（或 null）
#[command]
pub async fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let result = app.dialog().file().blocking_pick_file();
    match result {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}
