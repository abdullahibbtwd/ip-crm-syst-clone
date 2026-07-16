import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import { OUTBOUND_EMAIL_JOB } from '../email-integration.constants';
import {
  MailboxAuthError,
  MailboxRateLimitError,
} from '../mailbox-http.errors';
import type { OutboundEmailService } from '../outbound-email.service';
import { OutboundEmailProcessor } from './outbound-email.processor';

describe('OutboundEmailProcessor', () => {
  const outbound = { processSend: jest.fn() };
  const processor = new OutboundEmailProcessor(
    outbound as unknown as OutboundEmailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other', data: {} } as Job);
    expect(outbound.processSend).not.toHaveBeenCalled();
  });

  it('returns the outbound send result', async () => {
    outbound.processSend.mockResolvedValue({
      matterId: 'm1',
      correspondenceId: 'c1',
    });
    await expect(
      processor.process({
        name: OUTBOUND_EMAIL_JOB,
        data: { matterId: 'm1' },
      } as Job),
    ).resolves.toEqual({ matterId: 'm1', correspondenceId: 'c1' });
  });

  it('maps MailboxAuthError to UnrecoverableError', async () => {
    outbound.processSend.mockRejectedValue(
      new MailboxAuthError('google', 'revoked'),
    );
    await expect(
      processor.process({
        name: OUTBOUND_EMAIL_JOB,
        data: {},
      } as Job),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('rethrows rate-limit errors for retry', async () => {
    const err = new MailboxRateLimitError('microsoft', 429, 'slow down', 1000);
    outbound.processSend.mockRejectedValue(err);
    await expect(
      processor.process({
        name: OUTBOUND_EMAIL_JOB,
        data: {},
      } as Job),
    ).rejects.toBe(err);
  });
});
