import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { EpoStatusSchedulerService } from './epo-status-scheduler.service';
import { EPO_STATUS_SCAN_JOB } from './registry.constants';

describe('EpoStatusSchedulerService', () => {
  let scanQueue: { add: jest.Mock };
  let config: { get: jest.Mock };
  let service: EpoStatusSchedulerService;

  beforeEach(() => {
    scanQueue = { add: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new EpoStatusSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
  });

  it('does nothing when disabled', async () => {
    await service.onModuleInit();
    expect(scanQueue.add).not.toHaveBeenCalled();
  });

  it('schedules repeat job when enabled', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_STATUS_SCAN_ENABLED') return 'true';
      if (key === 'EPO_STATUS_SCAN_CRON') return '0 2 * * *';
      return undefined;
    });

    await service.onModuleInit();

    expect(scanQueue.add).toHaveBeenCalledWith(
      EPO_STATUS_SCAN_JOB,
      {},
      expect.objectContaining({
        repeat: { pattern: '0 2 * * *' },
        jobId: 'epo-status-nightly-scan',
      }),
    );
  });

  it('queues startup scan when configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_STATUS_SCAN_ENABLED') return 'true';
      if (key === 'EPO_STATUS_SCAN_ON_STARTUP') return 'true';
      return undefined;
    });

    await service.onModuleInit();
    expect(scanQueue.add).toHaveBeenCalledTimes(2);
  });
});
