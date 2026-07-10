/** Thrown when Microsoft/Google rate-limit the mailbox API (HTTP 429 / 503). */
export class MailboxRateLimitError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(provider: string, status: number, detail: string, retryAfterMs?: number) {
    super(`${provider} rate limited (${status}): ${detail}`);
    this.name = 'MailboxRateLimitError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Permanent auth failure — do not retry the BullMQ job. */
export class MailboxAuthError extends Error {
  constructor(provider: string, detail: string) {
    super(`${provider} auth failed: ${detail}`);
    this.name = 'MailboxAuthError';
  }
}

export function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return asInt * 1000;
  }
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return undefined;
}

export async function assertMailboxOk(
  res: Response,
  provider: string,
  action: string,
): Promise<void> {
  if (res.ok) return;

  const detail = (await res.text()).slice(0, 500);

  if (res.status === 429 || res.status === 503) {
    throw new MailboxRateLimitError(
      provider,
      res.status,
      detail || action,
      parseRetryAfterMs(res.headers.get('retry-after')),
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new MailboxAuthError(provider, detail || action);
  }

  throw new Error(`${provider} ${action} failed (${res.status}): ${detail}`);
}
