export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const MIN_PAGE_SIZE = 1

export function parsePageSize(value: string, fallback = DEFAULT_PAGE_SIZE): number {
  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(MIN_PAGE_SIZE, Math.min(parsed, MAX_PAGE_SIZE))
}

export function clampPage(value: number, pageCount?: number): number {
  const maxPage = pageCount != null && pageCount > 0 ? pageCount : value
  return Math.max(1, Math.min(value, maxPage))
}
