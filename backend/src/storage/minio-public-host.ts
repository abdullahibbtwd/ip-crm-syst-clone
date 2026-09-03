/** Hosts that browsers cannot use to fetch MinIO objects. */
export function isLoopbackOrDockerMinioHost(host: string | undefined): boolean {
  if (!host?.trim()) return true
  const normalized = host.trim().toLowerCase()
  return (
    normalized === 'minio' ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1'
  )
}

export function isSafePublicHost(host: string): boolean {
  const value = host.trim()
  if (!value || value.length > 253) return false
  if (value.toLowerCase() === 'minio') return false
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split('.').every((part) => {
      const n = Number(part)
      return Number.isInteger(n) && n >= 0 && n <= 255
    })
  }
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
    value,
  )
}

/**
 * Prefer the hostname the browser is actually using when the configured
 * public endpoint is Docker-internal or loopback (so LAN / IP access works).
 */
export function resolveMinioPublicHost(
  configured: string | undefined,
  requested: string | undefined,
): string {
  const conf = configured?.trim() || undefined
  const req = requested?.trim()
  const requestOk = Boolean(req && isSafePublicHost(req))

  if (requestOk && isLoopbackOrDockerMinioHost(conf)) {
    return req!
  }
  if (conf && !isLoopbackOrDockerMinioHost(conf)) {
    return conf
  }
  if (requestOk) return req!
  if (conf && conf.toLowerCase() !== 'minio') return conf
  return 'localhost'
}
