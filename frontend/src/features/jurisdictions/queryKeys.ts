import type { ListJurisdictionsParams } from './types'

export const jurisdictionsKeys = {
  all: ['jurisdictions'] as const,
  lists: () => [...jurisdictionsKeys.all, 'list'] as const,
  list: (params?: ListJurisdictionsParams) =>
    [...jurisdictionsKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...jurisdictionsKeys.all, 'detail', id] as const,
}
