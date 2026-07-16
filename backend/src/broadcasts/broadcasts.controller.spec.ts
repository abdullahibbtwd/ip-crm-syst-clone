import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BroadcastsController } from './broadcasts.controller';
import type { BroadcastsService } from './broadcasts.service';

describe('BroadcastsController', () => {
  const broadcasts = {
    listBroadcasts: jest.fn(),
    previewAudience: jest.fn(),
    getBroadcast: jest.fn(),
    createAndEnqueue: jest.fn(),
  };
  const controller = new BroadcastsController(
    broadcasts as unknown as BroadcastsService,
  );
  const req = {
    user: { userId: 'u1' } as AuthenticatedUser,
  } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('forwards list / preview / get / create', async () => {
    await controller.list();
    await controller.preview({
      audience: 'active_clients',
    } as never);
    await controller.get('b1');
    await controller.create(
      { subject: 'Hi', bodyText: 'Body', audience: 'manual' } as never,
      req,
    );

    expect(broadcasts.listBroadcasts).toHaveBeenCalled();
    expect(broadcasts.previewAudience).toHaveBeenCalledWith(
      'active_clients',
      undefined,
    );
    expect(broadcasts.getBroadcast).toHaveBeenCalledWith('b1');
    expect(broadcasts.createAndEnqueue).toHaveBeenCalledWith(
      expect.any(Object),
      'u1',
    );
  });
});
