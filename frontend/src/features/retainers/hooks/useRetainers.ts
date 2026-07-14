import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoiceKeys } from '@/features/invoices/queryKeys'
import { retainersApi } from '../api'
import { retainerKeys } from '../queryKeys'
import type {
  ApplyRetainerInput,
  CreateRetainerAdjustmentInput,
  CreateRetainerDepositInput,
} from '../types'

export function useClientRetainer(clientId: string) {
  return useQuery({
    queryKey: retainerKeys.client(clientId),
    queryFn: () => retainersApi.getByClient(clientId),
    enabled: Boolean(clientId),
  })
}

export function usePortalRetainer() {
  return useQuery({
    queryKey: retainerKeys.portal(),
    queryFn: () => retainersApi.getPortalBalance(),
  })
}

export function useRetainerDeposit(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRetainerDepositInput) => retainersApi.deposit(clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: retainerKeys.client(clientId) })
      qc.invalidateQueries({ queryKey: retainerKeys.portal() })
    },
  })
}

export function useApplyRetainerToInvoice(clientId: string, matterId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: ApplyRetainerInput }) =>
      retainersApi.applyToInvoice(invoiceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: retainerKeys.client(clientId) })
      qc.invalidateQueries({ queryKey: retainerKeys.portal() })
      qc.invalidateQueries({ queryKey: invoiceKeys.all })
      if (matterId) {
        qc.invalidateQueries({ queryKey: invoiceKeys.matter(matterId) })
      }
    },
  })
}

export function useRetainerAdjustment(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRetainerAdjustmentInput) => retainersApi.adjust(clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: retainerKeys.client(clientId) })
      qc.invalidateQueries({ queryKey: retainerKeys.portal() })
    },
  })
}
