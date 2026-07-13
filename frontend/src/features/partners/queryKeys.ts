import type { ListPartnerInstructionsParams, ListPartnersParams } from './types'

export const partnersKeys = {
  all: ['partners'] as const,
  lists: () => [...partnersKeys.all, 'list'] as const,
  list: (params?: ListPartnersParams) =>
    [...partnersKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...partnersKeys.all, 'detail', id] as const,
}

export const partnerInstructionsKeys = {
  all: ['partner-instructions'] as const,
  matter: (matterId: string, params?: ListPartnerInstructionsParams) =>
    [...partnerInstructionsKeys.all, 'matter', matterId, params ?? {}] as const,
}
