import { apiClient } from '@/lib/api-client'
import type {
  CreateTaskInput,
  Task,
  TaskListResponse,
  TeamMember,
  UpdateTaskInput,
} from './types'

export const tasksApi = {
  listForMatter: (matterId: string) =>
    apiClient.get<Task[]>(`/matters/${matterId}/tasks`),

  listMy: (params?: { limit?: number; cursor?: string }) =>
    apiClient.get<TaskListResponse>('/tasks/my', params as Record<string, unknown>),

  create: (matterId: string, data: CreateTaskInput) =>
    apiClient.post<Task>(`/matters/${matterId}/tasks`, data),

  update: (id: string, data: UpdateTaskInput) =>
    apiClient.patch<Task>(`/tasks/${id}`, data),

  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/tasks/${id}`),

  listTeamMembers: () => apiClient.get<TeamMember[]>('/users/team-members'),
}
