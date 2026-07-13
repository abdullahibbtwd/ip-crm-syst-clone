import { api } from './api'

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<T>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown) =>
    api.post<T>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown) =>
    api.put<T>(url, data).then((r) => r.data),

  patch: <T>(url: string, data?: unknown) =>
    api.patch<T>(url, data).then((r) => r.data),

  delete: <T>(url: string) => api.delete<T>(url).then((r) => r.data),
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string | string[] } } }).response
    const message = res?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
  }
  return fallback
}
