/** 单个变更的单元格 */
export interface CellChange {
  /** 行号（1-based，与 Excel 一致） */
  row: number
  /** 列号（1-based，与 Excel 一致） */
  col: number
  /** 修改后的值 */
  newValue: string
}

/** Rust 端返回的原始行数据 */
export interface RawExcelRow {
  row_num: number
  values: string[]
}

/** 完整行数据（前端使用，含表头键） */
export interface ExcelRow {
  /** Excel 中的真实行号（1-based） */
  __rowNum: number
  /** 列名 → 值 */
  [column: string]: string | number | boolean | null
}

/** Excel 文件读取结果（Rust 端返回格式） */
export interface ExcelData {
  /** 文件路径 */
  path: string
  /** 工作表名 */
  sheetName: string
  /** 表头数组（按列顺序，已去重） */
  headers: string[]
  /** 全部数据行 */
  rows: RawExcelRow[]
  /** 隐藏列（1-based 列号） */
  hiddenColumns: number[]
}
