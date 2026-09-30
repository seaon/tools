/** 单个变更的单元格 */
export interface CellChange {
  /** 行号（1-based，与 Excel 一致） */
  row: number
  /** 列号（1-based，与 Excel 一致） */
  col: number
  /** 修改后的值 */
  newValue: string
}

/** 完整行数据 */
export interface ExcelRow {
  /** Excel 中的真实行号（1-based） */
  __rowNum: number
  /** 列名 → 值 */
  [column: string]: string | number | boolean | null | undefined
}

/** Excel 文件读取结果 */
export interface ExcelData {
  /** 文件路径 */
  path: string
  /** 工作表名 */
  sheetName: string
  /** 表头数组（按列顺序） */
  headers: string[]
  /** 全部数据行 */
  rows: ExcelRow[]
}
