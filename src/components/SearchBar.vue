<script setup lang="ts">
import { ref } from 'vue'
import { useExcelStore } from '@/stores/excelStore'

const excelStore = useExcelStore()
const keyword = ref<string>('')

function handleSearch() {
  excelStore.search(keyword.value)
}

function handleClear() {
  keyword.value = ''
  excelStore.clearSearch()
}
</script>

<template>
  <div class="search-bar">
    <el-input
      v-model="keyword"
      placeholder="输入关键词模糊搜索..."
      clearable
      size="large"
      @input="handleSearch"
      @clear="handleClear"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
  </div>
</template>

<style scoped>
.search-bar {
  width: 100%;
}
</style>
