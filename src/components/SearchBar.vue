<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useExcelStore } from '@/stores/excelStore'
import { useEditStore } from '@/stores/editStore'
import type { ExcelRow } from '@/types/excel'

const excelStore = useExcelStore()
const editStore = useEditStore()

const keyword = ref<string>('')

interface Suggestion {
  /** 下拉项显示的文案 */
  value: string
  /** 对应的原始行数据 */
  row: ExcelRow
}

/** 格式化搜索结果（下拉项显示文案） */
function formatResult(row: ExcelRow): string {
  const parts = excelStore.visibleHeaders
    .slice(0, 3)
    .map((h) => String(row[h] ?? ''))
    .filter(Boolean)
  return `第 ${row.__rowNum} 行: ${parts.join(' | ')}`
}

/** el-autocomplete 远程搜索：输入时触发，返回下拉建议 */
function querySearch(query: string, cb: (suggestions: Suggestion[]) => void) {
  const q = query.trim()
  if (!q) {
    cb([])
    return
  }
  const results = excelStore.search(q)
  cb(results.map((row) => ({ value: formatResult(row), row })))
}

/** 选中某条结果：带未保存修改保护，选中后下拉自动收起 */
async function handleSelect(item: Suggestion) {
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
  editStore.selectRow(item.row)
}
</script>

<template>
  <div class="search-bar">
    <el-autocomplete
      v-model="keyword"
      :fetch-suggestions="querySearch"
      :trigger-on-focus="false"
      placeholder="输入关键词模糊搜索..."
      clearable
      size="large"
      class="search-autocomplete"
      @select="handleSelect"
      @clear="excelStore.clearSearch()"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-autocomplete>
  </div>
</template>

<style scoped>
.search-bar {
  width: 100%;
}

.search-autocomplete {
  width: 100%;
}
</style>
