import { apiClient } from '@/lib/api-client'

export type SearchResultType =
  | 'client'
  | 'matter'
  | 'correspondence'
  | 'document'
  | 'unlinked_email'

export type SearchHit = {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  snippet?: string
  href: string
  rank: number
}

export type SearchResponse = {
  query: string
  results: SearchHit[]
}

export const searchApi = {
  query: (q: string) =>
    apiClient.get<SearchResponse>('/search', { q }),
}
