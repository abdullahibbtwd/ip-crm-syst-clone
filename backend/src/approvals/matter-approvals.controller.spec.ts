import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { MatterApprovalsController } from './matter-approvals.controller';
import type { ApprovalsService } from './approvals.service';

describe('MatterApprovalsController', () => {
  const approvals = {
    listForMatter: jest.fn(),
    create: jest.fn(),
    assertOnMatter: jest.fn(),
    update: jest.fn(),
    submit: jest.fn(),
  };
  const portalAccess = { assertMatterAccess: jest.fn() };

  const controller = new MatterApprovalsController(
    approvals as unknown as ApprovalsService,
    portalAccess as unknown as PortalAccessService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    portalAccess.assertMatterAccess.mockResolvedValue(undefined);
    approvals.assertOnMatter.mockResolvedValue(undefined);
  });

  it('list asserts access and forwards matterId', async () => {
    await controller.list('m1', req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(approvals.listForMatter).toHaveBeenCalledWith('m1');
  });

  it('create asserts access and forwards matterId, dto, and userId', async () => {
    const dto = { title: 'Sign off' };
    await controller.create('m1', dto as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(approvals.create).toHaveBeenCalledWith('m1', dto, 'u1');
  });

  it('update asserts access and forwards id and dto', async () => {
    const dto = { title: 'Updated' };
    await controller.update('m1', 'a1', dto as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(approvals.assertOnMatter).toHaveBeenCalledWith('a1', 'm1');
    expect(approvals.update).toHaveBeenCalledWith('a1', dto);
  });

  it('submit asserts access and forwards id and userId', async () => {
    await controller.submit('m1', 'a1', req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(approvals.assertOnMatter).toHaveBeenCalledWith('a1', 'm1');
    expect(approvals.submit).toHaveBeenCalledWith('a1', 'u1');
  });
});
