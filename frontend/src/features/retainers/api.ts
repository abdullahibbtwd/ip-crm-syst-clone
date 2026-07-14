import { api } from '@/lib/api'
import type {
  ApplyRetainerInput,
  ClientRetainer,
  CreateRetainerAdjustmentInput,
  CreateRetainerDepositInput,
  PortalRetainer,
} from './types'

export const retainersApi = {
  getByClient: (clientId: string) =>
    api.get<ClientRetainer>(`/clients/${clientId}/retainer`).then((r) => r.data),

  deposit: (clientId: string, data: CreateRetainerDepositInput) =>
    api.post<ClientRetainer>(`/clients/${clientId}/retainer/deposits`, data).then((r) => r.data),

  adjust: (clientId: string, data: CreateRetainerAdjustmentInput) =>
    api
      .post<ClientRetainer>(`/clients/${clientId}/retainer/adjustments`, data)
      .then((r) => r.data),

  applyToInvoice: (invoiceId: string, data: ApplyRetainerInput) =>
    api.post<ClientRetainer>(`/invoices/${invoiceId}/retainer/apply`, data).then((r) => r.data),

  getPortalBalance: () =>
    api.get<PortalRetainer>('/portal/retainer').then((r) => r.data),
}
