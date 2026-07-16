import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { PortalRenewalsController } from './portal-renewals.controller';
import type { RenewalsService } from './renewals.service';

describe('PortalRenewalsController', () => {
  const renewals = {
    listForPortalClient: jest.fn(),
    portalInstructPart: jest.fn(),
    findOneForPortal: jest.fn(),
    portalInstruct: jest.fn(),
  };
  const portalAccess = { requireScopeClientId: jest.fn() };

  const controller = new PortalRenewalsController(
    renewals as unknown as RenewalsService,
    portalAccess as unknown as PortalAccessService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    portalAccess.requireScopeClientId.mockReturnValue('c1');
  });

  it('list forwards clientId', async () => {
    await controller.list(req);
    expect(portalAccess.requireScopeClientId).toHaveBeenCalledWith(user);
    expect(renewals.listForPortalClient).toHaveBeenCalledWith('c1');
  });

  it('instructPart forwards partId, dto, user, and clientId', async () => {
    const dto = { notes: 'go' };
    await controller.instructPart('p1', dto as never, req);
    expect(renewals.portalInstructPart).toHaveBeenCalledWith(
      'p1',
      dto,
      user,
      'c1',
    );
  });

  it('findOne forwards id and clientId', async () => {
    await controller.findOne('r1', req);
    expect(renewals.findOneForPortal).toHaveBeenCalledWith('r1', 'c1');
  });

  it('instruct forwards id, dto, user, and clientId', async () => {
    const dto = { notes: 'go' };
    await controller.instruct('r1', dto as never, req);
    expect(renewals.portalInstruct).toHaveBeenCalledWith('r1', dto, user, 'c1');
  });
});
