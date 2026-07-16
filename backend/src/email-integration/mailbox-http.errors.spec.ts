import {
  assertMailboxOk,
  parseRetryAfterMs,
} from './mailbox-http.errors';

describe('mailbox-http.errors', () => {
  describe('parseRetryAfterMs', () => {
    it('parses integer seconds', () => {
      expect(parseRetryAfterMs('2')).toBe(2000);
    });

    it('returns undefined for missing/invalid', () => {
      expect(parseRetryAfterMs(null)).toBeUndefined();
      expect(parseRetryAfterMs('nope')).toBeUndefined();
    });
  });

  describe('assertMailboxOk', () => {
    it('returns on ok responses', async () => {
      await expect(
        assertMailboxOk({ ok: true } as Response, 'google', 'send'),
      ).resolves.toBeUndefined();
    });

    it('throws MailboxRateLimitError on 429', async () => {
      const res = {
        ok: false,
        status: 429,
        text: async () => 'slow',
        headers: { get: () => '1' },
      } as unknown as Response;

      await expect(assertMailboxOk(res, 'google', 'send')).rejects.toMatchObject({
        name: 'MailboxRateLimitError',
        status: 429,
        retryAfterMs: 1000,
      });
    });

    it('throws MailboxAuthError on 401', async () => {
      const res = {
        ok: false,
        status: 401,
        text: async () => 'revoked',
        headers: { get: () => null },
      } as unknown as Response;

      await expect(assertMailboxOk(res, 'microsoft', 'send')).rejects.toMatchObject({
        name: 'MailboxAuthError',
      });
    });
  });
});
