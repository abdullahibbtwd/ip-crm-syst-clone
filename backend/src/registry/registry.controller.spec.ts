import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RegistryController } from './registry.controller';
import type { EpoStatusService } from './epo-status.service';
import type { RegistryScanService } from './registry-scan.service';
import type { RegistryService } from './registry.service';

describe('RegistryController', () => {
  const registry = {
    getEpoStatus: jest.fn(),
    testEpoConnection: jest.fn(),
  };
  const scan = { scanEpoForClient: jest.fn() };
  const epoStatus = { checkIpRight: jest.fn() };

  const controller = new RegistryController(
    registry as unknown as RegistryService,
    scan as unknown as RegistryScanService,
    epoStatus as unknown as EpoStatusService,
  );

  const req = {
    user: { userId: 'u1' } as AuthenticatedUser,
  } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('forwards EPO status and test endpoints', async () => {
    await controller.getEpoStatus();
    await controller.testEpo('EP1234567');

    expect(registry.getEpoStatus).toHaveBeenCalled();
    expect(registry.testEpoConnection).toHaveBeenCalledWith('EP1234567');
  });

  it('forwards scan and prosecution check endpoints', async () => {
    await controller.scanEpo('client-1');
    await controller.checkEpoStatus('ip-right-1', req);

    expect(scan.scanEpoForClient).toHaveBeenCalledWith('client-1');
    expect(epoStatus.checkIpRight).toHaveBeenCalledWith('ip-right-1', 'u1');
  });
});
