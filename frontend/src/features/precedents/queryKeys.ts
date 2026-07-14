import type { ListPrecedentsParams } from './types'

export const precedentKeys = {
  all: ['precedents'] as const,
  lists: () => [...precedentKeys.all, 'list'] as const,
  list: (params?: ListPrecedentsParams) => [...precedentKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...precedentKeys.all, 'detail', id] as const,
}
