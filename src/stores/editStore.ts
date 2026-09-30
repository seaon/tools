import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { tauriApi } from '@/types/tauri'
import { useExcelStore } from './excelStore'
import type { ExcelRow, CellChange } from '@/types/excel'

export const useEditStore = defineStore('edit', () => {
  const excelStore = useExcelStore()

  // ── state ──
  const selectedRow = ref<ExcelRow | null>(null)
  const originalRow = ref<ExcelRow | null>(null)
  const dirtyCells = ref<CellChange[]>([])
  const saving = ref<boolean>(false)

  // ── getters ──
  const dirtyCount = computed(() => dirtyCells.value.length)
  const hasUnsavedChanges = computed(() => dirtyCount.value > 0)

  // ── actions ──

  /** 选择一行进行编辑 */
  function selectRow(row: ExcelRow) {
    selectedRow.value = { ...row }
    originalRow.value = { ...row }
    dirtyCells.value = []
  }

  /** 更新单元格值，追踪脏单元格 */
  function updateCell(column: string, newValue: string | number) {
    if (!selectedRow.value || !originalRow.value) return

    selectedRow.value[column] = newValue

    const originalValue = originalRow.value[column]
    const colIndex = excelStore.headers.indexOf(column) + 1 // 1-based
    const rowNum = selectedRow.value.__rowNum

    if (String(newValue) !== String(originalValue)) {
      // 值已变化 → 加入或更新脏单元格
      const existing = dirtyCells.value.findIndex(
        (d) => d.row === rowNum && d.col === colIndex
      )
      const change: CellChange = {
        row: rowNum,
        col: colIndex,
        newValue: String(newValue),
      }
      if (existing >= 0) {
        dirtyCells.value[existing] = change
      } else {
        dirtyCells.value.push(change)
      }
    } else {
      // 值已恢复原样 → 移除脏标记
      dirtyCells.value = dirtyCells.value.filter(
        (d) => !(d.row === rowNum && d.col === colIndex)
      )
    }
  }

  /** 保存变更单元格到原文件 */
  async function save(): Promise<boolean> {
    if (dirtyCells.value.length === 0) return true
    if (!excelStore.filePath) return false

    saving.value = true
    try {
      await tauriApi.saveCells(excelStore.filePath, dirtyCells.value)
      originalRow.value = selectedRow.value ? { ...selectedRow.value } : null
      dirtyCells.value = []
      ElMessage.success(`已保存 ${dirtyCount.value} 处修改`)
      return true
    } catch (e) {
      ElMessage.error(`保存失败: ${String(e)}`)
      return false
    } finally {
      saving.value = false
    }
  }

  /** 放弃修改，恢复原始值 */
  function discardChanges() {
    if (originalRow.value) {
      selectedRow.value = { ...originalRow.value }
    }
    dirtyCells.value = []
  }

  return {
    selectedRow,
    originalRow,
    dirtyCells,
    saving,
    dirtyCount,
    hasUnsavedChanges,
    selectRow,
    updateCell,
    save,
    discardChanges,
  }
})
