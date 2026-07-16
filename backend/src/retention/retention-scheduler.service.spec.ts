import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { RETENTION_SCAN_JOB } from './retention.constants';
import { RetentionSchedulerService } from './retention-scheduler.service';

describe('RetentionSchedulerService', () => {
  const scanQueue = { add: jest.fn() };
  let config: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn((key: string) => {
        if (key === 'RETENTION_SCAN_CRON') return '0 3 * * *';
        return undefined;
      }),
    };
  });

  it('schedules nightly retention scan', async () => {
    const service = new RetentionSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();

    expect(scanQueue.add).toHaveBeenCalledWith(
      RETENTION_SCAN_JOB,
      {},
      expect.objectContaining({
        repeat: { pattern: '0 3 * * *' },
        jobId: 'retention-nightly-scan',
      }),
    );
  });

  it('queues startup scan when enabled', async () => {
    config.get = jest.fn((key: string) => {
      if (key === 'RETENTION_SCAN_ON_STARTUP') return 'true';
      if (key === 'RETENTION_SCAN_CRON') return '0 3 * * *';
      return undefined;
    });
    const service = new RetentionSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();
    expect(scanQueue.add).toHaveBeenCalledTimes(2);
  });
});
