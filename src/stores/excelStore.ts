import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { tauriApi } from '@/types/tauri'
import type { ExcelRow, RawExcelRow } from '@/types/excel'
import { fuzzySearch } from '@/utils/search'

export const useExcelStore = defineStore('excel', () => {
  // ── state ──
  const filePath = ref<string>('')
  const sheetName = ref<string>('')
  const headers = ref<string[]>([])
  const hiddenColumns = ref<number[]>([])
  const rows = ref<ExcelRow[]>([])
  const searchResults = ref<ExcelRow[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  // ── getters ──
  const isEmpty = computed(() => rows.value.length === 0)
  /** 可见列（排除 Excel 中隐藏的列） */
  const visibleHeaders = computed(() =>
    headers.value.filter((_, idx) => !hiddenColumns.value.includes(idx + 1))
  )

  // ── actions ──

  /** 打开文件对话框并读取文件 */
  async function loadFile() {
    error.value = ''
    const path = await tauriApi.openFileDialog()
    if (!path) return

    loading.value = true
    try {
      const data = await tauriApi.readExcel(path)
      filePath.value = data.path
      sheetName.value = data.sheetName
      headers.value = data.headers
      hiddenColumns.value = data.hiddenColumns ?? []

      // 转换行数据：将 {row_num, values[]} 转为 {__rowNum, [header]: value}
      rows.value = data.rows.map((row: RawExcelRow) => {
        const obj: Record<string, string | number | boolean | null> = { __rowNum: row.row_num }
        data.headers.forEach((header, idx) => {
          obj[header] = row.values[idx] ?? ''
        })
        return obj as ExcelRow
      })

      // 开发模式：打印列数据（表头 + 每列抽样值），方便排查列/行数据量问题
      if (import.meta.env.DEV) {
        const columnSample: Record<string, string[]> = {}
        data.headers.forEach((header, idx) => {
          columnSample[header] = data.rows
            .slice(0, 20)
            .map((r) => r.values[idx] ?? '')
            .filter((v) => v !== '')
            .slice(0, 3)
        })
        console.log('[dev] Excel 读取结果', {
          sheetName: data.sheetName,
          headers: data.headers,
          headerCount: data.headers.length,
          rowCount: data.rows.length,
        })
        console.log('[dev] 列数据抽样（每列前 3 个非空值）', columnSample)
      }

      searchResults.value = []
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  /** 模糊搜索（返回结果数组，便于 el-autocomplete 等下拉组件使用） */
  function search(keyword: string): ExcelRow[] {
    const results = fuzzySearch(rows.value, headers.value, keyword)
    searchResults.value = results
    return results
  }

  /** 清空搜索结果 */
  function clearSearch() {
    searchResults.value = []
  }

  return {
    filePath,
    sheetName,
    headers,
    hiddenColumns,
    visibleHeaders,
    rows,
    searchResults,
    loading,
    error,
    isEmpty,
    loadFile,
    search,
    clearSearch,
  }
})
