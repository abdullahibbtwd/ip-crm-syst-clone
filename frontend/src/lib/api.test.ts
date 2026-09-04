import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { resetAuthRefreshForTests } from './authRefresh'

const originalAdapter = api.defaults.adapter

function unauthorized(config: InternalAxiosRequestConfig) {
  const error = new AxiosError('Unauthorized')
  error.config = config
  error.response = {
    status: 401,
    statusText: 'Unauthorized',
    data: { message: 'Unauthorized' },
    headers: {},
    config,
  }
  return Promise.reject(error)
}

function ok(config: InternalAxiosRequestConfig, data: unknown = { ok: true }) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
}

describe('api 401 interceptor', () => {
  beforeEach(() => {
    resetAuthRefreshForTests()
  })

  afterEach(() => {
    resetAuthRefreshForTests()
    api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('retries a request once after a shared refresh and does not loop', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 201 })
    let hits = 0

    api.defaults.adapter = (async (config) => {
      hits += 1
      if ((config._authRetryCount ?? 0) >= 1) return ok(config)
      return unauthorized(config)
    }) as AxiosAdapter

    await expect(api.get('/notifications')).resolves.toMatchObject({ data: { ok: true } })
    expect(post).toHaveBeenCalledTimes(1)
    expect(hits).toBe(2)
  })

  it('caps retries if the retried request still 401s', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 201 })
    let hits = 0

    api.defaults.adapter = (async (config) => {
      hits += 1
      return unauthorized(config)
    }) as AxiosAdapter

    await expect(api.get('/unread-count')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(post).toHaveBeenCalledTimes(1)
    expect(hits).toBe(2)
  })

  it('does not retry the original request when refresh fails, and latches later 401s', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new Error('revoked'))
    let hits = 0

    api.defaults.adapter = (async (config) => {
      hits += 1
      return unauthorized(config)
    }) as AxiosAdapter

    await expect(api.get('/today-count')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(post).toHaveBeenCalledTimes(1)
    expect(hits).toBe(1)

    await expect(api.get('/today-count')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(post).toHaveBeenCalledTimes(1)
    expect(hits).toBe(2)
  })

  it('collapses concurrent 401s onto one refresh call', async () => {
    let resolvePost: (value: unknown) => void = () => undefined
    const post = vi.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve
        }),
    )

    api.defaults.adapter = (async (config) => {
      if ((config._authRetryCount ?? 0) >= 1) return ok(config, { id: config.url })
      return unauthorized(config)
    }) as AxiosAdapter

    const first = api.get('/notifications')
    const second = api.get('/unread-count')
    const third = api.get('/shelf-counts')

    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    resolvePost({ status: 201 })

    await expect(Promise.all([first, second, third])).resolves.toHaveLength(3)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('does not refresh login or refresh endpoints', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 201 })

    api.defaults.adapter = (async (config) => unauthorized(config)) as AxiosAdapter

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    })
    await expect(api.post('/auth/refresh', {})).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(post).not.toHaveBeenCalled()
  })
})
