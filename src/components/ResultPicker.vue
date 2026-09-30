<script setup lang="ts">
import { useExcelStore } from '@/stores/excelStore'
import { useEditStore } from '@/stores/editStore'
import { ElMessageBox } from 'element-plus'
import type { ExcelRow } from '@/types/excel'

const excelStore = useExcelStore()
const editStore = useEditStore()

/** 格式化显示搜索结果 */
function formatResult(row: ExcelRow): string {
  const parts = excelStore.headers
    .slice(0, 3)
    .map((h) => String(row[h] ?? ''))
    .filter(Boolean)
  return `第 ${row.__rowNum} 行: ${parts.join(' | ')}`
}

/** 选择结果行（带未保存修改保护） */
async function handleSelect(row: ExcelRow) {
  if (editStore.hasUnsavedChanges) {
    try {
      await ElMessageBox.confirm(
        '当前有未保存的修改，切换行将丢失这些修改。是否继续？',
        '提示',
        {
          confirmButtonText: '丢弃并切换',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    } catch {
      return
    }
  }
  editStore.selectRow(row)
}
</script>

<template>
  <div v-if="excelStore.searchResults.length > 0" class="result-picker">
    <el-card shadow="never" class="result-card">
      <template #header>
        <span>搜索结果 ({{ excelStore.searchResults.length }} 条)</span>
      </template>
      <el-scrollbar max-height="200px">
        <div
          v-for="row in excelStore.searchResults"
          :key="row.__rowNum"
          class="result-item"
          @click="handleSelect(row)"
        >
          {{ formatResult(row) }}
        </div>
      </el-scrollbar>
    </el-card>
  </div>
</template>

<style scoped>
.result-picker {
  margin-top: 8px;
}

.result-card {
  border: 1px solid #e4e7ed;
}

.result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: #f5f7fa;
}
</style>
