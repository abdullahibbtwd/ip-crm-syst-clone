import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { watchApi } from '../api'
import { watchKeys } from '../queryKeys'
import type {
  CreateMockWatchAlertInput,
  CreateWatchProfileInput,
  WatchAlertFilters,
  WatchProfileStatus,
} from '../types'

export function useWatchProfiles(clientId: string) {
  return useQuery({
    queryKey: watchKeys.profiles(clientId),
    queryFn: () => watchApi.listProfiles(clientId),
    enabled: Boolean(clientId),
  })
}

export function useCreateWatchProfile(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWatchProfileInput) => watchApi.createProfile(clientId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watchKeys.profiles(clientId) })
      void qc.invalidateQueries({ queryKey: watchKeys.alerts() })
    },
  })
}

export function useUpdateWatchProfileStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WatchProfileStatus }) =>
      watchApi.updateProfileStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watchKeys.all })
    },
  })
}

export function useWatchAlerts(filters?: WatchAlertFilters) {
  return useQuery({
    queryKey: watchKeys.alertList(filters ?? {}),
    queryFn: () => watchApi.listAlerts(filters),
  })
}

export function useWatchNewCount() {
  return useQuery({
    queryKey: watchKeys.alertList({ status: 'new', limit: 1 }),
    queryFn: () => watchApi.listAlerts({ status: 'new', limit: 1 }),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })
}

export function useWatchAlert(id: string) {
  return useQuery({
    queryKey: watchKeys.alert(id),
    queryFn: () => watchApi.getAlert(id),
    enabled: Boolean(id),
  })
}

export function useCreateMockWatchAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMockWatchAlertInput) => watchApi.createMockAlert(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: watchKeys.alerts() })
    },
  })
}

export function useRejectWatchAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => watchApi.rejectAlert(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: watchKeys.alerts() })
      void qc.invalidateQueries({ queryKey: watchKeys.alert(id) })
    },
  })
}

export function useAcceptWatchAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => watchApi.acceptAlert(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: watchKeys.alerts() })
      void qc.invalidateQueries({ queryKey: watchKeys.alert(id) })
    },
  })
}
