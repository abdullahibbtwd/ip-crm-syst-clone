import type { Job } from 'bullmq';
import type { RegistryScanService } from '../registry-scan.service';
import { REGISTRY_SCAN_JOB } from '../registry.constants';
import { RegistryScanProcessor } from './registry-scan.processor';

describe('RegistryScanProcessor', () => {
  const scan = { scanEpoWatchProfiles: jest.fn() };
  const processor = new RegistryScanProcessor(
    scan as unknown as RegistryScanService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other' } as Job);
    expect(scan.scanEpoWatchProfiles).not.toHaveBeenCalled();
  });

  it('delegates to RegistryScanService.scanEpoWatchProfiles', async () => {
    scan.scanEpoWatchProfiles.mockResolvedValue({
      success: true,
      profilesScanned: 3,
      alertsCreated: 1,
      errors: 0,
    });

    await expect(
      processor.process({ name: REGISTRY_SCAN_JOB } as Job),
    ).resolves.toEqual({
      success: true,
      profilesScanned: 3,
      alertsCreated: 1,
      errors: 0,
    });
  });
});
