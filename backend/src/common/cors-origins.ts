/**
 * Dev-friendly CORS origins: FRONTEND_URL plus the localhost ↔ 127.0.0.1 twin.
 * Browsers treat these as different origins, but Socket.IO CORS must echo the
 * request Origin exactly when credentials are enabled.
 */
const ADDITIONAL_CORS_ORIGINS = ['http://187.127.233.163:5173'];

export function resolveCorsOrigins(frontendUrl: string): string[] {
  const origins = new Set<string>([frontendUrl, ...ADDITIONAL_CORS_ORIGINS]);

  if (process.env.NODE_ENV === 'production') {
    return [...origins];
  }

  try {
    const url = new URL(frontendUrl);
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');

    if (url.hostname === 'localhost') {
      origins.add(`${url.protocol}//127.0.0.1:${port}`);
    } else if (url.hostname === '127.0.0.1') {
      origins.add(`${url.protocol}//localhost:${port}`);
    }
  } catch {
    // ignore malformed FRONTEND_URL
  }

  return [...origins];
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowed: string[],
): boolean {
  if (!origin) return true;
  return allowed.includes(origin);
}
