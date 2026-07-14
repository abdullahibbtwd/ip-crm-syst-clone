import { api } from '@/lib/api'
import type {
  CreatePrecedentInput,
  HarvestPrecedentInput,
  ListPrecedentsParams,
  Precedent,
  PrecedentDetail,
  UpdatePrecedentInput,
} from './types'

export const precedentsApi = {
  list: (params?: ListPrecedentsParams) =>
    api.get<Precedent[]>('/precedents', { params }).then((r) => r.data),

  get: (id: string) => api.get<PrecedentDetail>(`/precedents/${id}`).then((r) => r.data),

  create: (data: CreatePrecedentInput) =>
    api.post<Precedent>('/precedents', data).then((r) => r.data),

  update: (id: string, data: UpdatePrecedentInput) =>
    api.patch<Precedent>(`/precedents/${id}`, data).then((r) => r.data),

  publish: (id: string) =>
    api.post<Precedent>(`/precedents/${id}/publish`).then((r) => r.data),

  archive: (id: string) =>
    api.post<Precedent>(`/precedents/${id}/archive`).then((r) => r.data),

  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/precedents/${id}`).then((r) => r.data),

  fromCorrespondence: (correspondenceId: string, data: HarvestPrecedentInput) =>
    api
      .post<Precedent>(`/precedents/from-correspondence/${correspondenceId}`, data)
      .then((r) => r.data),
}
