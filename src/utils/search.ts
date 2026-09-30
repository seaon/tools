import Fuse from 'fuse.js'
import type { ExcelRow } from '@/types/excel'

/**
 * 创建 Fuse.js 搜索实例
 * 搜索范围：所有列，阈值 0.4，最多返回 50 条
 */
export function createSearcher(rows: ExcelRow[], headers: string[]) {
  return new Fuse(rows, {
    keys: headers,
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 1,
    shouldSort: true,
    findAllMatches: true,
  })
}

/**
 * 模糊搜索，返回前 50 条结果
 */
export function fuzzySearch(
  rows: ExcelRow[],
  headers: string[],
  keyword: string
): ExcelRow[] {
  if (!keyword.trim()) return []
  const searcher = createSearcher(rows, headers)
  return searcher.search(keyword).slice(0, 50).map((r) => r.item)
}
