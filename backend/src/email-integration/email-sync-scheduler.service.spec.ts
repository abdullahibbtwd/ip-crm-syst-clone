import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  EMAIL_SYNC_CONNECTION_JOB,
  EMAIL_SYNC_JOB,
  MAILBOX_TOKEN_REFRESH_JOB,
} from './email-integration.constants';
import { EmailSyncSchedulerService } from './email-sync-scheduler.service';

describe('EmailSyncSchedulerService', () => {
  const syncQueue = { add: jest.fn() };
  let config: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'MAILBOX_TOKEN_REFRESH_ENABLED') return 'true';
        if (key === 'EMAIL_SYNC_ENABLED') return 'false';
        if (key === 'MAILBOX_TOKEN_REFRESH_CRON') return '0 * * * *';
        return defaultValue;
      }),
    };
  });

  it('schedules token refresh by default', async () => {
    const service = new EmailSyncSchedulerService(
      syncQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();

    expect(syncQueue.add).toHaveBeenCalledWith(
      MAILBOX_TOKEN_REFRESH_JOB,
      {},
      expect.objectContaining({ jobId: 'mailbox-token-refresh-cron' }),
    );
    expect(syncQueue.add).not.toHaveBeenCalledWith(
      EMAIL_SYNC_JOB,
      expect.anything(),
      expect.anything(),
    );
  });

  it('schedules mailbox sync when enabled', async () => {
    config.get = jest.fn((key: string, defaultValue?: string) => {
      if (key === 'MAILBOX_TOKEN_REFRESH_ENABLED') return 'true';
      if (key === 'EMAIL_SYNC_ENABLED') return 'true';
      if (key === 'EMAIL_SYNC_CRON') return '*/15 * * * *';
      if (key === 'MAILBOX_TOKEN_REFRESH_CRON') return '0 * * * *';
      return defaultValue;
    });
    const service = new EmailSyncSchedulerService(
      syncQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();
    expect(syncQueue.add).toHaveBeenCalledWith(
      EMAIL_SYNC_JOB,
      {},
      expect.objectContaining({ jobId: 'mailbox-sync-cron' }),
    );
  });

  it('enqueueConnectionSync adds per-connection job', async () => {
    const service = new EmailSyncSchedulerService(
      syncQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.enqueueConnectionSync('conn1');
    expect(syncQueue.add).toHaveBeenCalledWith(
      EMAIL_SYNC_CONNECTION_JOB,
      { connectionId: 'conn1' },
      expect.objectContaining({
        jobId: expect.stringMatching(/^sync-connection-conn1-/),
      }),
    );
  });
});
