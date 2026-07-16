import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import {
  EMAIL_SYNC_CONNECTION_JOB,
  EMAIL_SYNC_JOB,
  MAILBOX_TOKEN_REFRESH_JOB,
} from '../email-integration.constants';
import {
  MailboxAuthError,
  MailboxRateLimitError,
} from '../mailbox-http.errors';
import type { EmailSyncSchedulerService } from '../email-sync-scheduler.service';
import type { EmailSyncService } from '../email-sync.service';
import type { MailboxConnectionsService } from '../mailbox-connections.service';
import { EmailSyncProcessor } from './email-sync.processor';

describe('EmailSyncProcessor', () => {
  const sync = {
    isEnabled: jest.fn(),
    syncConnection: jest.fn(),
  };
  const connections = {
    refreshExpiringTokens: jest.fn(),
    listActiveConnections: jest.fn(),
    markSyncError: jest.fn(),
  };
  const scheduler = { enqueueConnectionSync: jest.fn() };
  const processor = new EmailSyncProcessor(
    sync as unknown as EmailSyncService,
    connections as unknown as MailboxConnectionsService,
    scheduler as unknown as EmailSyncSchedulerService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs mailbox token refresh job', async () => {
    connections.refreshExpiringTokens.mockResolvedValue({
      checked: 2,
      refreshed: 1,
      failed: 0,
    });

    await expect(
      processor.process({ name: MAILBOX_TOKEN_REFRESH_JOB, data: {} } as Job),
    ).resolves.toEqual({ checked: 2, refreshed: 1, failed: 0 });
  });

  it('skips fan-out when sync is disabled', async () => {
    sync.isEnabled.mockReturnValue(false);

    await expect(
      processor.process({ name: EMAIL_SYNC_JOB, data: {} } as Job),
    ).resolves.toEqual({ enqueued: 0 });

    expect(connections.listActiveConnections).not.toHaveBeenCalled();
  });

  it('enqueues per-connection sync jobs when enabled', async () => {
    sync.isEnabled.mockReturnValue(true);
    connections.listActiveConnections.mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ]);
    scheduler.enqueueConnectionSync.mockResolvedValue(undefined);

    await expect(
      processor.process({ name: EMAIL_SYNC_JOB, data: {} } as Job),
    ).resolves.toEqual({ enqueued: 2 });

    expect(scheduler.enqueueConnectionSync).toHaveBeenCalledTimes(2);
  });

  it('syncs a single connection', async () => {
    sync.syncConnection.mockResolvedValue(3);

    await expect(
      processor.process({
        name: EMAIL_SYNC_CONNECTION_JOB,
        data: { connectionId: 'c1' },
      } as Job),
    ).resolves.toEqual({ connectionId: 'c1', ingested: 3 });
  });

  it('returns early when connection job has no id', async () => {
    await expect(
      processor.process({
        name: EMAIL_SYNC_CONNECTION_JOB,
        data: {},
      } as Job),
    ).resolves.toBeUndefined();
    expect(sync.syncConnection).not.toHaveBeenCalled();
  });

  it('maps auth failures to UnrecoverableError and marks sync error', async () => {
    sync.syncConnection.mockRejectedValue(
      new MailboxAuthError('google', 'revoked'),
    );

    await expect(
      processor.process({
        name: EMAIL_SYNC_CONNECTION_JOB,
        data: { connectionId: 'c1' },
      } as Job),
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(connections.markSyncError).toHaveBeenCalledWith('c1', expect.any(String));
  });

  it('rethrows rate-limit errors for retry', async () => {
    const err = new MailboxRateLimitError('microsoft', 429, 'slow down', 1000);
    sync.syncConnection.mockRejectedValue(err);

    await expect(
      processor.process({
        name: EMAIL_SYNC_CONNECTION_JOB,
        data: { connectionId: 'c1' },
        attemptsMade: 1,
      } as Job),
    ).rejects.toBe(err);
  });
});
