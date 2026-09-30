<script setup lang="ts">
import { useExcelStore } from '@/stores/excelStore'

const excelStore = useExcelStore()
</script>

<template>
  <div class="file-selector">
    <el-button type="primary" :loading="excelStore.loading" @click="excelStore.loadFile()">
      打开 Excel 文件
    </el-button>
    <span v-if="excelStore.filePath" class="file-path">
      {{ excelStore.filePath }}
    </span>
    <span v-if="excelStore.sheetName" class="sheet-name">
      [{{ excelStore.sheetName }}]
    </span>
  </div>
</template>

<style scoped>
.file-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-path {
  color: #606266;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400px;
}

.sheet-name {
  color: #909399;
  font-size: 12px;
}
</style>
