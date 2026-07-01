import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login')
    ) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      await axios.post('/api/auth/refresh', {}, { withCredentials: true })
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  },
)
