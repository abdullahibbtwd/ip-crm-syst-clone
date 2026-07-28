import type { ClientSort, ClientSortBy, SortOrder } from './types'

export {
  DEFAULT_PAGE_SIZE as DEFAULT_CLIENT_PAGE_SIZE,
  MAX_PAGE_SIZE as MAX_CLIENT_PAGE_SIZE,
  MIN_PAGE_SIZE as MIN_CLIENT_PAGE_SIZE,
  parsePageSize as parseClientPageSize,
} from '@/lib/pagination'

export const CLIENT_SORT_OPTIONS: {
  value: ClientSort
  sortBy: ClientSortBy
  sortOrder: SortOrder
  labelKey: string
}[] = [
  { value: 'createdAt_desc', sortBy: 'createdAt', sortOrder: 'desc', labelKey: 'clients.sort.newest' },
  { value: 'createdAt_asc', sortBy: 'createdAt', sortOrder: 'asc', labelKey: 'clients.sort.oldest' },
  { value: 'updatedAt_desc', sortBy: 'updatedAt', sortOrder: 'desc', labelKey: 'clients.sort.recentlyUpdated' },
  { value: 'name_asc', sortBy: 'name', sortOrder: 'asc', labelKey: 'clients.sort.nameAsc' },
  { value: 'name_desc', sortBy: 'name', sortOrder: 'desc', labelKey: 'clients.sort.nameDesc' },
  { value: 'internalCode_asc', sortBy: 'internalCode', sortOrder: 'asc', labelKey: 'clients.sort.codeAsc' },
  { value: 'internalCode_desc', sortBy: 'internalCode', sortOrder: 'desc', labelKey: 'clients.sort.codeDesc' },
]

export const DEFAULT_CLIENT_SORT: ClientSort = 'createdAt_desc'

export function parseClientSort(value: string): { sortBy: ClientSortBy; sortOrder: SortOrder } {
  const match = CLIENT_SORT_OPTIONS.find((option) => option.value === value)
  if (match) return { sortBy: match.sortBy, sortOrder: match.sortOrder }
  return { sortBy: 'createdAt', sortOrder: 'desc' }
}

export function clientSortLabelKey(value: string): string {
  const match = CLIENT_SORT_OPTIONS.find((option) => option.value === value)
  return match?.labelKey ?? 'clients.sort.label'
}
