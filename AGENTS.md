# AGENTS.md — Excel 数据修改工具

> AI 编程助手（Cursor / Copilot / Claude Code 等）读取此文件以了解项目上下文。
> 本文件定义了项目的**架构、约定、红线**，请严格遵守。

---

## 1. 项目概述

| 项目 | 说明 |
|------|------|
| **名称** | Excel 数据修改工具 |
| **用途** | 面向非技术人员的 Excel 数据检索与编辑工具 |
| **核心功能** | 模糊搜索 → 下拉选择 → 行展示 → 单元格编辑 → 增量保存 |
| **目标用户** | 办公室文员（零技术背景，双击 exe 即用） |
| **数据规模** | 单文件 ≤ 5000 行 |

### 产品流程

```
打开Excel文件 → 输入关键词模糊搜索 → 下拉选择匹配行
→ 展示该行所有字段（可编辑）→ 修改单元格
→ 仅提交变更单元格 → 保存回原文件
```

---

## 2. 技术栈（固定，不可更换）

| 层 | 技术 | 版本要求 | 说明 |
|----|------|---------|------|
| **桌面框架** | Tauri | v2.x | 打包为单个 `.exe` |
| **前端框架** | Vue 3 | ≥ 3.4 | 组合式 API（`<script setup>`） |
| **UI 组件库** | Element Plus | ≥ 2.7 | 表格、下拉、输入框、对话框 |
| **模糊搜索** | Fuse.js | ^7.x | 纯前端，不走 Rust |
| **状态管理** | Pinia | ^2.x | 全局状态 |
| **Excel 读写** | umya-spreadsheet | ^0.21 | Rust crate，保留格式的精准单元格修改 |
| **序列化** | serde + serde_json | latest | Rust ↔ JS 数据传递 |
| **打包** | Tauri CLI + NSIS | latest | 输出 Windows 单文件 exe |

### 不允许引入

- ❌ Vite 之外的构建工具
- ❌ axios / fetch 直接请求外部 API
- ❌ `pandas`、`xlsx`（JS端）、`exceljs` 等其他 Excel 库
- ❌ 全局状态存储到 localStorage（会话内内存状态即可）
- ❌ React、Svelte、Angular（前端固定 Vue 3）

---

## 3. 项目结构

```
project-root/
├── AGENTS.md                  # ← 你正在读的文件
├── package.json
├── vite.config.ts
│
├── src/                       # ┌─── Vue 3 前端 ───┐
│   ├── main.ts                #   入口
│   ├── App.vue                #   根组件
│   │
│   ├── types/                 #   类型定义
│   │   ├── excel.ts           #     Cell、Row、Header 等类型
│   │   └── tauri.ts           #     Tauri command 参数类型
│   │
│   ├── stores/                #   Pinia store
│   │   ├── excelStore.ts      #     Excel 文件、数据、搜索结果
│   │   └── editStore.ts       #     编辑状态、脏单元格（dirty cells）
│   │
│   ├── utils/
│   │   └── search.ts          #   Fuse.js 初始化与模糊搜索逻辑
│   │
│   ├── components/            #   可复用组件
│   │   ├── FileSelector.vue   #     文件选择
│   │   ├── SearchBar.vue      #     搜索框 + 下拉联想
│   │   ├── ResultPicker.vue   #     搜索结果下拉列表
│   │   ├── EditableRow.vue    #     展示选中行（可编辑单元格）
│   │   └── StatusBar.vue      #     底部状态栏（脏单元格计数、保存状态）
│   │
│   └── views/
│       └── MainView.vue       #   主视图（组合各组件）
│
└── src-tauri/                 # ┌─── Rust 后端 ─────┐
    ├── Cargo.toml             #   依赖声明
    ├── tauri.conf.json        #   打包配置（窗口、NSIS）
    ├── capabilities/
    │   └── default.json       #   Tauri v2 权限声明
    │
    └── src/
        ├── main.rs            #   Tauri 入口 + command 注册
        │
        └── commands/
            ├── mod.rs
            ├── excel_reader.rs    #   读取文件、返回 sheet 数据
            ├── excel_writer.rs    #   增量写入变更单元格
            └── file_dialog.rs     #   打开/保存文件对话框
```

---

## 4. 数据流与通信

### 4.1 前端 → Rust（Tauri Commands）

所有 Rust 侧暴露的命令：

```typescript
// src/types/tauri.ts

// 打开文件对话框，返回文件路径（或 null）
invoke<string | null>('open_file_dialog')

// 读取 Excel 文件，返回表头 + 全部行数据
invoke<ExcelData>('read_excel', { path: string })

// 增量保存变更单元格（核心命令）
invoke<void>('save_cells', {
  path: string,
  changes: CellChange[]   // 仅变更的单元格数组
})
```

### 4.2 关键类型定义

```typescript
// src/types/excel.ts

/** 单个变更的单元格 */
export interface CellChange {
  row: number      // 行号（1-based，与 Excel 一致）
  col: number      // 列号（1-based，与 Excel 一致）
  newValue: string // 修改后的值
}

/** 完整行数据 */
export interface ExcelRow {
  __rowNum: number              // Excel 中的真实行号（1-based）
  [column: string]: string | number | boolean | null | number // 列名 → 值
}

/** Excel 文件读取结果 */
export interface ExcelData {
  path: string       // 文件路径
  sheetName: string  // 工作表名
  headers: string[]  // 表头数组（按列顺序）
  rows: ExcelRow[]   // 全部数据行
}
```

```rust
// src-tauri/src/commands/excel_writer.rs

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CellChange {
    pub row: u32,
    pub col: u32,
    pub new_value: String,
}
```

### 4.3 数据流图

```
用户操作                前端 (Vue)                 Rust (Tauri)
────────               ──────────                 ─────────────
                       excelStore.allRows
打开文件 ──────────→  invoke('read_excel')  ──→  umya-spreadsheet::read()
                                  ←── ExcelData ──  headers + rows

输入关键词
模糊搜索 ──────────→  Fuse.js (纯前端)     ✗     不涉及 Rust
                       fuse.search(keyword)

选择结果行
展示可编辑行 ──────→  editStore.selectedRow

编辑单元格
                       editStore.dirtyCells    // 只记录变化的
                       [{row:5, col:2, new:"XX"}]
保存 ──────────────→  invoke('save_cells')  ──→  遍历 changes
                                                   ws.get_cell_mut((col, row))
                                                   .set_value(new_value)
                                                   spreadsheet.write_to_path()
                         ←── 成功 ────────────  仅写入 changes 中的单元格
```

---

## 5. 核心业务规则（红线）

### 5.1 Excel 操作规则

| 规则 | 说明 |
|------|------|
| **只改指定单元格** | Rust 端只对 `changes` 数组中列出的单元格调用 `set_value` |
| **保留原文件格式** | 读写均用 `umya-spreadsheet`，不转换格式、不重建表格 |
| **行号列号 1-based** | 行号、列号从 1 开始，与 Excel 界面一致，**不要改成 0-based** |
| **原地保存** | `write_to_path(path)` 直接覆盖原文件，不做备份另存 |
| **仅支持 .xlsx** | 暂不支持 .xls / .csv / .xlsb |
| **单 Sheet** | 读取 `sheet_index = 0`（第一个工作表），不支持切换 Sheet（可后续扩展） |
| **公式处理** | umya-spreadsheet 读取单元格值（非公式），编辑后写入为纯文本值。**若单元格有公式，被用户修改后公式会被替换为值——这是预期行为** |

### 5.2 模糊搜索规则

| 规则 | 说明 |
|------|------|
| **搜索范围** | 当前 Excel 全部行的**所有列**拼接为一个字符串进行匹配 |
| **阈值** | Fuse.js `threshold: 0.4`（0=精确，1=完全宽松） |
| **最多返回** | 50 条结果，按相似度排序（分数越高越靠前） |
| **搜索位置** | 纯前端（Fuse.js），**不调用 Rust** |
| **去重** | 同一行只出现一次 |

### 5.3 编辑与保存规则

| 规则 | 说明 |
|------|------|
| **脏单元格追踪** | 前端编辑时与原始值对比，只在值真正变化时加入 `dirtyCells` |
| **取消修改** | 用户可将值改回原始值 → 自动从 `dirtyCells` 中移除 |
| **保存后清空** | `save_cells` 成功后清空 `dirtyCells`，重置 `originalRow` |
| **行切换保护** | 切换到另一行时，若有未保存修改 → 弹确认框（保存/丢弃/取消） |
| **保存失败** | Rust 返回错误 → 前端展示 `ElMessage.error`，**不清空 dirtyCells** |

---

## 6. 前端编码约定

### 6.1 组件规范

```vue
<!-- ✅ 标准组件模板 -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps<{ /* ... */ }>()

// Emits
const emit = defineEmits<{ /* ... */ }>()

// 状态
const state = ref<string>('')

// 计算属性
const derived = computed(() => state.value.trim())

// 方法
function handleClick() {
  emit('select', derived.value)
}
</script>

<template>
  <el-container>
    <!-- 模板 -->
  </el-container>
</template>
```

### 6.2 状态管理（Pinia）

```typescript
// src/stores/excelStore.ts
export const useExcelStore = defineStore('excel', () => {
  // ── state ──
  const filePath = ref<string>('')
  const headers = ref<string[]>([])
  const rows = ref<ExcelRow[]>([])
  const searchResults = ref<ExcelRow[]>([])

  // ── getters ──
  const isEmpty = computed(() => rows.value.length === 0)

  // ── actions ──
  async function loadFile() { /* invoke read_excel */ }
  function search(keyword: string) { /* Fuse.js */ }

  return { filePath, headers, rows, searchResults, isEmpty, loadFile, search }
})
```

```typescript
// src/stores/editStore.ts
export const useEditStore = defineStore('edit', () => {
  // ── state ──
  const selectedRow = ref<ExcelRow | null>(null)
  const originalRow = ref<ExcelRow | null>(null)  // 用于对比
  const dirtyCells = ref<CellChange[]>([])

  // ── getters ──
  const dirtyCount = computed(() => dirtyCells.value.length)
  const hasUnsavedChanges = computed(() => dirtyCount.value > 0)

  // ── actions ──
  function selectRow(row: ExcelRow) {
    selectedRow.value = { ...row }
    originalRow.value = { ...row }
    dirtyCells.value = []
  }

  function updateCell(column: string, newValue: string | number) {
    if (!selectedRow.value || !originalRow.value) return

    selectedRow.value[column] = newValue

    const originalValue = originalRow.value[column]
    const colIndex = /* headers.indexOf(column) + 1  (1-based) */
    const rowNum = selectedRow.value.__rowNum

    // 与原始值对比
    if (String(newValue) !== String(originalValue)) {
      // 若已存在则更新，否则新增
      const existing = dirtyCells.value.findIndex(
        d => d.row === rowNum && d.col === colIndex
      )
      const change: CellChange = { row: rowNum, col: colIndex, newValue: String(newValue) }
      if (existing >= 0) dirtyCells.value[existing] = change
      else dirtyCells.value.push(change)
    } else {
      // 值已恢复原样 → 移除脏标记
      dirtyCells.value = dirtyCells.value.filter(
        d => !(d.row === rowNum && d.col === colIndex)
      )
    }
  }

  async function save() {
    if (dirtyCells.value.length === 0) return
    await invoke('save_cells', { path: excelStore.filePath, changes: dirtyCells.value })
    originalRow.value = { ...selectedRow.value }
    dirtyCells.value = []
  }

  return { selectedRow, originalRow, dirtyCells, dirtyCount, hasUnsavedChanges,
           selectRow, updateCell, save }
})
```

### 6.3 Fuse.js 搜索配置

```typescript
// src/utils/search.ts
import Fuse from 'fuse.js'
import type { ExcelRow } from '@/types/excel'

export function createSearcher(rows: ExcelRow[], headers: string[]) {
  return new Fuse(rows, {
    keys: headers,           // 搜索所有列
    threshold: 0.4,          // 模糊度
    includeScore: true,      // 返回相似度分数
    includeMatches: true,    // 高亮匹配片段（可选）
    minMatchCharLength: 1,
    shouldSort: true,        // 按分数排序
    findAllMatches: true,
  })
}

// 返回前 50 条
export function fuzzySearch(rows: ExcelRow[], headers: string[], keyword: string): ExcelRow[] {
  if (!keyword.trim()) return []
  const searcher = createSearcher(rows, headers)
  return searcher.search(keyword).slice(0, 50).map(r => r.item)
}
```

### 6.4 Rust Command 接口定义（前端侧）

```typescript
// src/types/tauri.ts
import { invoke } from '@tauri-apps/api/core'
import type { ExcelData, CellChange } from './excel'

export const tauriApi = {
  openFileDialog: () => invoke<string | null>('open_file_dialog'),
  readExcel: (path: string) => invoke<ExcelData>('read_excel', { path }),
  saveCells: (path: string, changes: CellChange[]) =>
    invoke<void>('save_cells', { path, changes }),
}
```

---

## 7. Rust 编码约定

### 7.1 Command 命名

```
✅ open_file_dialog    // 打开文件对话框
✅ read_excel          // 读取 Excel
✅ save_cells          // 保存变更单元格

❌ openFile            // 驼峰
❌ read_excel_file     // 冗余
```

### 7.2 错误处理

```rust
// ✅ 使用 Result<T, String> 向前端返回错误
#[tauri::command]
fn read_excel(path: String) -> Result<ExcelData, String> {
    let spreadsheet = Spreadsheet::read_file(&path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let sheet = spreadsheet.get_sheet_by_index(0)
        .ok_or("找不到工作表")?;

    // ... 构建 ExcelData

    Ok(ExcelData { path, sheet_name, headers, rows })
}
```

### 7.3 核心写入逻辑

```rust
// src-tauri/src/commands/excel_writer.rs
#[tauri::command]
pub fn save_cells(path: String, changes: Vec<CellChange>) -> Result<(), String> {
    if changes.is_empty() {
        return Ok(());
    }

    // 1. 读取原始文件
    let mut spreadsheet = Spreadsheet::read_file(&path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    let sheet = spreadsheet.get_sheet_by_index_mut(0)
        .ok_or("找不到工作表")?;

    // 2. 仅修改传入的变更单元格
    for change in changes {
        sheet
            .get_cell_mut((change.col, change.row))  // (col, row) 1-based
            .set_value(&change.new_value);
    }

    // 3. 原地写回
    spreadsheet
        .write_to_path(Path::new(&path))
        .map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(())
}
```

---

## 8. UI/UX 约定

### 8.1 Element Plus 使用规范

| 场景 | 组件 | 备注 |
|------|------|------|
| 文件选择 | `el-upload` 或自定义 + `invoke('open_file_dialog')` | 推荐 Tauri 原生对话框 |
| 模糊搜索 | `el-autocomplete` | `:fetch-suggestions` 绑定 Fuse.js |
| 搜索结果列表 | `el-select`（远程搜索）或下拉面板 | 显示行号 + 关键片段 |
| 行数据展示 | `el-table` + `el-input`（可编辑单元格） | 或自定义 grid |
| 脏单元格高亮 | `<el-input>` 外层 `class="cell-dirty"` | CSS 背景变黄 |
| 保存按钮 | `el-button type="success"` | 显示变更计数 |
| 操作反馈 | `ElMessage.success/error/warning` | 统一使用 |

### 8.2 脏单元格视觉反馈

```vue
<!-- EditableRow.vue -->
<template>
  <div class="cell-wrapper" :class="{ dirty: isDirty(col) }">
    <el-input
      :model-value="row[col]"
      @update:model-value="(val) => editStore.updateCell(col, val)"
      size="small"
    />
  </div>
</template>

<style scoped>
.dirty :deep(.el-input__wrapper) {
  background-color: #fffbe6;    /* 浅黄色背景 */
  box-shadow: 0 0 0 1px #e6a23c inset !important;
}
</style>
```

### 8.3 窗口尺寸（tauri.conf.json）

```json
{
  "app": {
    "windows": [
      {
        "title": "Excel 数据修改工具",
        "width": 900,
        "height": 640,
        "resizable": true,
        "minWidth": 700,
        "minHeight": 500
      }
    ]
  },
  "bundle": {
    "targets": ["nsis"],
    "nsis": {
      "installMode": "currentUser",
      "oneClick": true
    }
  }
}
```

---

## 9. 构建与运行命令

```bash
# ── 开发 ──
npm run tauri dev            # 启动开发模式（热重载）

# ── 仅前端 ──
npm run dev                  # Vite 开发服务器

# ── 构建发布版 ──
npm run tauri build          # 输出 src-tauri/target/release/bundle/

# ── Rust 测试 ──
cd src-tauri && cargo test

# ── 前端测试 ──
npm run test
```

---

## 10. 常见任务清单

当被要求完成以下任务时，参考此清单：

### 「新增一个搜索列」
1. `src/types/excel.ts` → 确认 `ExcelRow` 类型已包含该列
2. `src/utils/search.ts` → Fuse.js `keys` 自动取 `headers`，确认表头读取正确
3. `src/stores/excelStore.ts` → `loadFile` 中 headers 解析是否包含新列
4. 无需改 Rust

### 「新增一个编辑字段」
1. `src/components/EditableRow.vue` → 确认列渲染是动态的（`v-for="col in headers"`）
2. `src/stores/editStore.ts` → `updateCell` 应已通用
3. 无需改 Rust（`save_cells` 接收通用 `CellChange[]`）

### 「支持选择 Sheet」
1. `src-tauri/src/commands/excel_reader.rs` → `read_excel` 增加 `sheet_index` 参数
2. `src/stores/excelStore.ts` → 增加 `currentSheetIndex` state
3. `src/components/FileSelector.vue` → 加 Sheet 选择下拉框
4. **注意**：切换 Sheet 后需清空搜索和编辑状态

### 「文件保存前自动备份」
1. `src-tauri/src/commands/excel_writer.rs` → `save_cells` 开头：
   ```rust
   let backup_path = format!("{}.bak", path);
   std::fs::copy(&path, &backup_path).map_err(|e| e.to_string())?;
   ```

---

## 11. 红线（绝对不能做）

| ❌ 禁止 | 原因 |
|---------|------|
| 在 Rust 中整体重写 Excel（删除后新建 sheet） | 会丢失所有格式、公式、条件格式 |
| 使用 `xlsx` 或 `exceljs` 等 JS Excel 库 | 换到 Rust `umya-spreadsheet` 统一处理 |
| 前端直接调用 `fs` 读写文件 | 必须通过 Tauri Command 走 Rust |
| 将整个 rows 传给 Rust 保存 | 只传 `dirtyCells`（变更的单元格） |
| 搜索走 Rust Command | 搜索在前端 Fuse.js 完成，避免 IPC 开销 |
| 保存后弹窗确认 | 设计为「实时保存」，点保存即生效 |
| 行号从 0 开始 | 全项目行号、列号统一 1-based |
| 引入不需要的大型依赖 | 关注 exe 体积（目标 < 15MB） |

---

## 12. 技术栈版本锁定

```json
// package.json 关键依赖
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.7.0",
    "fuse.js": "^7.0.0",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "vue-tsc": "^2.0.0",
    "typescript": "^5.4.0",
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0"
  }
}
```

```toml
# src-tauri/Cargo.toml 关键依赖
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-dialog = "2"          # 文件对话框
serde = { version = "1", features = ["derive"] }
serde_json = "1"
umya-spreadsheet = "0.21"          # Excel 读写
```

---

*此文件应在每次重大架构变更时同步更新。若 AI 助手发现本文件与实际代码不一致，以实际代码为准并提示用户。*
