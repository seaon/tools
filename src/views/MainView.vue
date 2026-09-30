<script setup lang="ts">
import FileSelector from '@/components/FileSelector.vue'
import SearchBar from '@/components/SearchBar.vue'
import ResultPicker from '@/components/ResultPicker.vue'
import EditableRow from '@/components/EditableRow.vue'
import StatusBar from '@/components/StatusBar.vue'
import { useExcelStore } from '@/stores/excelStore'

const excelStore = useExcelStore()
</script>

<template>
  <el-container class="main-container">
    <el-header class="main-header">
      <h1 class="app-title">Excel 数据修改工具</h1>
      <FileSelector />
    </el-header>

    <el-main v-if="!excelStore.isEmpty" class="main-content">
      <SearchBar />
      <ResultPicker />
      <EditableRow />
    </el-main>

    <el-main v-else class="main-content-empty">
      <el-empty description="请点击上方按钮打开 Excel 文件" />
    </el-main>

    <el-footer class="main-footer">
      <StatusBar />
    </el-footer>
  </el-container>
</template>

<style scoped>
.main-container {
  height: 100vh;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fff;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.main-content {
  padding: 16px;
  overflow-y: auto;
}

.main-content-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-footer {
  padding: 0;
  height: auto;
}
</style>
