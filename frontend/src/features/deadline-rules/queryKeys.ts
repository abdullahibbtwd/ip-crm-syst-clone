import type { ListDeadlineRulesParams } from './types'

export const deadlineRulesKeys = {
  all: ['deadline-rules'] as const,
  lists: () => [...deadlineRulesKeys.all, 'list'] as const,
  list: (params?: ListDeadlineRulesParams) =>
    [...deadlineRulesKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...deadlineRulesKeys.all, 'detail', id] as const,
}
