import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { PortalMessagesController } from './portal-messages.controller';
import type { PortalMessagesService } from './portal-messages.service';

describe('PortalMessagesController', () => {
  const messages = {
    listForClient: jest.fn(),
    countUnread: jest.fn(),
    findOneForClient: jest.fn(),
  };
  const portalAccess = { requireScopeClientId: jest.fn() };

  const controller = new PortalMessagesController(
    messages as unknown as PortalMessagesService,
    portalAccess as unknown as PortalAccessService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    messages.countUnread.mockResolvedValue(3);
  });

  it('list forwards clientId', async () => {
    await controller.list(req);
    expect(portalAccess.requireScopeClientId).toHaveBeenCalledWith(user);
    expect(messages.listForClient).toHaveBeenCalledWith('c1');
  });

  it('unreadCount returns count wrapper', async () => {
    await expect(controller.unreadCount(req)).resolves.toEqual({ count: 3 });
    expect(messages.countUnread).toHaveBeenCalledWith('c1');
  });

  it('findBroadcast forwards clientId and broadcast key', async () => {
    await controller.findBroadcast('b1', req);
    expect(messages.findOneForClient).toHaveBeenCalledWith(
      'c1',
      'broadcast:b1',
    );
  });

  it('findCorrespondence forwards clientId and correspondence key', async () => {
    await controller.findCorrespondence('corr1', req);
    expect(messages.findOneForClient).toHaveBeenCalledWith(
      'c1',
      'correspondence:corr1',
    );
  });
});
