use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use tauri::command;
use umya_spreadsheet::{reader::xlsx::read, Workbook};

/// Excel 文件读取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelData {
    pub path: String,
    #[serde(rename = "sheetName")]
    pub sheet_name: String,
    pub headers: Vec<String>,
    pub rows: Vec<ExcelRow>,
    #[serde(rename = "hiddenColumns")]
    pub hidden_columns: Vec<u32>,
}

/// 行数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcelRow {
    pub row_num: u32,
    pub values: Vec<String>,
}

/// 读取 Excel 文件，返回表头 + 全部数据行
#[command]
pub fn read_excel(path: String) -> Result<ExcelData, String> {
    let workbook: Workbook = read(Path::new(&path)).map_err(|e| format!("读取文件失败: {}", e))?;

    let sheet = workbook
        .sheet(0)
        .map_err(|e| format!("找不到工作表: {}", e))?;

    let sheet_name = sheet.name().to_string();

    // 收集非空行：真实行号 -> 该行列值（列号 1-based 对应数组 0-based）
    let mut row_map: BTreeMap<u32, Vec<String>> = BTreeMap::new();

    for cell in sheet.cells() {
        let row_num = cell.coordinate().row_num();
        let col_num = cell.coordinate().col_num();
        let value = cell.value().to_string();

        // 跳过空单元格，避免把只有格式、没有内容的行计入数据量
        if value.trim().is_empty() {
            continue;
        }

        let row_values = row_map.entry(row_num).or_default();

        // 补全中间空列，保证列号与数组下标对齐
        while row_values.len() < col_num as usize {
            row_values.push(String::new());
        }

        row_values[col_num as usize - 1] = value;
    }

    // 没有数据时直接返回空结果
    if row_map.is_empty() {
        return Ok(ExcelData {
            path,
            sheet_name,
            headers: vec![],
            rows: vec![],
            hidden_columns: vec![],
        });
    }

    // 最大列数（按非空单元格计算，忽略尾部空列）
    let max_cols = row_map.values().map(|v| v.len()).max().unwrap_or(0);

    // 隐藏列（1-based 列号，仅保留在数据范围内的）
    let hidden_columns: Vec<u32> = sheet
        .column_dimensions()
        .iter()
        .filter(|c| c.hidden() && c.col_num() >= 1 && c.col_num() <= max_cols as u32)
        .map(|c| c.col_num())
        .collect();

    // 表头 = 第一个非空行；空表头补默认列名
    let raw_headers: Vec<String> = {
        let first = row_map.values().next().unwrap().clone();
        let mut h = first;
        h.resize(max_cols, String::new());
        h.iter()
            .enumerate()
            .map(|(idx, v)| {
                if v.trim().is_empty() {
                    format!("列{}", idx + 1)
                } else {
                    v.clone()
                }
            })
            .collect()
    };

    // 同名列去重（追加 (2)/(3)…），避免前端用列名当对象 key 时互相覆盖
    let headers = make_unique_headers(raw_headers);

    // 数据行 = 跳过表头后的非空行，保留真实行号
    let rows: Vec<ExcelRow> = row_map
        .into_iter()
        .skip(1)
        .map(|(row_num, mut values)| {
            values.resize(max_cols, String::new());
            ExcelRow { row_num, values }
        })
        .collect();

    Ok(ExcelData {
        path,
        sheet_name,
        headers,
        rows,
        hidden_columns,
    })
}

/// 表头去重：同名列追加 (2)、(3)…，保证前端用列名做对象 key 时不会互相覆盖
fn make_unique_headers(headers: Vec<String>) -> Vec<String> {
    use std::collections::HashSet;

    let mut used: HashSet<String> = HashSet::new();
    headers
        .into_iter()
        .map(|h| {
            if used.insert(h.clone()) {
                return h;
            }
            let mut n = 2;
            loop {
                let candidate = format!("{}({})", h, n);
                if used.insert(candidate.clone()) {
                    return candidate;
                }
                n += 1;
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::make_unique_headers;

    #[test]
    fn dedups_duplicate_headers() {
        assert_eq!(
            make_unique_headers(vec![
                "备注".to_string(),
                "名称".to_string(),
                "备注".to_string(),
                "备注".to_string(),
                "备注(2)".to_string(),
                "备注".to_string(),
            ]),
            vec!["备注", "名称", "备注(2)", "备注(3)", "备注(2)(2)", "备注(4)"]
        );
    }
}
