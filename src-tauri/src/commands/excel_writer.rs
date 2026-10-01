use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;
use umya_spreadsheet::{reader::xlsx::read, writer::xlsx::write, Workbook};

/// 单个变更的单元格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CellChange {
    pub row: u32,
    pub col: u32,
    #[serde(rename = "newValue")]
    pub new_value: String,
}

/// 增量保存变更单元格（核心命令）
#[command]
pub fn save_cells(path: String, changes: Vec<CellChange>) -> Result<(), String> {
    if changes.is_empty() {
        return Ok(());
    }

    // 1. 读取原始文件
    let mut workbook: Workbook = read(Path::new(&path)).map_err(|e| format!("读取文件失败: {}", e))?;

    let sheet = workbook
        .sheet_mut(0)
        .map_err(|e| format!("找不到工作表: {}", e))?;

    // 2. 仅修改传入的变更单元格
    for change in changes {
        sheet
            .cell_mut((change.col, change.row)) // (col, row) 1-based
            .set_value(&change.new_value);
    }

    // 3. 原地写回
    write(&workbook, Path::new(&path)).map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(())
}