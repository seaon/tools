<script setup lang="ts">
import { useExcelStore } from '@/stores/excelStore'
import { useEditStore } from '@/stores/editStore'

const excelStore = useExcelStore()
const editStore = useEditStore()
</script>

<template>
  <div class="status-bar">
    <div class="status-left">
      <span v-if="excelStore.filePath" class="status-item">
        文件: {{ excelStore.rows.length }} 行
      </span>
      <span v-if="editStore.hasUnsavedChanges" class="status-item status-dirty">
        {{ editStore.dirtyCount }} 处未保存
      </span>
    </div>
    <div class="status-right">
      <el-button
        v-if="editStore.hasUnsavedChanges"
        type="success"
        size="small"
        :loading="editStore.saving"
        @click="editStore.save()"
      >
        保存修改
      </el-button>
      <el-button
        v-if="editStore.hasUnsavedChanges"
        size="small"
        @click="editStore.discardChanges()"
      >
        放弃修改
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.status-left {
  display: flex;
  gap: 16px;
}

.status-item {
  font-size: 13px;
  color: #606266;
}

.status-dirty {
  color: #e6a23c;
  font-weight: 500;
}

.status-right {
  display: flex;
  gap: 8px;
}
</style>
