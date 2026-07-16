import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  DEADLINE_SCAN_JOB,
} from './notifications.constants';
import { DeadlineSchedulerService } from './deadline-scheduler.service';

describe('DeadlineSchedulerService', () => {
  const scanQueue = { add: jest.fn() };
  let config: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn((key: string) => {
        if (key === 'DEADLINE_SCAN_CRON') return '0 2 * * *';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    };
  });

  it('schedules repeat job and startup scan in non-production', async () => {
    const service = new DeadlineSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();

    expect(scanQueue.add).toHaveBeenCalledWith(
      DEADLINE_SCAN_JOB,
      {},
      expect.objectContaining({
        repeat: { pattern: '0 2 * * *' },
        jobId: 'deadline-nightly-scan',
      }),
    );
    expect(scanQueue.add).toHaveBeenCalledWith(
      DEADLINE_SCAN_JOB,
      {},
      expect.objectContaining({ jobId: expect.stringMatching(/^startup-/) }),
    );
  });

  it('skips startup scan in production unless explicitly enabled', async () => {
    config.get = jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'DEADLINE_SCAN_CRON') return '0 2 * * *';
      return undefined;
    });
    const service = new DeadlineSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
    await service.onModuleInit();
    expect(scanQueue.add).toHaveBeenCalledTimes(1);
  });
});
