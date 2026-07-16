import type { Job } from 'bullmq';
import { DEADLINE_SCAN_JOB } from '../notifications.constants';
import { DeadlineScanProcessor } from './deadline-scan.processor';
import type { DeadlineNotificationScanService } from '../deadline-notification-scan.service';

describe('DeadlineScanProcessor', () => {
  const scan = { run: jest.fn() };
  const processor = new DeadlineScanProcessor(
    scan as unknown as DeadlineNotificationScanService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other' } as Job);
    expect(scan.run).not.toHaveBeenCalled();
  });

  it('runs the deadline scan for the scan job', async () => {
    scan.run.mockResolvedValue({ remindersSent: 2, escalated: 1 });
    const result = await processor.process({
      name: DEADLINE_SCAN_JOB,
    } as Job);
    expect(result).toEqual({ remindersSent: 2, escalated: 1 });
  });
});
