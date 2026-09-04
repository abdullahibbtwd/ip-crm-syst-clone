import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAuthRefreshStatus,
  markAuthSessionLive,
  onAuthRefreshFailed,
  onAuthRefreshStatusChange,
  refreshSession,
  resetAuthRefreshForTests,
} from './authRefresh'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

const post = axios.post as unknown as ReturnType<typeof vi.fn>

describe('refreshSession', () => {
  afterEach(() => {
    resetAuthRefreshForTests()
    vi.clearAllMocks()
  })

  it('shares one refresh request across concurrent callers', async () => {
    let resolvePost: (value: unknown) => void = () => undefined
    post.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )

    const first = refreshSession()
    const second = refreshSession()
    const third = refreshSession()

    expect(post).toHaveBeenCalledTimes(1)
    expect(getAuthRefreshStatus()).toBe('refreshing')
    expect(post).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      { withCredentials: true },
    )

    resolvePost({ status: 201 })
    await Promise.all([first, second, third])
    expect(post).toHaveBeenCalledTimes(1)
    expect(getAuthRefreshStatus()).toBe('idle')
  })

  it('allows a later refresh after the first one settles', async () => {
    post.mockResolvedValueOnce({ status: 201 })
    await refreshSession()
    post.mockResolvedValueOnce({ status: 201 })
    await refreshSession()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('notifies listeners when refresh fails and latches so nobody retries', async () => {
    const onFailed = vi.fn()
    const statuses: string[] = []
    onAuthRefreshFailed(onFailed)
    onAuthRefreshStatusChange((next) => statuses.push(next))
    post.mockRejectedValueOnce(new Error('revoked'))

    const first = refreshSession()
    const second = refreshSession()
    await expect(first).rejects.toThrow('revoked')
    await expect(second).rejects.toThrow('revoked')
    expect(onFailed).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(getAuthRefreshStatus()).toBe('invalid')

    await expect(refreshSession()).rejects.toThrow('Session expired')
    expect(post).toHaveBeenCalledTimes(1)
    expect(statuses).toContain('refreshing')
    expect(statuses).toContain('invalid')
  })

  it('can refresh again after a new login marks the session live', async () => {
    post.mockRejectedValueOnce(new Error('revoked'))
    await expect(refreshSession()).rejects.toThrow('revoked')
    expect(getAuthRefreshStatus()).toBe('invalid')

    markAuthSessionLive()
    expect(getAuthRefreshStatus()).toBe('idle')
    post.mockResolvedValueOnce({ status: 201 })
    await refreshSession()
    expect(post).toHaveBeenCalledTimes(2)
  })
})
