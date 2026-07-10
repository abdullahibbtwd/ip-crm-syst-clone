import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type InviteUserInput, type UpdateUserRoleInput } from '../api'
import { userKeys } from '../queryKeys'

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteUserInput) => usersApi.invite(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateUserRoleInput & { id: string }) =>
      usersApi.updateRole(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
