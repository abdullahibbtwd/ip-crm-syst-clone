import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { WatchAlertsController } from './watch-alerts.controller';
import { WatchProfilesController } from './watch-profiles.controller';
import type { WatchService } from './watch.service';

describe('Watch controllers', () => {
  const watch = {
    listAlerts: jest.fn(),
    findAlert: jest.fn(),
    createMockAlert: jest.fn(),
    rejectAlert: jest.fn(),
    acceptAlert: jest.fn(),
    listProfilesForClient: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('WatchAlertsController', async () => {
    const c = new WatchAlertsController(watch as unknown as WatchService);
    await c.list({ status: 'new' } as never);
    await c.findOne('a1');
    await c.createMock({ clientId: 'c1' } as never);
    await c.reject('a1', req);
    await c.accept('a1', req);

    expect(watch.listAlerts).toHaveBeenCalledWith({ status: 'new' });
    expect(watch.findAlert).toHaveBeenCalledWith('a1');
    expect(watch.createMockAlert).toHaveBeenCalled();
    expect(watch.rejectAlert).toHaveBeenCalledWith('a1', 'u1');
    expect(watch.acceptAlert).toHaveBeenCalledWith('a1', 'u1');
  });

  it('WatchProfilesController', async () => {
    const profiles = new WatchProfilesController(
      watch as unknown as WatchService,
    );

    await profiles.list('c1');
    await profiles.create(
      'c1',
      { markText: 'ACME', jurisdictions: ['EU'], frequency: 'weekly' } as never,
      req,
    );

    expect(watch.listProfilesForClient).toHaveBeenCalledWith('c1');
    expect(watch.createProfile).toHaveBeenCalledWith(
      'c1',
      expect.any(Object),
      'u1',
    );
  });
});
