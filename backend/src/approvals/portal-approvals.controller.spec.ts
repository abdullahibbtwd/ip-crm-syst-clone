import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { PortalApprovalsController } from './portal-approvals.controller';
import type { ApprovalsService } from './approvals.service';

describe('PortalApprovalsController', () => {
  const approvals = {
    listForPortalClient: jest.fn(),
    decide: jest.fn(),
  };
  const portalAccess = { requireScopeClientId: jest.fn() };

  const controller = new PortalApprovalsController(
    approvals as unknown as ApprovalsService,
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
    expect(approvals.listForPortalClient).toHaveBeenCalledWith('c1');
  });

  it('decide forwards id, clientId, userId, and dto', async () => {
    const dto = { decision: 'approved' };
    await controller.decide('a1', dto as never, req);
    expect(approvals.decide).toHaveBeenCalledWith('a1', 'c1', 'u1', dto);
  });
});
