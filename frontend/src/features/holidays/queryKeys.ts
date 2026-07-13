import type { ListHolidaysParams } from './types'

export const holidaysKeys = {
  all: ['holidays'] as const,
  lists: () => [...holidaysKeys.all, 'list'] as const,
  list: (params?: ListHolidaysParams) =>
    [...holidaysKeys.lists(), params ?? {}] as const,
}
