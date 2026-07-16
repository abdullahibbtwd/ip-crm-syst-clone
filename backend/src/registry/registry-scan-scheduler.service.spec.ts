import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { RegistryScanSchedulerService } from './registry-scan-scheduler.service';
import { REGISTRY_SCAN_JOB } from './registry.constants';

describe('RegistryScanSchedulerService', () => {
  let scanQueue: { add: jest.Mock };
  let config: { get: jest.Mock };
  let service: RegistryScanSchedulerService;

  beforeEach(() => {
    scanQueue = { add: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new RegistryScanSchedulerService(
      scanQueue as unknown as Queue,
      config as unknown as ConfigService,
    );
  });

  it('does nothing when disabled', async () => {
    await service.onModuleInit();
    expect(scanQueue.add).not.toHaveBeenCalled();
  });

  it('schedules repeat job when REGISTRY_SCAN_ENABLED is true', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'REGISTRY_SCAN_ENABLED') return 'true';
      if (key === 'REGISTRY_SCAN_CRON') return '0 5 * * *';
      return undefined;
    });

    await service.onModuleInit();

    expect(scanQueue.add).toHaveBeenCalledWith(
      REGISTRY_SCAN_JOB,
      {},
      expect.objectContaining({
        repeat: { pattern: '0 5 * * *' },
        jobId: 'epo-watch-nightly-scan',
      }),
    );
  });

  it('supports legacy EPO_WATCH_SCAN_ENABLED flag', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'EPO_WATCH_SCAN_ENABLED') return 'true';
      return undefined;
    });

    await service.onModuleInit();
    expect(scanQueue.add).toHaveBeenCalled();
  });
});
