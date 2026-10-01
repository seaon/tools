<script setup lang="ts">
import { useExcelStore } from '@/stores/excelStore'
import { useEditStore } from '@/stores/editStore'

const excelStore = useExcelStore()
const editStore = useEditStore()

/** 判断单元格是否为脏单元格 */
function isDirty(col: string): boolean {
  if (!editStore.selectedRow) return false
  const colIndex = excelStore.headers.indexOf(col) + 1
  const rowNum = editStore.selectedRow.__rowNum
  return editStore.dirtyCells.some((d) => d.row === rowNum && d.col === colIndex)
}
</script>

<template>
  <div v-if="editStore.selectedRow" class="editable-row">
    <el-card shadow="never">
      <template #header>
        <div class="row-header">
          <span class="row-title">第 {{ editStore.selectedRow.__rowNum }} 行</span>
          <el-tag v-if="editStore.hasUnsavedChanges" type="warning" size="small">
            {{ editStore.dirtyCount }} 处修改
          </el-tag>
        </div>
      </template>
      <el-form label-position="top" class="row-form">
        <el-form-item v-for="col in excelStore.visibleHeaders" :key="col" :label="col">
          <div class="cell-wrapper" :class="{ dirty: isDirty(col) }">
            <el-input
              :model-value="String(editStore.selectedRow[col] ?? '')"
              @update:model-value="(val: string | number) => editStore.updateCell(col, val)"
              size="small"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
  <el-empty v-else description="请先搜索并选择一行" />
</template>

<style scoped>
.row-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.row-title {
  font-weight: 600;
  font-size: 15px;
}

.row-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.cell-wrapper {
  width: 100%;
}

.cell-wrapper.dirty :deep(.el-input__wrapper) {
  background-color: #fffbe6;
  box-shadow: 0 0 0 1px #e6a23c inset !important;
}
</style>
