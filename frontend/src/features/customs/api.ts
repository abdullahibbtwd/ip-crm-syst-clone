import { api } from '@/lib/api'
import type {
  CreateCustodyLogInput,
  CreateCustomsApplicationInput,
  CreateCustomsSeizureInput,
  CustodyLogEntry,
  CustomsApplication,
  CustomsSeizure,
  CustomsSeizureDetail,
  UpdateCustomsApplicationInput,
  UpdateCustomsSeizureInput,
} from './types'

export const customsApi = {
  listSeizures: (matterId: string) =>
    api.get<CustomsSeizure[]>(`/matters/${matterId}/customs/seizures`).then((r) => r.data),

  getSeizure: (id: string) =>
    api.get<CustomsSeizureDetail>(`/customs/seizures/${id}`).then((r) => r.data),

  createSeizure: (matterId: string, data: CreateCustomsSeizureInput) =>
    api
      .post<CustomsSeizure>(`/matters/${matterId}/customs/seizures`, data)
      .then((r) => r.data),

  updateSeizure: (id: string, data: UpdateCustomsSeizureInput) =>
    api.patch<CustomsSeizure>(`/customs/seizures/${id}`, data).then((r) => r.data),

  addCustody: (seizureId: string, data: CreateCustodyLogInput) =>
    api
      .post<CustodyLogEntry>(`/customs/seizures/${seizureId}/custody`, data)
      .then((r) => r.data),

  listApplications: (matterId: string) =>
    api
      .get<CustomsApplication[]>(`/matters/${matterId}/customs/applications`)
      .then((r) => r.data),

  createApplication: (matterId: string, data: CreateCustomsApplicationInput) =>
    api
      .post<CustomsApplication>(`/matters/${matterId}/customs/applications`, data)
      .then((r) => r.data),

  updateApplication: (id: string, data: UpdateCustomsApplicationInput) =>
    api.patch<CustomsApplication>(`/customs/applications/${id}`, data).then((r) => r.data),
}
