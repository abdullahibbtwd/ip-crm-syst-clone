import type { Job } from 'bullmq';
import { RETENTION_SCAN_JOB } from '../retention.constants';
import { RetentionScanProcessor } from './retention-scan.processor';
import type { RetentionService } from '../retention.service';

describe('RetentionScanProcessor', () => {
  const retention = { runAllRules: jest.fn() };
  const processor = new RetentionScanProcessor(
    retention as unknown as RetentionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other' } as Job);
    expect(retention.runAllRules).not.toHaveBeenCalled();
  });

  it('delegates to retention.runAllRules', async () => {
    retention.runAllRules.mockResolvedValue({
      recordsAffected: 3,
      rulesProcessed: 2,
    });
    await expect(
      processor.process({ name: RETENTION_SCAN_JOB } as Job),
    ).resolves.toEqual({ recordsAffected: 3, rulesProcessed: 2 });
  });
});
