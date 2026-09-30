use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;
use umya_spreadsheet::{reader::xlsx::read, Workbook};

/// Excel 文件读取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelData {
    pub path: String,
    pub sheet_name: String,
    pub headers: Vec<String>,
    pub rows: Vec<ExcelRow>,
}

/// 行数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelRow {
    pub row_num: u32,
    pub values: Vec<String>,
}

/// 读取 Excel 文件，返回表头 + 全部行数据
#[command]
pub fn read_excel(path: String) -> Result<ExcelData, String> {
    let workbook: Workbook = read(Path::new(&path)).map_err(|e| format!("读取文件失败: {}", e))?;

    let sheet = workbook
        .sheet(0)
        .map_err(|e| format!("找不到工作表: {}", e))?;

    let sheet_name = sheet.get_name().to_string();

    // 获取所有单元格，按行列排序
    let cells = sheet.cells_sorted();

    // 获取行维度信息（用于获取真实行号）
    let row_dims = sheet.row_dimensions();

    // 构建行号 -> 单元格值 的映射
    let mut row_map: std::collections::BTreeMap<u32, Vec<String>> = std::collections::BTreeMap::new();

    for cell in cells {
        let row_num = cell.coordinate().row_num();
        let col_num = cell.coordinate().col_num();
        let value = cell.get_value().to_string();

        // 确保行存在
        let row_values = row_map.entry(row_num).or_default();

        // 扩展列直到当前列
        while row_values.len() < col_num as usize {
            row_values.push(String::new());
        }

        // 设置值（索引是 0-based，列号是 1-based）
        if (col_num as usize) <= row_values.len() {
            row_values[col_num as usize - 1] = value;
        } else {
            row_values.push(value);
        }
    }

    // 确定最大列数
    let max_cols = row_map.values().map(|v| v.len()).max().unwrap_or(0);

    // 提取表头（第一行数据）
    let headers = if let Some(first_row) = row_map.values().next() {
        if first_row.len() >= max_cols {
            first_row.clone()
        } else {
            let mut h = first_row.clone();
            h.resize(max_cols, String::new());
            h
        }
    } else {
        (1..=max_cols).map(|i| format!("列{}", i)).collect()
    };

    // 转换为 ExcelRow（跳过第一行表头）
    let mut rows: Vec<ExcelRow> = row_map
        .into_iter()
        .skip(1)
        .map(|(row_num, mut values)| {
            values.resize(max_cols, String::new());
            ExcelRow { row_num, values }
        })
        .collect();

    // 确保行按行号排序
    rows.sort_by_key(|r| r.row_num);

    Ok(ExcelData {
        path,
        sheet_name,
        headers,
        rows,
    })
}