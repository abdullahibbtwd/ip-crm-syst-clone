import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { holidaysApi } from '../api'
import { holidaysKeys } from '../queryKeys'
import type { CreateHolidayInput, ListHolidaysParams, UpdateHolidayInput } from '../types'

export function useHolidays(params?: ListHolidaysParams) {
  return useQuery({
    queryKey: holidaysKeys.list(params),
    queryFn: () => holidaysApi.list(params),
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHolidayInput) => holidaysApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidaysKeys.lists() }),
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayInput }) =>
      holidaysApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidaysKeys.lists() }),
  })
}

export function useRemoveHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => holidaysApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: holidaysKeys.lists() }),
  })
}
