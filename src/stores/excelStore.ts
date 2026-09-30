import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { tauriApi } from '@/types/tauri'
import type { ExcelRow } from '@/types/excel'
import { fuzzySearch } from '@/utils/search'

export const useExcelStore = defineStore('excel', () => {
  // ── state ──
  const filePath = ref<string>('')
  const sheetName = ref<string>('')
  const headers = ref<string[]>([])
  const rows = ref<ExcelRow[]>([])
  const searchResults = ref<ExcelRow[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  // ── getters ──
  const isEmpty = computed(() => rows.value.length === 0)

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
      rows.value = data.rows
      searchResults.value = []
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  /** 模糊搜索 */
  function search(keyword: string) {
    searchResults.value = fuzzySearch(rows.value, headers.value, keyword)
  }

  /** 清空搜索结果 */
  function clearSearch() {
    searchResults.value = []
  }

  return {
    filePath,
    sheetName,
    headers,
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
