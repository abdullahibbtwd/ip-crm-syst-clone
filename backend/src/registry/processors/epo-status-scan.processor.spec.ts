import type { Job } from 'bullmq';
import type { EpoStatusService } from '../epo-status.service';
import { EPO_STATUS_SCAN_JOB } from '../registry.constants';
import { EpoStatusScanProcessor } from './epo-status-scan.processor';

describe('EpoStatusScanProcessor', () => {
  const status = { scanAllActiveEpRights: jest.fn() };
  const processor = new EpoStatusScanProcessor(
    status as unknown as EpoStatusService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other' } as Job);
    expect(status.scanAllActiveEpRights).not.toHaveBeenCalled();
  });

  it('delegates to EpoStatusService.scanAllActiveEpRights', async () => {
    status.scanAllActiveEpRights.mockResolvedValue({
      rightsScanned: 4,
      correspondenceCreated: 2,
      errors: 1,
    });

    await expect(
      processor.process({ name: EPO_STATUS_SCAN_JOB } as Job),
    ).resolves.toEqual({
      rightsScanned: 4,
      correspondenceCreated: 2,
      errors: 1,
    });
  });
});
