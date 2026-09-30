import { invoke } from '@tauri-apps/api/core'
import type { ExcelData, CellChange } from './excel'

/** Tauri Command 接口封装 */
export const tauriApi = {
  /** 打开文件对话框，返回文件路径（或 null） */
  openFileDialog: () => invoke<string | null>('open_file_dialog'),

  /** 读取 Excel 文件，返回表头 + 全部行数据 */
  readExcel: (path: string) => invoke<ExcelData>('read_excel', { path }),

  /** 增量保存变更单元格（核心命令） */
  saveCells: (path: string, changes: CellChange[]) =>
    invoke<void>('save_cells', { path, changes }),
}
