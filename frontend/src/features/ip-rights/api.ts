import { apiClient } from '@/lib/api-client'
import type { IpRightsFilters, IpRightsListResponse } from './types'

export const ipRightsApi = {
  list: (filters?: IpRightsFilters) =>
    apiClient.get<IpRightsListResponse>('/ip-rights', filters as Record<string, unknown>),
}

